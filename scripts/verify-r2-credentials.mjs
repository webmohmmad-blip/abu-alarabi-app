import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  getSignedUrl,
  getCleanR2Config,
} from '../artifacts/api-server/src/lib/objectStorage.ts';

// Set fallback test credentials for local shell environment if not provided via process.env
const isLiveEnv = Boolean(
  process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID
);

if (!isLiveEnv) {
  process.env.CLOUDFLARE_R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'abu-alarabi-files';
  process.env.CLOUDFLARE_R2_ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID || 'dummy-account-id';
  process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || 'dummy-access-key-id';
  process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || 'dummy-secret-access-key';
}

async function runDiagnostic() {
  console.log('==================================================');
  console.log('   CLOUDFLARE R2 SIGV4 CREDENTIAL DIAGNOSTIC');
  console.log('==================================================\n');

  console.log(`Environment Source: ${isLiveEnv ? 'LIVE Production/Env Variables' : 'LOCAL Fallback Test Credentials'}\n`);

  let config;
  try {
    config = getCleanR2Config();
  } catch (err) {
    console.error('❌ Environment configuration error:', err.message);
    process.exit(1);
  }

  const maskedAccount = config.hostname.split('.')[0]
    ? '****' + config.hostname.split('.')[0].slice(-4)
    : '****';
  const maskedAccessKey = config.accessKeyId.length > 4
    ? '****' + config.accessKeyId.slice(-4)
    : '****';

  console.log('Phase 1 Configuration Inspection:');
  console.log(`- Endpoint Hostname: ${config.hostname}`);
  console.log(`- Masked Account ID: ${maskedAccount}`);
  console.log(`- Bucket Name: ${config.bucketName}`);
  console.log(`- Masked Access Key ID: ${maskedAccessKey}`);
  console.log(`- S3 Force Path Style: true`);
  console.log(`- Checksum Config: WHEN_REQUIRED\n`);

  const s3 = new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });

  const testKey = `diagnostics/r2-test-${Date.now()}.txt`;
  const testBody = 'R2 diagnostic test payload';
  const contentType = 'text/plain';

  console.log(`--- Phase 1: Testing Direct AWS SDK v3 Operations ---`);
  console.log(`Target Key: ${testKey}`);

  let directSuccess = false;
  let r2ErrorCode = null;
  let r2ErrorMessage = null;

  try {
    console.log('\n1. Executing direct PutObjectCommand...');
    const putRes = await s3.send(
      new PutObjectCommand({
        Bucket: config.bucketName,
        Key: testKey,
        Body: testBody,
        ContentType: contentType,
      })
    );
    console.log('   ✅ PutObjectCommand succeeded! HTTP Status:', putRes.$metadata?.httpStatusCode || 200);

    console.log('\n2. Executing direct HeadObjectCommand...');
    const headRes = await s3.send(
      new HeadObjectCommand({
        Bucket: config.bucketName,
        Key: testKey,
      })
    );
    console.log('   ✅ HeadObjectCommand succeeded! Content Length:', headRes.ContentLength);

    console.log('\n3. Executing direct DeleteObjectCommand...');
    await s3.send(
      new DeleteObjectCommand({
        Bucket: config.bucketName,
        Key: testKey,
      })
    );
    console.log('   ✅ DeleteObjectCommand succeeded!');
    directSuccess = true;
  } catch (err) {
    r2ErrorCode = err.name || err.Code || err.code || 'UnknownError';
    r2ErrorMessage = err.message || String(err);
    console.error(`\n❌ Direct AWS SDK v3 Operation FAILED!`);
    console.error(`   Error Name/Code: ${r2ErrorCode}`);
    console.error(`   HTTP Status: ${err.$metadata?.httpStatusCode || 'N/A'}`);
    console.error(`   Message: ${r2ErrorMessage}`);
  }

  // Phase 2: Classification
  console.log('\n==================================================');
  console.log('   PHASE 2 & 3: RESULT CLASSIFICATION & ACCOUNT MATCH');
  console.log('==================================================');

  if (!directSuccess) {
    console.log(`\nClassification of Direct Operation Failure:`);
    if (r2ErrorCode === 'SignatureDoesNotMatch' || r2ErrorMessage.includes('SignatureDoesNotMatch')) {
      console.log(`🔴 [SignatureDoesNotMatch]`);
      console.log(`   - The Access Key ID (${maskedAccessKey}) and Secret Access Key do NOT form a valid matching pair,`);
      console.log(`     or contain incorrect characters, or belong to another Cloudflare account.`);
      console.log(`   - THIS CANNOT BE FIXED BY CORS OR FRONTEND CODE CHANGES.`);
      console.log(`   - Corrective Action: Regenerate a new R2 API Token in Cloudflare Dashboard and update environment variables.`);
    } else if (r2ErrorCode === 'InvalidAccessKeyId' || r2ErrorMessage.includes('InvalidAccessKeyId')) {
      console.log(`🔴 [InvalidAccessKeyId]`);
      console.log(`   - The Access Key ID is invalid or does not exist under account ${maskedAccount}.`);
      console.log(`   - Corrective Action: Verify CLOUDFLARE_R2_ACCESS_KEY_ID in dashboard.`);
    } else if (r2ErrorCode === 'AccessDenied' || r2ErrorMessage.includes('AccessDenied')) {
      console.log(`🔴 [AccessDenied]`);
      console.log(`   - The R2 API Token lacks Object Read & Write permissions for bucket '${config.bucketName}'.`);
      console.log(`   - Corrective Action: Re-issue token with 'Admin Read & Write' or 'Object Read & Write' permissions.`);
    } else {
      console.log(`🔴 [Error Type: ${r2ErrorCode}]`);
      console.log(`   - ${r2ErrorMessage}`);
      if (!isLiveEnv) {
        console.log(`   - Note: Local test run used dummy fallback credentials. Run with live production env vars to test actual Cloudflare connection.`);
      }
    }
  } else {
    console.log(`\n🟢 Direct AWS SDK v3 PutObject, HeadObject, DeleteObject succeeded!`);
    console.log(`- R2 API Credentials (${maskedAccessKey}) are valid.`);
    console.log(`- Account ID (${maskedAccount}) and bucket permissions are verified.`);
  }

  // Phase 4: Presigned URL Test (Only if direct SDK PutObject succeeded)
  let presignedSuccess = false;
  if (directSuccess) {
    console.log('\n==================================================');
    console.log('   PHASE 4: PRESIGNED URL UPLOAD TEST');
    console.log('==================================================');

    const presignedKey = `diagnostics/r2-presigned-test-${Date.now()}.txt`;
    const presignedBody = 'R2 presigned upload test body';

    try {
      console.log(`\n1. Generating presigned PUT URL for key: ${presignedKey}...`);
      const presignedUrl = await getSignedUrl(
        s3,
        new PutObjectCommand({
          Bucket: config.bucketName,
          Key: presignedKey,
          ContentType: contentType,
        }),
        { expiresIn: 900 }
      );
      console.log('   ✅ Presigned PUT URL generated successfully.');

      console.log('\n2. Uploading payload via fetch (PUT method)...');
      const putRes = await fetch(presignedUrl, {
        method: 'PUT',
        body: presignedBody,
        headers: { 'Content-Type': contentType },
      });

      console.log(`   Fetch Response Status: ${putRes.status} ${putRes.statusText}`);

      if (putRes.ok) {
        console.log('   ✅ Presigned PUT HTTP upload succeeded!');

        console.log('\n3. Verifying uploaded object via HeadObject...');
        const headRes = await s3.send(
          new HeadObjectCommand({ Bucket: config.bucketName, Key: presignedKey })
        );
        console.log('   ✅ Object verified in bucket! Size:', headRes.ContentLength);

        console.log('\n4. Cleaning up presigned test object...');
        await s3.send(
          new DeleteObjectCommand({ Bucket: config.bucketName, Key: presignedKey })
        );
        console.log('   ✅ Presigned test object deleted.');
        presignedSuccess = true;
      } else {
        const errText = await putRes.text();
        console.error(`❌ Presigned PUT Upload FAILED with HTTP ${putRes.status}`);
        console.error(`   Response Body:\n${errText}`);
      }
    } catch (err) {
      console.error(`❌ Presigned PUT Upload FAILED with error:`, err.message);
    }
  }

  // Phase 5: Final Summary Report
  console.log('\n==================================================');
  console.log('   PHASE 5: DIAGNOSTIC SUMMARY REPORT');
  console.log('==================================================');
  console.log(`1. Direct PutObject Succeeded: ${directSuccess ? 'YES ✅' : 'NO ❌'}`);
  console.log(`2. R2 Error Code (if failed): ${r2ErrorCode || 'None'}`);
  console.log(`3. Credentials Match Endpoint Account: ${directSuccess ? 'YES ✅' : 'FAILED / UNCONFIRMED'}`);
  console.log(`4. Token Permissions Include Object Read & Write: ${directSuccess ? 'YES ✅' : 'NO ❌'}`);
  console.log(`5. Presigned PUT Succeeded: ${presignedSuccess ? 'YES ✅' : directSuccess ? 'NO ❌' : 'N/A (Direct Failed)'}`);
  console.log('==================================================\n');
}

runDiagnostic().catch((err) => {
  console.error('Diagnostic script execution error:', err);
  process.exit(1);
});
