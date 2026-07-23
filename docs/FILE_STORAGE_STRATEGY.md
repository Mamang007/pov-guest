# File Storage Strategy

## Current State (Prototype)

Photos are stored on the local filesystem at `public/uploads/`. This works for local development and a single-server prototype deployment.

### Constraints

| Metric | Limit |
|--------|-------|
| Guests per event | 5 |
| Photos per guest | 10 |
| Max photos per room | 50 |
| Estimated file size | ~500KB–2MB per photo (JPEG, client-side compressed) |
| Max storage per room | ~100MB |

### Current Flow

```
Guest captures photo → Canvas applies filter → JPEG blob
  → POST /api/photos/upload (multipart)
    → Server writes to public/uploads/{uuid}.{ext}
    → DB stores imageUrl = /uploads/{filename}
    → Served directly via Next.js static file serving
```

### Limitations

- **Not persistent across deploys** — `public/uploads` is ephemeral on platforms like Vercel
- **No CDN** — served from the app server, slow for distant users
- **No size/type validation** — accepts anything the client sends
- **No cleanup** — deleted rooms leave orphan files
- **Single server only** — no horizontal scaling

---

## Production Upgrade Path

### Recommended: Cloudflare R2

| Feature | Detail |
|---------|--------|
| S3-compatible API | Drop-in replacement with `@aws-sdk/client-s3` |
| No egress fees | Free bandwidth (huge win for photo-heavy app) |
| Global CDN | Served via Cloudflare edge |
| Cost | $0.015/GB stored, $0 egress |

### Alternative: AWS S3 + CloudFront

Better for AWS-native stacks. Higher egress cost but more ecosystem tooling.

### Migration Steps (when ready)

1. Install `@aws-sdk/client-s3`
2. Create a `lib/storage.ts` abstraction:
   ```ts
   interface StorageProvider {
     upload(file: Buffer, filename: string): Promise<string> // returns URL
     delete(url: string): Promise<void>
   }
   ```
3. Implement `LocalStorage` (current) and `R2Storage` (production)
4. Switch via env var: `STORAGE_PROVIDER=local|r2`
5. Update `imageUrl` in DB to store full URLs instead of relative paths
6. Add pre-signed upload URLs for direct client→R2 uploads (skip server)

---

## Validation Rules (implement now)

| Rule | Value |
|------|-------|
| Max file size | 5MB |
| Allowed types | image/jpeg, image/png, image/webp |
| Max photos per guest per room | 10 |
| Filename | Server-generated UUID (ignore client filename) |

---

## Cleanup Strategy

- When a room is deleted → delete all associated photos from storage
- Orphan detection cron (future): find files not referenced in DB

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Local filesystem for prototype | Simplest, no external deps, good enough for 5 guests × 10 photos |
| R2 for production | Zero egress cost is critical for a photo-sharing app |
| Server-side upload (not presigned) for prototype | Simpler implementation, validates before saving |
| JPEG only from camera capture | Canvas.toBlob outputs JPEG; file upload accepts PNG/WebP too |
