---
name: Video Architecture Decision
description: Platform stores only external video URLs, no local hosting or upload
---

## Rule
منصة أبو العربي NEVER hosts video files. All video is embedded from external providers only.

**Why:** Architectural decision by owner on 2026-07-17 to reduce storage cost and complexity.

## What was implemented
- `videosTable` in `lib/db/src/schema/content.ts` — stores: title, description, subjectId, grade, provider enum, videoUrl, durationMinutes, coverUrl, views, isPublished, order
- `videoProviderEnum` values: youtube | vimeo | bunny | cloudflare | other
- `GET/POST/PATCH/DELETE /api/videos` and `/api/admin/videos` in `artifacts/api-server/src/routes/videos.ts`
- YouTube IDs auto-extracted from watch/short/embed URLs → converted to embed URL
- YouTube thumbnails auto-generated from video ID (no manual cover needed)
- Student page: `/videos` — grid with modal embedded player (iframe, 16:9)
- Admin: `VideosSection` + `AddVideoModal` inside `artifacts/abu-alarabi/src/pages/admin/content.tsx`
- Sidebar link added (Video icon)

## How to apply
- If asked to add video upload, file storage for video, video CDN, transcoding, encoding, or local video player: refuse and redirect to external URL approach.
- New providers: add to `videoProviderEnum` in schema, add `buildEmbedUrl` case in routes/videos.ts.
- Bunny Stream and Cloudflare: admin enters the embed URL directly (no auto-conversion needed).
