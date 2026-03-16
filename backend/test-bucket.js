const admin = require('firebase-admin');
const fs = require('fs');

// Load service account
const serviceAccount = require('./serviceAccountKey.json');

// Try different bucket name formats
const possibleBuckets = [
  `${serviceAccount.project_id}.firebasestorage.app`,
  `${serviceAccount.project_id}.appspot.com`,
  `gs://${serviceAccount.project_id}.firebasestorage.app`,
  `gs://${serviceAccount.project_id}.appspot.com`
];

console.log('Testing possible bucket names...\n');

async function testBucket(bucketName) {
  try {
    // Initialize a separate app for testing
    const testApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: bucketName
    }, `test-${Date.now()}`);
    
    const bucket = testApp.storage().bucket();
    
    // Try to list files (this will fail if bucket doesn't exist)
    const [files] = await bucket.getFiles({ maxResults: 1 });
    console.log(`✅ SUCCESS: Bucket "${bucketName}" exists!`);
    console.log(`   Found ${files.length} files\n`);
    return true;
  } catch (error) {
    console.log(`❌ FAILED: Bucket "${bucketName}" - ${error.message}`);
    return false;
  }
}

async function runTests() {
  for (const bucket of possibleBuckets) {
    await testBucket(bucket);
  }
}

runTests();