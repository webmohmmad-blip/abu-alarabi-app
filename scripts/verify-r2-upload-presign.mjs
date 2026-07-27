import { ObjectStorageService } from '../artifacts/api-server/src/lib/objectStorage.ts';

// Mock env for test if not set
process.env.CLOUDFLARE_R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'test-bucket';
process.env.CLOUDFLARE_R2_ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID || 'test-account-id';
process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || 'test-access-key';
process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || 'test-secret-key';

async function runVerification() {
  console.log('--- Step 1: Generating Presigned PUT URL ---');

  const storage = new ObjectStorageService();
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;

  const testCases = [
    { type: 'image/png', label: 'Image Upload' },
    { type: 'application/pdf', label: 'PDF / Dossier Upload' },
  ];

  for (const testCase of testCases) {
    console.log(`\n=== Testing ${testCase.label} (${testCase.type}) ===`);
    
    let presignedUrl;
    try {
      presignedUrl = await storage.getObjectEntityUploadURL(testCase.type);
    } catch (e) {
      console.log('Error generating URL:', e.message);
      continue;
    }

    console.log('1. Generated Presigned URL:');
    console.log(presignedUrl);

    // Step 2 & 3: Check Virtual Host vs Path Style
    const isPathStyle = presignedUrl.includes(`/${bucket}/`);
    console.log('2. URL Style Check:');
    if (isPathStyle) {
      console.log('   ✅ Path Style URL confirmed (forcePathStyle: true is active).');
    } else {
      console.log('   ⚠️ Virtual Host URL detected! (Requires forcePathStyle: true).');
    }

    const hasSdkChecksumAlgorithm = presignedUrl.includes('x-amz-sdk-checksum-algorithm');
    const hasChecksumCrc32 = presignedUrl.includes('x-amz-checksum-crc32');

    console.log('3. Checksum Query Parameter Check:');
    console.log('   x-amz-sdk-checksum-algorithm present:', hasSdkChecksumAlgorithm);
    console.log('   x-amz-checksum-crc32 present:', hasChecksumCrc32);

    // Step 4: Test OPTIONS preflight request to inspect CORS response headers
    console.log('4. Inspecting OPTIONS Preflight Response Headers:');
    try {
      const preflightRes = await fetch(presignedUrl, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://abu-alarabi.com',
          'Access-Control-Request-Method': 'PUT',
          'Access-Control-Request-Headers': 'content-type',
        },
      });

      console.log(`   OPTIONS Response HTTP Status: ${preflightRes.status} ${preflightRes.statusText}`);
      console.log('   OPTIONS Response CORS Headers:');
      console.log('   - access-control-allow-origin:', preflightRes.headers.get('access-control-allow-origin'));
      console.log('   - access-control-allow-methods:', preflightRes.headers.get('access-control-allow-methods'));
      console.log('   - access-control-allow-headers:', preflightRes.headers.get('access-control-allow-headers'));
      console.log('   - access-control-max-age:', preflightRes.headers.get('access-control-max-age'));
    } catch (err) {
      console.log('   ⚠️ Preflight fetch note (dummy creds or local env network check):', err.message);
    }
  }

  console.log('\n🎉 Step Verification Execution Completed.');
}

runVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
