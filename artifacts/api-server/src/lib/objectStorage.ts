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

function getR2BucketName(): string {
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error('CLOUDFLARE_R2_BUCKET_NAME or R2_BUCKET_NAME is not set');
  return bucket;
}

let _s3: S3Client | null = null;

function getS3Client(): S3Client {
  if (_s3) return _s3;

  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY;
  const endpoint =
    process.env.R2_ENDPOINT ||
    process.env.CLOUDFLARE_R2_ENDPOINT ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

  if (!endpoint) throw new Error('R2_ENDPOINT or CLOUDFLARE_R2_ACCOUNT_ID is not set');
  if (!accessKeyId) throw new Error('R2_ACCESS_KEY_ID or CLOUDFLARE_R2_ACCESS_KEY_ID is not set');
  if (!secretAccessKey) throw new Error('R2_SECRET_ACCESS_KEY or CLOUDFLARE_R2_SECRET_ACCESS_KEY is not set');

  _s3 = new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
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
  async getObjectEntityUploadURL(): Promise<string> {
    const bucket = getR2BucketName();
    const s3 = getS3Client();
    await ensureR2BucketCors();

    const objectId = randomUUID();
    const dir = this.getPrivateObjectDir();
    const key = dir ? `${dir}/${objectId}` : objectId;

    const presignedUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: 900 }, // 15 minutes
    );

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
