import assert from 'node:assert/strict';
import {
  requireCleanEnv,
  validateBucketName,
  getCleanR2Config,
  validateAndNormalizeObjectKey,
  validatePresignedUrl,
  ObjectStorageService,
} from '../artifacts/api-server/src/lib/objectStorage.ts';

function runTests() {
  console.log('=== PHASE 9: AUTOMATED R2 SANITIZATION & SAFETY TESTS ===\n');

  const origEnv = { ...process.env };

  function resetEnv() {
    process.env.CLOUDFLARE_R2_ACCOUNT_ID = 'test-account-id';
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = 'test-access-key';
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = 'test-secret-key';
    process.env.CLOUDFLARE_R2_BUCKET_NAME = 'abu-alarabi-files';
    delete process.env.R2_ENDPOINT;
    delete process.env.CLOUDFLARE_R2_ENDPOINT;
    delete process.env.R2_ACCOUNT_ID;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.R2_BUCKET_NAME;
  }

  // 1. Clean values are accepted
  console.log('Test 1: Clean values are accepted');
  resetEnv();
  const cleanVal = requireCleanEnv('CLOUDFLARE_R2_ACCOUNT_ID');
  assert.equal(cleanVal, 'test-account-id');
  console.log('  ✅ Passed');

  // 2. Leading/trailing spaces are trimmed
  console.log('\nTest 2: Leading/trailing spaces are trimmed');
  resetEnv();
  process.env.CLOUDFLARE_R2_ACCOUNT_ID = '   test-account-id   ';
  const trimmedVal = requireCleanEnv('CLOUDFLARE_R2_ACCOUNT_ID');
  assert.equal(trimmedVal, 'test-account-id');
  console.log('  ✅ Passed');

  // 3. Trailing newline is removed safely (by trim)
  console.log('\nTest 3: Trailing newline is removed safely via trim');
  resetEnv();
  process.env.CLOUDFLARE_R2_ACCOUNT_ID = 'test-account-id\n';
  const trailingNewlineVal = requireCleanEnv('CLOUDFLARE_R2_ACCOUNT_ID');
  assert.equal(trailingNewlineVal, 'test-account-id');
  console.log('  ✅ Passed');

  // 4. Embedded newline is rejected
  console.log('\nTest 4: Embedded newline is rejected');
  resetEnv();
  process.env.CLOUDFLARE_R2_ACCOUNT_ID = 'test-account\nid';
  assert.throws(
    () => requireCleanEnv('CLOUDFLARE_R2_ACCOUNT_ID'),
    /contains newline characters/
  );
  console.log('  ✅ Passed');

  // 5. Carriage return is rejected
  console.log('\nTest 5: Carriage return is rejected');
  resetEnv();
  process.env.CLOUDFLARE_R2_ACCOUNT_ID = 'test-account\rid';
  assert.throws(
    () => requireCleanEnv('CLOUDFLARE_R2_ACCOUNT_ID'),
    /contains newline characters/
  );
  console.log('  ✅ Passed');

  // 6. Other control characters are rejected
  console.log('\nTest 6: Other control characters are rejected');
  resetEnv();
  process.env.CLOUDFLARE_R2_ACCOUNT_ID = 'test-account\u0007id';
  assert.throws(
    () => requireCleanEnv('CLOUDFLARE_R2_ACCOUNT_ID'),
    /contains control characters/
  );
  console.log('  ✅ Passed');

  // 7. Endpoint trailing slash is removed
  console.log('\nTest 7: Endpoint trailing slash is removed');
  resetEnv();
  process.env.R2_ENDPOINT = 'https://test-account-id.r2.cloudflarestorage.com///';
  const configSlash = getCleanR2Config();
  assert.equal(configSlash.endpoint, 'https://test-account-id.r2.cloudflarestorage.com');
  console.log('  ✅ Passed');

  // 8. Invalid non-R2 endpoint is rejected
  console.log('\nTest 8: Invalid non-R2 endpoint is rejected');
  resetEnv();
  process.env.R2_ENDPOINT = 'https://s3.amazonaws.com';
  assert.throws(
    () => getCleanR2Config(),
    /is not a valid Cloudflare R2 endpoint/
  );
  console.log('  ✅ Passed');

  // 9. Invalid bucket name is rejected
  console.log('\nTest 9: Invalid bucket name is rejected');
  assert.throws(
    () => validateBucketName('abu alarabi files'),
    /contains invalid characters/
  );
  assert.throws(
    () => validateBucketName('abu/alarabi/files'),
    /contains invalid characters/
  );
  assert.throws(
    () => validateBucketName('abu%0Afiles'),
    /contains invalid characters/
  );
  assert.throws(
    () => validateBucketName('-abualarabifiles-'),
    /must be 3-63 lowercase/
  );
  console.log('  ✅ Passed');

  // 10, 11, 12: Presigned URL validation & generation checks
  console.log('\nTest 10, 11, 12: Presigned URL safety, Path-Style, and single bucket occurrence');
  resetEnv();
  
  // Test validatePresignedUrl function directly
  const validUrl = 'https://test-account-id.r2.cloudflarestorage.com/abu-alarabi-files/uploads/uuid123?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=key%2F20260727%2Fauto%2Fs3%2Faws4_request';
  assert.equal(validatePresignedUrl(validUrl, 'abu-alarabi-files', 'test-account-id.r2.cloudflarestorage.com'), validUrl);

  // Reject %0A in URL
  assert.throws(
    () => validatePresignedUrl('https://test-account-id.r2.cloudflarestorage.com/abu-alarabi-files%0A/uploads/uuid123', 'abu-alarabi-files', 'test-account-id.r2.cloudflarestorage.com'),
    /contains encoded or literal newline/
  );

  // Reject %0D in URL
  assert.throws(
    () => validatePresignedUrl('https://test-account-id.r2.cloudflarestorage.com/abu-alarabi-files%0D/uploads/uuid123', 'abu-alarabi-files', 'test-account-id.r2.cloudflarestorage.com'),
    /contains encoded or literal newline/
  );

  // Reject checksum parameters in URL
  assert.throws(
    () => validatePresignedUrl(validUrl + '&x-amz-sdk-checksum-algorithm=CRC32', 'abu-alarabi-files', 'test-account-id.r2.cloudflarestorage.com'),
    /contains forbidden checksum parameters/
  );

  // Reject duplicated bucket in path
  assert.throws(
    () => validatePresignedUrl('https://test-account-id.r2.cloudflarestorage.com/abu-alarabi-files/abu-alarabi-files/uploads/uuid123', 'abu-alarabi-files', 'test-account-id.r2.cloudflarestorage.com'),
    /must contain bucket name 'abu-alarabi-files' exactly once/
  );

  // Test full ObjectStorageService.getObjectEntityUploadURL generation
  const storage = new ObjectStorageService();
  storage.getObjectEntityUploadURL('image/png').then((generatedUrl) => {
    console.log('\nGenerated Presigned PUT URL:');
    console.log(generatedUrl);

    assert.equal(generatedUrl.includes('%0A'), false, 'URL must not contain %0A');
    assert.equal(generatedUrl.includes('%0D'), false, 'URL must not contain %0D');
    assert.equal(generatedUrl.includes('x-amz-sdk-checksum-algorithm'), false, 'URL must not contain x-amz-sdk-checksum-algorithm');
    assert.equal(generatedUrl.includes('x-amz-checksum-crc32'), false, 'URL must not contain x-amz-checksum-crc32');
    
    // Path-style check: https://<hostname>/<bucket>/<key>
    assert.equal(generatedUrl.startsWith('https://test-account-id.r2.cloudflarestorage.com/abu-alarabi-files/'), true);
    
    // Bucket name appears exactly once in URL path
    const urlObj = new URL(generatedUrl);
    const bucketMatches = (urlObj.pathname.match(/\/abu-alarabi-files\//g) || []).length;
    assert.equal(bucketMatches, 1, 'Bucket name must appear exactly once in pathname');

    console.log('\n🎉 ALL 12 AUTOMATED SANITIZATION & SAFETY TESTS PASSED!');

    // Restore original env
    process.env = origEnv;
  }).catch((err) => {
    console.error('Presigned URL generation test failed:', err);
    process.exit(1);
  });
}

runTests();
