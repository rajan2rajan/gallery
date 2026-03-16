// backend/syncHomepagePhotos.js
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load service account
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: `photovalut-a3825.firebasestorage.app`
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function syncHomepagePhotos() {
  console.log('🔄 Starting homepage photos sync...');
  console.log('📁 Checking bucket:', bucket.name);
  
  try {
    // Get all files from the homepage folder in Storage
    const [files] = await bucket.getFiles({ prefix: 'homepage/' });
    
    console.log(`📁 Found ${files.length} files in homepage folder`);
    
    if (files.length === 0) {
      console.log('❌ No files found in homepage folder');
      console.log('📝 Please upload photos to the homepage folder in Storage first');
      return;
    }
    
    // List all files found
    console.log('\n📋 Files found:');
    files.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.name}`);
    });
    
    // Get existing photos from Firestore
    const snapshot = await db.collection('homepagePhotos').get();
    const existingUrls = new Set();
    const existingFileNames = new Set();
    
    snapshot.forEach(doc => {
      const data = doc.data();
      existingUrls.add(data.url);
      existingFileNames.add(data.fileName);
    });
    
    console.log(`\n📚 Found ${existingUrls.size} existing entries in Firestore`);
    
    let added = 0;
    let skipped = 0;
    
    // Process each file
    for (const file of files) {
      // Get file metadata
      const [metadata] = await file.getMetadata();
      
      // Generate public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
      
      // Extract filename from path
      const fileName = path.basename(file.name);
      
      // Check if already exists in Firestore
      if (existingFileNames.has(fileName) || existingUrls.has(publicUrl)) {
        console.log(`⏭️ Skipping ${fileName} - already exists in Firestore`);
        skipped++;
        continue;
      }
      
      // Create Firestore document
      const docRef = await db.collection('homepagePhotos').add({
        title: `Homepage Photo ${new Date().toLocaleDateString()}`,
        description: 'Auto-synced from storage',
        fileName: fileName,
        filePath: file.name,
        url: publicUrl,
        uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
        size: metadata.size || 0,
        contentType: metadata.contentType || 'image/jpeg',
        active: true
      });
      
      console.log(`✅ Added ${fileName} to Firestore with ID: ${docRef.id}`);
      added++;
    }
    
    console.log('\n🎉 Sync complete!');
    console.log('📊 Summary:');
    console.log(`   - Total files in Storage: ${files.length}`);
    console.log(`   - Added to Firestore: ${added}`);
    console.log(`   - Skipped (already exist): ${skipped}`);
    
    // Verify Firestore entries
    const verifySnapshot = await db.collection('homepagePhotos').get();
    console.log(`\n✅ Verification: Firestore now has ${verifySnapshot.size} homepage photos`);
    
  } catch (error) {
    console.error('❌ Error during sync:', error);
    console.error('Error details:', error.message);
  }
  
  process.exit(0);
}

// Run the sync
syncHomepagePhotos();