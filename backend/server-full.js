const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const admin = require('firebase-admin');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

dotenv.config();

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: `${serviceAccount.project_id}.appspot.com`
});

const db = admin.firestore();
const bucket = admin.storage().bucket();
const auth = admin.auth();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(morgan('combined'));

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

// Authentication middleware
const authenticateUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Check if user is admin (you can set this manually in Firestore)
const isAdmin = async (req, res, next) => {
  try {
    // For now, allow the first user to be admin
    // You can modify this logic based on your needs
    const userRef = db.collection('users').doc(req.user.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      // First user becomes admin
      await userRef.set({
        email: req.user.email,
        isAdmin: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      req.user.isAdmin = true;
    } else {
      req.user.isAdmin = userDoc.data().isAdmin || false;
    }
    
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Require admin for certain routes
const requireAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }
  next();
};

// ==================== API ROUTES ====================

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// Get user profile
app.get('/api/user/profile', authenticateUser, async (req, res) => {
  try {
    const userRef = db.collection('users').doc(req.user.uid);
    const userDoc = await userRef.get();
    
    res.json({
      uid: req.user.uid,
      email: req.user.email,
      profile: userDoc.exists ? userDoc.data() : { isAdmin: false }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all photos (public gallery)
app.get('/api/photos', authenticateUser, async (req, res) => {
  try {
    const { limit = 50, lastId = null } = req.query;
    
    let query = db.collection('photos')
      .orderBy('uploadedAt', 'desc')
      .limit(parseInt(limit));
    
    if (lastId) {
      const lastDoc = await db.collection('photos').doc(lastId).get();
      query = query.startAfter(lastDoc);
    }
    
    const snapshot = await query.get();
    
    const photos = [];
    snapshot.forEach(doc => {
      photos.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json({
      photos,
      lastId: photos.length > 0 ? photos[photos.length - 1].id : null,
      hasMore: photos.length === parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching photos:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get photos by date (for gallery page)
app.get('/api/photos/by-date', authenticateUser, async (req, res) => {
  try {
    const snapshot = await db.collection('photos')
      .orderBy('uploadedAt', 'desc')
      .get();
    
    // Group photos by date
    const photosByDate = {};
    
    snapshot.forEach(doc => {
      const photo = { id: doc.id, ...doc.data() };
      const date = photo.uploadedAt.toDate().toDateString();
      
      if (!photosByDate[date]) {
        photosByDate[date] = [];
      }
      photosByDate[date].push(photo);
    });
    
    res.json(photosByDate);
  } catch (error) {
    console.error('Error fetching photos by date:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Upload photo
app.post('/api/admin/photos', authenticateUser, isAdmin, requireAdmin, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' });
    }
    
    const { title, description } = req.body;
    
    // Create unique filename
    const timestamp = Date.now();
    const fileName = `${timestamp}_${req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const filePath = `photos/${fileName}`;
    
    // Upload to Firebase Storage
    const file = bucket.file(filePath);
    const stream = file.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
        metadata: {
          uploadedBy: req.user.uid,
          uploadedAt: new Date().toISOString()
        }
      }
    });
    
    await new Promise((resolve, reject) => {
      stream.on('error', reject);
      stream.on('finish', resolve);
      stream.end(req.file.buffer);
    });
    
    // Make file publicly accessible
    await file.makePublic();
    
    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    
    // Save photo metadata to Firestore
    const photoRef = await db.collection('photos').add({
      title: title || 'Untitled',
      description: description || '',
      fileName: fileName,
      filePath: filePath,
      url: publicUrl,
      uploadedBy: req.user.uid,
      uploadedByEmail: req.user.email,
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      size: req.file.size,
      contentType: req.file.mimetype
    });
    
    res.status(201).json({
      id: photoRef.id,
      message: 'Photo uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Update photo
app.put('/api/admin/photos/:photoId', authenticateUser, isAdmin, requireAdmin, async (req, res) => {
  try {
    const { photoId } = req.params;
    const { title, description } = req.body;
    
    const photoRef = db.collection('photos').doc(photoId);
    const photoDoc = await photoRef.get();
    
    if (!photoDoc.exists) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    await photoRef.update({
      title: title || photoDoc.data().title,
      description: description || photoDoc.data().description,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ message: 'Photo updated successfully' });
  } catch (error) {
    console.error('Error updating photo:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Delete photo
app.delete('/api/admin/photos/:photoId', authenticateUser, isAdmin, requireAdmin, async (req, res) => {
  try {
    const { photoId } = req.params;
    
    const photoRef = db.collection('photos').doc(photoId);
    const photoDoc = await photoRef.get();
    
    if (!photoDoc.exists) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    const photoData = photoDoc.data();
    
    // Delete from Storage
    try {
      const file = bucket.file(photoData.filePath);
      await file.delete();
    } catch (storageError) {
      console.warn('Storage file may not exist:', storageError);
    }
    
    // Delete from Firestore
    await photoRef.delete();
    
    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Get all photos (with management data)
app.get('/api/admin/photos', authenticateUser, isAdmin, requireAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection('photos')
      .orderBy('uploadedAt', 'desc')
      .get();
    
    const photos = [];
    snapshot.forEach(doc => {
      photos.push({
        id: doc.id,
        ...doc.data(),
        uploadedAt: doc.data().uploadedAt?.toDate()
      });
    });
    
    res.json(photos);
  } catch (error) {
    console.error('Error fetching admin photos:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Backend server running on port ${PORT}`);
});