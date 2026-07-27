import { Router, type IRouter, type Request, type Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../lib/auth';
import { ObjectNotFoundError, ObjectStorageService } from '../lib/objectStorage';

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

const RequestUploadUrlBody = z.object({
  name: z.string(),
  size: z.number(),
  contentType: z.string(),
});

/**
 * POST /storage/uploads/request-url
 * Requires JWT auth. Admin uploads PDF files for dossiers.
 */
router.post('/storage/uploads/request-url', requireAuth, async (req: Request, res: Response) => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Missing or invalid required fields' });
    return;
  }

  try {
    const { name, size, contentType } = parsed.data;
    const uploadURL = await objectStorageService.getObjectEntityUploadURL(contentType);
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

    res.json({ uploadURL, objectPath, metadata: { name, size, contentType } });
  } catch (error) {
    console.error('Error generating upload URL', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

/**
 * GET /storage/public-objects/*
 * Unconditionally public — serves app assets.
 */
router.get('/storage/public-objects/*filePath', async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join('/') : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) { res.status(404).json({ error: 'File not found' }); return; }

    const [metadata] = await file.getMetadata();
    const fileSize = metadata.size ? Number(metadata.size) : undefined;
    const contentType = (metadata.contentType as string) || 'application/octet-stream';

    const headers: Record<string, string | number> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
      'Accept-Ranges': 'bytes',
    };
    if (fileSize !== undefined) headers['Content-Length'] = fileSize;

    res.writeHead(200, headers);
    file.createReadStream().pipe(res);
  } catch (error) {
    console.error('Error serving public object', error);
    res.status(500).json({ error: 'Failed to serve public object' });
  }
});

/**
 * GET /storage/objects/*
 * Serve uploaded private files (PDFs, images) with range-request support.
 * No auth required — content is gated at the dossier level, not the file level.
 */
router.get('/storage/objects/*path', async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join('/') : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);

    const [metadata] = await objectFile.getMetadata();
    const fileSize = metadata.size ? Number(metadata.size) : undefined;
    const contentType = (metadata.contentType as string) || 'application/octet-stream';

    const rangeHeader = req.headers.range;

    if (rangeHeader && fileSize !== undefined) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (!match) {
        res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
        return;
      }
      const start = parseInt(match[1], 10);
      const end = match[2] !== '' ? parseInt(match[2], 10) : fileSize - 1;
      const safeEnd = Math.min(end, fileSize - 1);
      const chunkSize = safeEnd - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${safeEnd}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      });
      objectFile.createReadStream({ start, end: safeEnd }).pipe(res);
    } else {
      const headers: Record<string, string | number> = {
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600',
      };
      if (fileSize !== undefined) headers['Content-Length'] = fileSize;

      res.writeHead(200, headers);
      objectFile.createReadStream().pipe(res);
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: 'Object not found' }); return;
    }
    console.error('Error serving object', error);
    res.status(500).json({ error: 'Failed to serve object' });
  }
});

export default router;
