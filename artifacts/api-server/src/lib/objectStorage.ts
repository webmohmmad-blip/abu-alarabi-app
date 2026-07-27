/**
 * objectStorage.ts — Cloudflare R2 implementation (S3-compatible)
 *
 * Replaces the original Replit-sidecar GCS implementation which depended on
 * a local HTTP service running at http://127.0.0.1:1106 — unavailable on Render
 * or any other hosting platform.
 *
 * Required environment variables (set in Render dashboard):
 *   CLOUDFLARE_R2_ACCOUNT_ID       — Cloudflare account ID
 *   CLOUDFLARE_R2_ACCESS_KEY_ID    — R2 API access key
 *   CLOUDFLARE_R2_SECRET_ACCESS_KEY — R2 API secret key
 *   CLOUDFLARE_R2_BUCKET_NAME      — Bucket name (e.g. "abu-alarabi-files")
 *
 * Optional:
 *   PRIVATE_OBJECT_DIR             — Key prefix for uploaded files (default: "uploads")
 *   PUBLIC_OBJECT_SEARCH_PATHS     — Comma-separated key prefixes for public objects
 */

import { randomUUID } from 'crypto';
import { PassThrough, Readable } from 'stream';
import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  PutBucketCorsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let _corsConfigured = false;

export async function ensureR2BucketCors(): Promise<void> {
  if (_corsConfigured) return;
  try {
    const bucket = getR2BucketName();
    const s3 = getS3Client();
    await s3.send(
      new PutBucketCorsCommand({
        Bucket: bucket,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedOrigins: ['*'],
              AllowedMethods: ['PUT', 'GET', 'HEAD', 'OPTIONS'],
              AllowedHeaders: ['*'],
              ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type'],
              MaxAgeSeconds: 3600,
            },
          ],
        },
      }),
    );
    _corsConfigured = true;
    console.log('✅ Cloudflare R2 Bucket CORS policy applied successfully.');
  } catch (err: any) {
    console.warn('⚠️ Could not automatically apply R2 CORS policy (verify API permissions):', err.message || err);
  }
}

// ── R2 client (lazy, validated at first use) ──────────────────────────────────

// ── Strict Env & R2 Sanitization Helpers ─────────────────────────────────────

export function requireCleanEnv(primaryName: string, fallbackName?: string): string {
  const raw = process.env[primaryName] || (fallbackName ? process.env[fallbackName] : undefined);

  if (typeof raw !== 'string' || raw.length === 0) {
    throw new Error(`${primaryName}${fallbackName ? ` or ${fallbackName}` : ''} is required`);
  }

  const value = raw.trim();

  if (!value) {
    throw new Error(`${primaryName}${fallbackName ? ` or ${fallbackName}` : ''} is empty`);
  }

  if (/[\r\n]/.test(value)) {
    throw new Error(`${primaryName}${fallbackName ? ` or ${fallbackName}` : ''} contains newline characters`);
  }

  if (/[\u0000-\u001F\u007F]/.test(value)) {
    throw new Error(`${primaryName}${fallbackName ? ` or ${fallbackName}` : ''} contains control characters`);
  }

  return value;
}

export function validateBucketName(bucketName: string): string {
  if (!bucketName) {
    throw new Error('R2_BUCKET_NAME is required');
  }

  if (/[\s/\\%]/g.test(bucketName)) {
    throw new Error('R2_BUCKET_NAME contains invalid characters (spaces, slashes, or URL encoding)');
  }
  if (/[\r\n]/g.test(bucketName)) {
    throw new Error('R2_BUCKET_NAME contains line breaks');
  }
  if (/[\u0000-\u001F\u007F]/g.test(bucketName)) {
    throw new Error('R2_BUCKET_NAME contains control characters');
  }

  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucketName)) {
    throw new Error('R2_BUCKET_NAME must be 3-63 lowercase alphanumeric characters, dots, or hyphens, starting and ending with an alphanumeric character');
  }

  return bucketName;
}

export interface R2Config {
  endpoint: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  hostname: string;
}

export function getCleanR2Config(): R2Config {
  const accessKeyId = requireCleanEnv('CLOUDFLARE_R2_ACCESS_KEY_ID', 'R2_ACCESS_KEY_ID');
  const secretAccessKey = requireCleanEnv('CLOUDFLARE_R2_SECRET_ACCESS_KEY', 'R2_SECRET_ACCESS_KEY');
  const bucketNameRaw = requireCleanEnv('CLOUDFLARE_R2_BUCKET_NAME', 'R2_BUCKET_NAME');
  const bucketName = validateBucketName(bucketNameRaw);

  let endpointRaw: string | undefined = process.env['R2_ENDPOINT'] || process.env['CLOUDFLARE_R2_ENDPOINT'];
  if (!endpointRaw) {
    const accountId = requireCleanEnv('CLOUDFLARE_R2_ACCOUNT_ID', 'R2_ACCOUNT_ID');
    endpointRaw = `https://${accountId}.r2.cloudflarestorage.com`;
  } else {
    endpointRaw = requireCleanEnv('R2_ENDPOINT', 'CLOUDFLARE_R2_ENDPOINT');
  }

  const endpoint = endpointRaw.replace(/\/+$/, '');

  let endpointUrl: URL;
  try {
    endpointUrl = new URL(endpoint);
  } catch {
    throw new Error('R2_ENDPOINT is not a valid URL');
  }

  if (endpointUrl.protocol !== 'https:') {
    throw new Error('R2_ENDPOINT must use HTTPS');
  }

  if (!endpointUrl.hostname.endsWith('.r2.cloudflarestorage.com')) {
    throw new Error('R2_ENDPOINT is not a valid Cloudflare R2 endpoint');
  }

  if (
    endpointUrl.username ||
    endpointUrl.password ||
    endpointUrl.search ||
    endpointUrl.hash
  ) {
    throw new Error('R2_ENDPOINT contains unsupported URL components');
  }

  return {
    endpoint,
    bucketName,
    accessKeyId,
    secretAccessKey,
    hostname: endpointUrl.hostname,
  };
}

export function validateAndNormalizeObjectKey(key: string, bucketName: string): string {
  if (typeof key !== 'string' || !key.trim()) {
    throw new Error('Object key is required');
  }

  if (/^\s/.test(key)) {
    throw new Error('Object key must not start with whitespace');
  }

  if (/[\r\n]/.test(key) || /%0[ad]/i.test(key)) {
    throw new Error('Object key contains forbidden newline characters or sequences');
  }

  let normalized = key.replace(/\\/g, '/').replace(/^\/+/, '');

  if (normalized.startsWith(`${bucketName}/`)) {
    normalized = normalized.slice(bucketName.length + 1);
  }

  if (!normalized) {
    throw new Error('Normalized object key is empty');
  }

  return normalized;
}

export function validatePresignedUrl(urlStr: string, bucketName: string, expectedHostname: string): string {
  if (/%0[ad]/i.test(urlStr) || /[\r\n]/.test(urlStr)) {
    throw new Error('Generated presigned URL contains encoded or literal newline characters');
  }

  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    throw new Error('Generated presigned URL is invalid');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Generated presigned URL must use HTTPS');
  }

  if (parsed.hostname !== expectedHostname) {
    throw new Error(`Generated presigned URL hostname mismatch (expected ${expectedHostname}, got ${parsed.hostname})`);
  }

  const pathname = parsed.pathname;
  if (pathname.includes('//')) {
    throw new Error('Generated presigned URL path contains duplicated slashes');
  }

  const segments = pathname.split('/').filter(Boolean);
  const bucketMatchCount = segments.filter((s) => s === bucketName).length;
  if (bucketMatchCount !== 1) {
    throw new Error(`Generated presigned URL must contain bucket name '${bucketName}' exactly once in path`);
  }

  if (urlStr.includes('x-amz-sdk-checksum-algorithm') || urlStr.includes('x-amz-checksum-crc32')) {
    throw new Error('Generated presigned URL contains forbidden checksum parameters');
  }

  return urlStr;
}

export function validateR2ConfigOnStartup(): R2Config {
  return getCleanR2Config();
}

function getR2BucketName(): string {
  return getCleanR2Config().bucketName;
}

let _s3: S3Client | null = null;

function getS3Client(): S3Client {
  if (_s3) return _s3;

  const config = getCleanR2Config();

  _s3 = new S3Client({
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

  return _s3;
}


// ── Error types ───────────────────────────────────────────────────────────────

export class ObjectNotFoundError extends Error {
  constructor() {
    super('Object not found');
    this.name = 'ObjectNotFoundError';
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// ── R2File — drop-in replacement for @google-cloud/storage File ───────────────
// Provides the same interface that dossiers.ts, worksheets.ts, and storage.ts use:
//   - getMetadata()            → [{ size, contentType }]
//   - createReadStream(opts?)  → Node.js Readable
//   - exists()                 → [boolean]

export class R2File {
  constructor(
    private readonly bucket: string,
    private readonly key: string,
  ) {}

  /** Returns [ { size, contentType } ] matching the GCS File API used in routes. */
  async getMetadata(): Promise<[{ size?: number; contentType?: string; metadata?: Record<string, string> }]> {
    try {
      const head = await getS3Client().send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: this.key }),
      );
      return [{
        size: head.ContentLength,
        contentType: head.ContentType,
        metadata: (head.Metadata ?? {}) as Record<string, string>,
      }];
    } catch (err: any) {
      if (
        err.name === 'NotFound' ||
        err.$metadata?.httpStatusCode === 404 ||
        err.Code === 'NoSuchKey'
      ) {
        throw new ObjectNotFoundError();
      }
      throw err;
    }
  }

  /** Checks whether the object exists in R2. */
  async exists(): Promise<[boolean]> {
    try {
      await getS3Client().send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: this.key }),
      );
      return [true];
    } catch {
      return [false];
    }
  }

  /**
   * Streams the object body as a Node.js Readable.
   * Supports byte-range requests for PDF pagination in the browser.
   */
  createReadStream(options?: { start?: number; end?: number }): Readable {
    const pass = new PassThrough();
    const s3 = getS3Client();
    const { bucket, key } = this;

    (async () => {
      try {
        // Build Range header only when explicitly requested
        let range: string | undefined;
        if (options?.start !== undefined) {
          const end = options.end !== undefined ? options.end : '';
          range = `bytes=${options.start}-${end}`;
        }

        const resp = await s3.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: key,
            ...(range ? { Range: range } : {}),
          }),
        );

        if (!resp.Body) {
          pass.destroy(new Error('Empty response body from R2'));
          return;
        }

        // AWS SDK v3 Body is a Web ReadableStream on Node 18+
        const body = resp.Body as any;
        if (typeof body.pipe === 'function') {
          // Already a Node.js Readable
          (body as Readable).pipe(pass);
        } else if (typeof body.transformToNodeStream === 'function') {
          body.transformToNodeStream().pipe(pass);
        } else {
          // Web ReadableStream → Node Readable
          Readable.fromWeb(body).pipe(pass);
        }
      } catch (err) {
        pass.destroy(err instanceof Error ? err : new Error(String(err)));
      }
    })();

    return pass;
  }
}

// ── ObjectStorageService (public API unchanged) ───────────────────────────────

export class ObjectStorageService {
  constructor() {}

  getPublicObjectSearchPaths(): string[] {
    const raw = process.env.PUBLIC_OBJECT_SEARCH_PATHS ?? 'public';
    return Array.from(
      new Set(
        raw
          .split(',')
          .map((p) => p.trim().replace(/^\//, '').replace(/\/$/, ''))
          .filter((p) => p.length > 0),
      ),
    );
  }

  getPrivateObjectDir(): string {
    // Remove leading/trailing slashes — we use these as S3 key prefixes
    return (process.env.PRIVATE_OBJECT_DIR ?? 'uploads')
      .replace(/^\//, '')
      .replace(/\/$/, '');
  }

  // ── Upload ─────────────────────────────────────────────────────────────────

  /**
   * Generates a presigned R2 PUT URL (15-minute TTL) for a new object.
   * Returns the presigned URL; call normalizeObjectEntityPath() on it to get
   * the internal /objects/<key> path to store in the database.
   */
  async getObjectEntityUploadURL(contentType?: string): Promise<string> {
    const config = getCleanR2Config();
    const s3 = getS3Client();
    await ensureR2BucketCors();

    const objectId = randomUUID();
    const dir = this.getPrivateObjectDir();
    const rawKey = dir ? `${dir}/${objectId}` : objectId;
    const key = validateAndNormalizeObjectKey(rawKey, config.bucketName);

    const presignedUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: config.bucketName,
        Key: key,
        ...(contentType ? { ContentType: contentType } : {}),
      }),
      { expiresIn: 900 }, // 15 minutes
    );

    validatePresignedUrl(presignedUrl, config.bucketName, config.hostname);

    const keyPrefix = key.split('/')[0] || key;
    console.log(`[R2 Presign] Host: ${config.hostname} | Bucket: ${config.bucketName} | KeyPrefix: ${keyPrefix} | Newlines: NONE | Checksums: NONE`);

    return presignedUrl;
  }

  // ── Path normalisation ─────────────────────────────────────────────────────

  /**
   * Converts a presigned R2 URL into the internal /objects/<key> format
   * stored in the database, so routes can later retrieve the file.
   *
   * Presigned URL pattern:
   *   https://<account>.r2.cloudflarestorage.com/<bucket>/<key>?X-Amz-...
   *   pathname = /<bucket>/<key>
   */
  normalizeObjectEntityPath(rawPath: string): string {
    // Already an internal path
    if (rawPath.startsWith('/objects/')) return rawPath;

    // Legacy GCS URL (no longer generated, but handle gracefully)
    if (rawPath.startsWith('https://storage.googleapis.com/')) {
      return rawPath;
    }

    // R2 presigned URL
    try {
      const url = new URL(rawPath);
      // pathname = /<bucket>/<key>  — skip bucket (first segment)
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length >= 2) {
        const key = segments.slice(1).join('/'); // everything after bucket
        return `/objects/${key}`;
      }
    } catch {
      // Not a URL — return unchanged
    }

    return rawPath;
  }

  // ── Retrieve ───────────────────────────────────────────────────────────────

  /**
   * Returns an R2File handle for an internal /objects/<key> path.
   * Throws ObjectNotFoundError if the object does not exist in R2.
   */
  async getObjectEntityFile(objectPath: string): Promise<R2File> {
    if (!objectPath.startsWith('/objects/')) {
      throw new ObjectNotFoundError();
    }

    const key = objectPath.slice('/objects/'.length);
    if (!key) throw new ObjectNotFoundError();

    const bucket = getR2BucketName();
    const file = new R2File(bucket, key);
    const [exists] = await file.exists();
    if (!exists) throw new ObjectNotFoundError();

    return file;
  }

  /**
   * Searches public object key prefixes for a matching file.
   * Used by GET /storage/public-objects/* for serving app assets.
   */
  async searchPublicObject(filePath: string): Promise<R2File | null> {
    const bucket = getR2BucketName();

    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const key = `${searchPath}/${filePath}`.replace(/^\//, '');
      const file = new R2File(bucket, key);
      const [exists] = await file.exists();
      if (exists) return file;
    }

    return null;
  }

  // ── ACL stubs (production routes do not use ACL) ───────────────────────────

  /**
   * In R2/S3, object metadata cannot be updated in-place (requires CopyObject).
   * ACL policies are not used by any production route — this is a no-op stub.
   */
  async trySetObjectEntityAclPolicy(
    rawPath: string,
    _aclPolicy: import('./objectAcl').ObjectAclPolicy,
  ): Promise<string> {
    return this.normalizeObjectEntityPath(rawPath);
  }

  /**
   * Returns true if the object exists (simplified access check).
   * Production routes gate access at the API/auth layer, not file level.
   */
  async canAccessObjectEntity({
    objectFile,
  }: {
    userId?: string;
    objectFile: R2File;
    requestedPermission?: import('./objectAcl').ObjectPermission;
  }): Promise<boolean> {
    const [exists] = await objectFile.exists();
    return exists;
  }
}
