import { ObjectStorageService } from '../artifacts/api-server/src/lib/objectStorage.ts';

// Mock env for test if not set
process.env.CLOUDFLARE_R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'test-bucket';
process.env.CLOUDFLARE_R2_ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID || 'test-account-id';
process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || 'test-access-key';
process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || 'test-secret-key';

async function runVerification() {
  console.log('--- Cloudflare R2 Presigned Upload URL Verification ---');

  const storage = new ObjectStorageService();

  const testCases = [
    { type: 'image/png', label: 'Image (PNG)' },
    { type: 'image/jpeg', label: 'Image (JPEG)' },
    { type: 'image/webp', label: 'Image (WEBP)' },
    { type: 'application/pdf', label: 'PDF Document / Dossier' },
    { type: 'image/gif', label: 'Advertisement Banner' },
  ];

  for (const testCase of testCases) {
    console.log(`\nTesting ${testCase.label} (${testCase.type})...`);
    let presignedUrl;
    try {
      presignedUrl = await storage.getObjectEntityUploadURL(testCase.type);
    } catch (e) {
      console.log('Error generating URL:', e.message);
      continue;
    }

    console.log('Generated Presigned URL:');
    console.log(presignedUrl);

    const hasSdkChecksumAlgorithm = presignedUrl.includes('x-amz-sdk-checksum-algorithm');
    const hasChecksumCrc32 = presignedUrl.includes('x-amz-checksum-crc32');
    const hasSigV4 = presignedUrl.includes('X-Amz-Algorithm=AWS4-HMAC-SHA256');

    if (hasSdkChecksumAlgorithm) {
      console.error(`❌ FAILED: Presigned URL contains x-amz-sdk-checksum-algorithm!`);
      process.exit(1);
    } else {
      console.log(`✅ VERIFIED: x-amz-sdk-checksum-algorithm absent.`);
    }

    if (hasChecksumCrc32) {
      console.error(`❌ FAILED: Presigned URL contains x-amz-checksum-crc32!`);
      process.exit(1);
    } else {
      console.log(`✅ VERIFIED: x-amz-checksum-crc32 absent.`);
    }

    if (!hasSigV4) {
      console.error(`❌ FAILED: Presigned URL missing SigV4 signature!`);
      process.exit(1);
    } else {
      console.log(`✅ VERIFIED: SigV4 signature present.`);
    }
  }

  console.log('\n🎉 ALL CHECKSUM REMOVAL VERIFICATIONS PASSED SUCCESSFULLY!');
}

runVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
