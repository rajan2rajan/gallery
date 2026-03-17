const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const admin = require('firebase-admin');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: [
    'https://rhea-hj1k.onrender.com',  // ✅ Your actual frontend URL
    'https://mypuku.onrender.com',     // Keep this if needed
    'http://localhost:3000'             // Keep for local development
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add this for preflight requests
app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Firebase Admin
// ==================== FIREBASE INITIALIZATION ====================
let db, bucket, auth;
let firebaseInitialized = false;
let bucketName = '';

try {
  // Check if we have the required environment variables
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    
    console.log('📁 Loading Firebase credentials from environment variables');
    console.log('Project ID:', process.env.FIREBASE_PROJECT_ID);
    console.log('Client Email:', process.env.FIREBASE_CLIENT_EMAIL);
    console.log('Private Key length:', process.env.FIREBASE_PRIVATE_KEY.length);
    
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };
    
    // Try .firebasestorage.app first (new format)
    bucketName = `${serviceAccount.projectId}.firebasestorage.app`;
    
    console.log(`Attempting to use bucket: ${bucketName}`);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: bucketName
    });
    
    db = admin.firestore();
    bucket = admin.storage().bucket();
    auth = admin.auth();
    firebaseInitialized = true;
    
    console.log('✅ Firebase Admin initialized successfully from environment variables');
    console.log(`📦 Using bucket: ${bucketName}`);
    
  } else {
    console.log('⚠️ No Firebase credentials found in environment variables.');
    console.log('Required env vars:', {
      FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
      FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
      FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL
    });
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
  
  // Try alternative bucket name if first attempt failed
  if (error.message.includes('bucket does not exist')) {
    try {
      console.log('\n🔄 Trying alternative bucket name...');
      
      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      };
      
      // Try .appspot.com as alternative
      bucketName = `${serviceAccount.projectId}.appspot.com`;
      
      console.log(`Attempting alternative bucket: ${bucketName}`);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: bucketName
      });
      
      db = admin.firestore();
      bucket = admin.storage().bucket();
      auth = admin.auth();
      firebaseInitialized = true;
      
      console.log('✅ Firebase Admin initialized with alternative bucket');
      console.log(`📦 Using bucket: ${bucketName}`);
      
    } catch (secondError) {
      console.error('❌ Alternative also failed:', secondError.message);
      console.error('Alternative error details:', secondError.stack);
    }
  } else {
    console.error('❌ Firebase initialization failed with non-bucket error:', error.message);
  }
}
// ==================== AUTHENTICATION MIDDLEWARE ====================
const authenticateUser = async (req, res, next) => {
  try {
    // Check if Firebase Auth is initialized
    if (!auth) {
      console.error('❌ Firebase Auth not initialized');
      return res.status(503).json({ 
        error: 'Authentication service unavailable',
        details: 'Firebase not initialized. Check server logs.'
      });
    }

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

// ==================== CHECK IF USER IS ADMIN ====================
const isAdmin = async (req, res, next) => {
  try {
    const userRef = db.collection('users').doc(req.user.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      await userRef.set({
        email: req.user.email,
        isAdmin: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      req.user.isAdmin = true;
    } else {
      req.user.isAdmin = userDoc.data().isAdmin || false;
    }
    
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }
    
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ==================== MULTER CONFIGURATION ====================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for videos
  },
  fileFilter: (req, file, cb) => {
    // Allow both images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images and videos are allowed'));
    }
  }
});

// Separate upload config for homepage photos
const homepageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed for homepage photos'));
    }
  }
});

// ==================== PUBLIC ROUTES ====================
app.get('/', (req, res) => {
  res.json({ 
    message: 'Puku Gallery API',
    status: 'running',
    firebase: firebaseInitialized ? 'connected' : 'not configured',
    bucket: bucketName || 'not set',
    endpoints: {
      test: '/api/test',
      health: '/api/health',
      folders: '/api/folders',
      homepagePhotos: '/api/homepage-photos'
    }
  });
});

app.get('/api/test', (req, res) => {
  res.json({ 
    success: true,
    message: 'Backend is working!',
    firebase: firebaseInitialized ? 'connected' : 'not configured',
    bucket: bucketName || 'not set',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    firebase: firebaseInitialized ? 'connected' : 'not configured',
    timestamp: new Date().toISOString()
  });
});

// ==================== PUBLIC ROUTES (NO AUTH REQUIRED) ====================

// Get all folders - PUBLIC (no login required)
app.get('/api/folders', async (req, res) => {
  try {
    const snapshot = await db.collection('folders')
      .orderBy('createdAt', 'desc')
      .get();
    
    const folders = [];
    snapshot.forEach(doc => {
      folders.push({
        id: doc.id,
        name: doc.data().name,
        description: doc.data().description,
        coverPhoto: doc.data().coverPhoto,
        photoCount: doc.data().photoCount || 0,
        createdAt: doc.data().createdAt?.toDate()
      });
    });
    
    res.json(folders);
    
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single folder with its photos - PUBLIC
app.get('/api/folders/:folderId', async (req, res) => {
  try {
    const { folderId } = req.params;
    
    if (!folderId) {
      return res.status(400).json({ error: 'Folder ID is required' });
    }
    
    // Get folder
    const folderDoc = await db.collection('folders').doc(folderId).get();
    
    if (!folderDoc.exists) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    const folderData = folderDoc.data();
    
    // Try to get photos, but don't fail if photos collection doesn't exist
    let photos = [];
    try {
      const photosSnapshot = await db.collection('photos')
        .where('folderId', '==', folderId)
        .orderBy('uploadedAt', 'desc')
        .get();
      
      photosSnapshot.forEach(doc => {
        photos.push({
          id: doc.id,
          url: doc.data().url,
          title: doc.data().title,
          description: doc.data().description,
          uploadedAt: doc.data().uploadedAt?.toDate()
        });
      });
    } catch (photosError) {
      console.log('Error fetching photos (maybe no index yet):', photosError.message);
      // Return empty photos array if query fails
    }
    
    res.json({
      folder: {
        id: folderDoc.id,
        name: folderData.name,
        description: folderData.description,
        coverPhoto: folderData.coverPhoto,
        photoCount: folderData.photoCount || 0,
        createdAt: folderData.createdAt?.toDate()
      },
      photos: photos
    });
    
  } catch (error) {
    console.error('Error fetching folder:', error);
    res.status(500).json({ 
      error: 'Server error', 
      message: error.message 
    });
  }
});

// Public homepage photos endpoint
app.get('/api/homepage-photos', async (req, res) => {
  try {
    if (!firebaseInitialized) {
      return res.json([]);
    }

    let snapshot;
    try {
      snapshot = await db.collection('homepagePhotos')
        .where('active', '==', true)
        .orderBy('uploadedAt', 'desc')
        .get();
    } catch (collectionError) {
      return res.json([]);
    }
    
    const photos = [];
    snapshot.forEach(doc => {
      photos.push({
        id: doc.id,
        url: doc.data().url,
        title: doc.data().title || 'Homepage Photo',
        uploadedAt: doc.data().uploadedAt?.toDate()
      });
    });
    
    res.json(photos);
    
  } catch (error) {
    console.error('Error in homepage-photos endpoint:', error);
    res.json([]);
  }
});

// ==================== PUBLIC HOMEPAGE PHOTOS ROUTE ====================
app.get('/api/homepage-photos', async (req, res) => {
  try {
    if (!firebaseInitialized) {
      console.log('Firebase not initialized');
      return res.json([]);
    }

    console.log('Fetching homepage photos from Firestore...');
    
    let snapshot;
    try {
      snapshot = await db.collection('homepagePhotos')
        .where('active', '==', true)
        .orderBy('uploadedAt', 'desc')
        .get();
      
      console.log(`Found ${snapshot.size} active homepage photos`);
      
    } catch (collectionError) {
      console.error('Error querying collection:', collectionError.message);
      return res.json([]);
    }
    
    const photos = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.url) {
        photos.push({
          id: doc.id,
          url: data.url,
          title: data.title || 'Homepage Photo',
          uploadedAt: data.uploadedAt?.toDate()
        });
      }
    });
    
    console.log(`Returning ${photos.length} photos to client`);
    res.json(photos);
    
  } catch (error) {
    console.error('Error in homepage-photos endpoint:', error);
    res.json([]);
  }
});

// ==================== FOLDER ROUTES ====================

// Get all folders
app.get('/api/folders', authenticateUser, async (req, res) => {
  try {
    const snapshot = await db.collection('folders')
      .orderBy('createdAt', 'desc')
      .get();
    
    const folders = [];
    snapshot.forEach(doc => {
      folders.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      });
    });
    
    res.json(folders);
    
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single folder with its photos - PUBLIC
app.get('/api/folders/:folderId', async (req, res) => {
  try {
    const { folderId } = req.params;
    
    const folderDoc = await db.collection('folders').doc(folderId).get();
    
    if (!folderDoc.exists) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    const folderData = folderDoc.data();
    
    // Try to get photos with index
    let photos = [];
    try {
      const photosSnapshot = await db.collection('photos')
        .where('folderId', '==', folderId)
        .orderBy('uploadedAt', 'desc')
        .get();
      
      photosSnapshot.forEach(doc => {
        photos.push({
          id: doc.id,
          url: doc.data().url,
          title: doc.data().title,
          description: doc.data().description,
          uploadedAt: doc.data().uploadedAt?.toDate()
        });
      });
      
    } catch (indexError) {
      // If index doesn't exist yet, fall back to client-side filtering
      console.log('Index not ready, falling back to client-side filtering');
      
      // Get all photos and filter client-side
      const allPhotosSnapshot = await db.collection('photos').get();
      
      allPhotosSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.folderId === folderId) {
          photos.push({
            id: doc.id,
            url: data.url,
            title: data.title,
            description: data.description,
            uploadedAt: data.uploadedAt?.toDate()
          });
        }
      });
      
      // Sort by uploadedAt descending
      photos.sort((a, b) => {
        const dateA = a.uploadedAt?.getTime() || 0;
        const dateB = b.uploadedAt?.getTime() || 0;
        return dateB - dateA;
      });
    }
    
    res.json({
      folder: {
        id: folderDoc.id,
        name: folderData.name,
        description: folderData.description,
        coverPhoto: folderData.coverPhoto,
        photoCount: folderData.photoCount || 0
      },
      photos: photos
    });
    
  } catch (error) {
    console.error('Error fetching folder:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// ==================== ADMIN FOLDER ROUTES ====================

// Create a new folder
app.post('/api/admin/folders', authenticateUser, isAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Folder name is required' });
    }
    
    // Check if folder with same name already exists
    const existingFolders = await db.collection('folders')
      .where('name', '==', name)
      .where('createdBy', '==', req.user.uid)
      .get();
    
    if (!existingFolders.empty) {
      return res.status(400).json({ error: 'Folder with this name already exists' });
    }
    
    const folderData = {
      name: name,
      description: description || '',
      createdBy: req.user.uid,
      createdByEmail: req.user.email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      photoCount: 0,
      coverPhoto: null
    };
    
    const folderRef = await db.collection('folders').add(folderData);
    
    res.status(201).json({
      id: folderRef.id,
      ...folderData,
      message: 'Folder created successfully'
    });
    
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Update folder
app.put('/api/admin/folders/:folderId', authenticateUser, isAdmin, async (req, res) => {
  try {
    const { folderId } = req.params;
    const { name, description } = req.body;
    
    const folderRef = db.collection('folders').doc(folderId);
    const folderDoc = await folderRef.get();
    
    if (!folderDoc.exists) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    
    await folderRef.update(updateData);
    
    res.json({ message: 'Folder updated successfully' });
    
  } catch (error) {
    console.error('Error updating folder:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete folder
app.delete('/api/admin/folders/:folderId', authenticateUser, isAdmin, async (req, res) => {
  try {
    const { folderId } = req.params;
    
    const folderRef = db.collection('folders').doc(folderId);
    const folderDoc = await folderRef.get();
    
    if (!folderDoc.exists) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    // Get all photos in this folder
    const photosSnapshot = await db.collection('photos')
      .where('folderId', '==', folderId)
      .get();
    
    // Delete photos from storage and firestore
    const batch = db.batch();
    
    for (const photoDoc of photosSnapshot.docs) {
      const photoData = photoDoc.data();
      
      // Delete from storage
      try {
        const file = bucket.file(photoData.filePath);
        await file.delete();
      } catch (storageError) {
        console.warn('Storage file may not exist:', storageError);
      }
      
      // Delete from firestore
      batch.delete(photoDoc.ref);
    }
    
    // Delete the folder
    batch.delete(folderRef);
    
    await batch.commit();
    
    res.json({ message: 'Folder and all its photos deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update folder cover photo
app.post('/api/admin/folders/:folderId/cover', authenticateUser, isAdmin, async (req, res) => {
  try {
    const { folderId } = req.params;
    const { photoId } = req.body;
    
    const folderRef = db.collection('folders').doc(folderId);
    const folderDoc = await folderRef.get();
    
    if (!folderDoc.exists) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    const photoDoc = await db.collection('photos').doc(photoId).get();
    
    if (!photoDoc.exists) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    await folderRef.update({
      coverPhoto: photoDoc.data().url,
      coverPhotoId: photoId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ message: 'Cover photo updated successfully' });
    
  } catch (error) {
    console.error('Error updating cover photo:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== ADMIN PHOTO ROUTES ====================

// Admin: Upload multiple photos (with folder support)
app.post('/api/admin/photos/bulk', authenticateUser, isAdmin, upload.array('photos', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No photos uploaded' });
    }
    
    const { folderId } = req.body;
    
    if (!folderId) {
      return res.status(400).json({ error: 'Please select a folder' });
    }
    
    // Verify folder exists
    const folderDoc = await db.collection('folders').doc(folderId).get();
    if (!folderDoc.exists) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    const folderName = folderDoc.data().name;
    
    console.log(`📤 Uploading ${req.files.length} files to folder: ${folderName}`);
    
    const uploadedPhotos = [];
    const failedUploads = [];
    
    for (const file of req.files) {
      try {
        // Determine file type for folder structure
        const fileType = file.mimetype.startsWith('image/') ? 'images' : 'videos';
        
        // Create unique filename
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        const safeFileName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        const fileName = `${timestamp}_${random}_${safeFileName}`;
        const filePath = `folders/${folderName}/${fileName}`;
        
        console.log(`Saving to: ${filePath}`);
        
        // Upload to Firebase Storage
        const bucketFile = bucket.file(filePath);
        
        await bucketFile.save(file.buffer, {
          metadata: {
            contentType: file.mimetype,
            metadata: {
              uploadedBy: req.user.uid,
              uploadedByEmail: req.user.email,
              uploadedAt: new Date().toISOString(),
              folderId: folderId,
              folderName: folderName
            }
          }
        });
        
        // Make file publicly accessible
        await bucketFile.makePublic();
        
        // Get public URL
        const publicUrl = `https://storage.googleapis.com/${bucketName}/${filePath}`;
        
        // Save photo metadata to Firestore
        const photoData = {
          title: req.body.title || file.originalname,
          description: req.body.description || '',
          fileName: fileName,
          filePath: filePath,
          url: publicUrl,
          uploadedBy: req.user.uid,
          uploadedByEmail: req.user.email,
          uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
          size: file.size,
          contentType: file.mimetype,
          fileType: fileType,
          folderId: folderId,
          folderName: folderName,
          originalName: file.originalname
        };
        
        const photoRef = await db.collection('photos').add(photoData);
        
        uploadedPhotos.push({
          id: photoRef.id,
          fileName: fileName,
          url: publicUrl,
          fileType: fileType,
          folderId: folderId,
          folderName: folderName
        });
        
        console.log(`✅ Uploaded: ${fileName}`);
        
      } catch (fileError) {
        console.error(`❌ Error uploading ${file.originalname}:`, fileError);
        failedUploads.push({
          fileName: file.originalname,
          error: fileError.message
        });
      }
    }
    
    // Update folder photo count
    if (uploadedPhotos.length > 0) {
      const folderRef = db.collection('folders').doc(folderId);
      await folderRef.update({
        photoCount: admin.firestore.FieldValue.increment(uploadedPhotos.length),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Set cover photo if folder doesn't have one
      const folderData = folderDoc.data();
      if (!folderData.coverPhoto && uploadedPhotos.length > 0) {
        await folderRef.update({
          coverPhoto: uploadedPhotos[0].url,
          coverPhotoId: uploadedPhotos[0].id
        });
      }
    }
    
    const response = {
      message: `Successfully uploaded ${uploadedPhotos.length} out of ${req.files.length} files to folder "${folderName}"`,
      uploaded: uploadedPhotos.length,
      total: req.files.length,
      folderId: folderId,
      folderName: folderName,
      photos: uploadedPhotos
    };
    
    if (failedUploads.length > 0) {
      response.failed = failedUploads;
      response.failedCount = failedUploads.length;
    }
    
    console.log(`📊 Upload complete: ${uploadedPhotos.length} successful, ${failedUploads.length} failed`);
    res.status(201).json(response);
    
  } catch (error) {
    console.error('❌ Error in bulk upload:', error);
    res.status(500).json({ 
      error: 'Server error: ' + error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Admin: Get all photos
app.get('/api/admin/photos', authenticateUser, isAdmin, async (req, res) => {
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

// Admin: Delete photo
app.delete('/api/admin/photos/:photoId', authenticateUser, isAdmin, async (req, res) => {
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
    
    // Update folder photo count
    if (photoData.folderId) {
      const folderRef = db.collection('folders').doc(photoData.folderId);
      await folderRef.update({
        photoCount: admin.firestore.FieldValue.increment(-1)
      });
    }
    
    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== HOMEPAGE PHOTO MANAGEMENT ====================

// Admin: Upload homepage photo
app.post('/api/admin/homepage-photos', authenticateUser, isAdmin, homepageUpload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' });
    }
    
    console.log('📸 Uploading homepage photo:', req.file.originalname);
    
    const { title, description } = req.body;
    
    // Create unique filename with timestamp
    const timestamp = Date.now();
    const safeFileName = req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    const fileName = `homepage_${timestamp}_${safeFileName}`;
    const filePath = `homepage/${fileName}`;
    
    console.log('Saving to:', filePath);
    
    // Upload to Firebase Storage
    const file = bucket.file(filePath);
    await file.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
        metadata: {
          uploadedBy: req.user.uid,
          uploadedAt: new Date().toISOString(),
          type: 'homepage'
        }
      }
    });
    
    // Make file publicly accessible
    await file.makePublic();
    
    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${filePath}`;
    console.log('Public URL:', publicUrl);
    
    // Save photo metadata to Firestore
    const photoData = {
      title: title || fileName,
      description: description || 'Homepage slideshow photo',
      fileName: fileName,
      filePath: filePath,
      url: publicUrl,
      uploadedBy: req.user.uid,
      uploadedByEmail: req.user.email,
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      size: req.file.size,
      contentType: req.file.mimetype,
      active: true
    };
    
    const photoRef = await db.collection('homepagePhotos').add(photoData);
    
    console.log('✅ Homepage photo uploaded successfully with ID:', photoRef.id);
    
    res.status(201).json({
      id: photoRef.id,
      message: 'Homepage photo uploaded successfully',
      photo: {
        id: photoRef.id,
        ...photoData,
        uploadedAt: new Date()
      }
    });
    
  } catch (error) {
    console.error('❌ Error uploading homepage photo:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Admin: Get all homepage photos
app.get('/api/admin/homepage-photos', authenticateUser, isAdmin, async (req, res) => {
  try {
    let snapshot;
    try {
      snapshot = await db.collection('homepagePhotos')
        .orderBy('uploadedAt', 'desc')
        .get();
    } catch (err) {
      console.log('homepagePhotos collection does not exist yet');
      return res.json([]);
    }
    
    const photos = [];
    snapshot.forEach(doc => {
      photos.push({
        id: doc.id,
        ...doc.data(),
        uploadedAt: doc.data().uploadedAt?.toDate()
      });
    });
    
    console.log(`Found ${photos.length} homepage photos in Firestore`);
    res.json(photos);
    
  } catch (error) {
    console.error('Error fetching homepage photos:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Delete homepage photo
app.delete('/api/admin/homepage-photos/:photoId', authenticateUser, isAdmin, async (req, res) => {
  try {
    const { photoId } = req.params;
    
    const photoRef = db.collection('homepagePhotos').doc(photoId);
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
    
    res.json({ message: 'Homepage photo deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting homepage photo:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Update homepage photo
app.put('/api/admin/homepage-photos/:photoId', authenticateUser, isAdmin, async (req, res) => {
  try {
    const { photoId } = req.params;
    const { title, description, active } = req.body;
    
    const photoRef = db.collection('homepagePhotos').doc(photoId);
    const photoDoc = await photoRef.get();
    
    if (!photoDoc.exists) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (active !== undefined) updateData.active = active;
    updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    
    await photoRef.update(updateData);
    
    res.json({ message: 'Homepage photo updated successfully' });
    
  } catch (error) {
    console.error('Error updating homepage photo:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== USER ROUTES ====================
app.get('/api/user/profile', authenticateUser, async (req, res) => {
  try {
    const userRef = db.collection('users').doc(req.user.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      await userRef.set({
        email: req.user.email,
        isAdmin: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      res.json({
        uid: req.user.uid,
        email: req.user.email,
        profile: { isAdmin: false }
      });
    } else {
      res.json({
        uid: req.user.uid,
        email: req.user.email,
        profile: userDoc.data()
      });
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({ error: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║              Puku Gallery Backend Server                 ║
╠══════════════════════════════════════════════════════════╣
║  ✅ Port: ${PORT}                                               ║
║  🔥 Firebase: ${firebaseInitialized ? '✅ Connected' : '❌ Not configured'}            ║
║  📦 Bucket: ${bucketName || 'Not set'}   ║
║  📁 Test: http://localhost:${PORT}/api/test                    ║
║  📂 Folders: http://localhost:${PORT}/api/folders              ║
╚══════════════════════════════════════════════════════════╝
  `);
});
