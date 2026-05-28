# FS Sync

Production-oriented NestJS/Nx starter for Google Drive metadata synchronization.

This implementation covers Google Drive only:

- OAuth connection with offline tokens
- `changes.getStartPageToken`
- `changes.watch` webhook registration
- fast webhook ingestion using `X-Goog-*` headers
- BullMQ sync jobs
- `changes.list` cursor processing
- idempotent PostgreSQL metadata upserts with Prisma
- watch renewal and 24-hour reconciliation

Download and object storage are intentionally deferred. `POST /files/:id/download` creates a queue boundary and marks the work skipped so MinIO/S3 can be implemented later without coupling it to metadata sync.

## Apps And Libs

- `apps/api`: HTTP API and Google webhook receiver
- `apps/worker`: BullMQ processors, watch renewal, reconciliation
- `libs/database`: Prisma service/module
- `libs/queue`: BullMQ queues and Redis lock helper
- `libs/providers/google-drive`: Google OAuth, Drive client, watch/list/normalize logic
- `libs/metadata`: scope matching and file metadata upsert logic
- `libs/storage`: deferred storage abstraction placeholder
- `libs/common`: constants, env helpers, encryption, signed OAuth state

## Environment

Copy `.env.example` to `.env` and fill:

```sh
DATABASE_URL=postgresql://fs_sync:fs_sync@localhost:5432/fs_sync?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-drive/oauth/callback
GOOGLE_DRIVE_WEBHOOK_URL=https://your-ngrok-domain.ngrok-free.app/api/webhooks/google-drive
GOOGLE_DRIVE_ENABLE_WEBHOOKS=false
TOKEN_ENCRYPTION_KEY=...
```

`TOKEN_ENCRYPTION_KEY` must be 32 bytes as UTF-8, base64, or 64 hex chars.

For local OAuth-only testing, keep `GOOGLE_DRIVE_ENABLE_WEBHOOKS=false`. The callback will connect Google Drive, store encrypted tokens, create a local watch source, and import an initial page of Drive file metadata without registering a Google webhook. Turn it on only when `GOOGLE_DRIVE_WEBHOOK_URL` is a public HTTPS URL that Google can reach.

## Google Cloud Setup

1. Create a Google Cloud project.
2. Enable Google Drive API.
3. Configure OAuth consent screen.
4. Create an OAuth client ID for a web application.
5. Add this redirect URI:

```txt
http://localhost:3000/api/google-drive/oauth/callback
```

Google redirects to the API callback first because the backend must securely exchange the OAuth code for tokens. After a successful exchange, the API redirects the browser back to `APP_ORIGIN`, for example `http://localhost:4200/google-drive-sync`.

6. Expose the API with ngrok:

```sh
ngrok http 3000
```

7. Set `GOOGLE_DRIVE_WEBHOOK_URL` to:

```txt
https://your-ngrok-domain.ngrok-free.app/api/webhooks/google-drive
```

## Local Setup

Install dependencies, generate Prisma, migrate, and seed:

```sh
pnpm install
pnpm prisma generate
pnpm prisma migrate dev --name init
pnpm prisma db seed
```

If `pnpm` is not on PATH, enable it with Corepack:

```sh
corepack enable
```

Run API and worker:

```sh
pnpm nx serve api
pnpm nx serve worker
```

Open API documentation:

```txt
http://localhost:3000/api/docs
```

The Swagger UI documents every endpoint in this phase, including Google webhook headers, OAuth query parameters, response shapes, and the deferred download boundary. The raw OpenAPI JSON is available at:

```txt
http://localhost:3000/api/docs-json
```

Production-style Docker Compose starts Postgres, Redis, API, and worker from built images:

```sh
docker-compose up --build
```

For development Docker with hot reload, use the package scripts:

```sh
pnpm docker:dev
```

The dev Docker setup uses `docker-compose.dev.yml`. API and worker source code is bind-mounted into the containers, and each service runs through `pnpm nx serve ... --configuration=development` so Nx owns the project graph, compilation, and restart loop. After the first build, TypeScript changes under `apps/api`, `apps/worker`, and `libs` should recompile without rebuilding the Docker images.

The Angular dev app is available at:

```txt
http://localhost:4200
```

The dev compose file also starts an optional local HTTPS reverse proxy at `https://localhost:4443`, but the default OAuth development flow uses `http://localhost:4200` for the UI and `http://localhost:3000` for the API callback.

Use a rebuild only after dependency or Dockerfile changes:

```sh
pnpm docker:dev
```

For normal code changes, keep the containers running or start them without rebuilding:

```sh
pnpm docker:dev:up
```

Stop dev Docker:

```sh
pnpm docker:dev:down
```

Tail API and worker logs:

```sh
pnpm docker:dev:logs
```

Run migrations inside the API container before the first OAuth test:

```sh
docker-compose exec api pnpm prisma migrate deploy
docker-compose exec api pnpm prisma db seed
```

Swagger is exposed through Docker on the API port:

```txt
http://localhost:3000/api/docs
http://localhost:3000/api/docs-json
```

## Test Flow

You can run the whole flow from Swagger UI at `http://localhost:3000/api/docs`, or use the curl examples below.

Create an organization:

```sh
curl -X POST http://localhost:3000/api/organizations \
  -H "content-type: application/json" \
  -d "{\"name\":\"Demo Org\"}"
```

Open the OAuth URL:

```sh
curl "http://localhost:3000/api/google-drive/oauth/url?orgId=00000000-0000-0000-0000-000000000001"
```

Complete Google OAuth in the browser. The callback will:

1. exchange the code for tokens
2. store encrypted tokens in `ProviderConnection`
3. call `changes.getStartPageToken`
4. create `WatchSource`
5. call `changes.watch`
6. store channel metadata and expiration

Then upload, update, trash, or delete a file in Google Drive.

Google sends a webhook to:

```txt
POST /api/webhooks/google-drive
```

The webhook handler only validates headers, stores `RawProviderEvent`, enqueues `google-drive-sync`, and returns `200`.

The worker then:

1. acquires `sync:google-drive:{watchSourceId}` in Redis
2. calls `changes.list` using the saved `pageToken`
3. upserts or deletes `FileMetadata`
4. saves `nextPageToken` after a successful page
5. requeues continuation pages
6. saves `newStartPageToken` when the cursor chain is complete

Inspect synced files:

```sh
curl "http://localhost:3000/api/files?watchSourceId=<watchSourceId>"
curl "http://localhost:3000/api/files/<fileMetadataId>"
```

Manually enqueue sync:

```sh
curl -X POST http://localhost:3000/api/watch-sources/<watchSourceId>/sync-now
```

Requesting download currently creates a deferred job:

```sh
curl -X POST http://localhost:3000/api/files/<fileMetadataId>/download
```

## API Reference

Swagger groups the API into these tags:

- `Organizations`: `POST /api/organizations`
- `Google Drive OAuth`: `GET /api/google-drive/oauth/url`, `GET /api/google-drive/oauth/callback`
- `Google Drive Webhooks`: `POST /api/webhooks/google-drive`
- `Watch Sources`: `GET /api/watch-sources`, `POST /api/watch-sources/{id}/sync-now`
- `Files`: `GET /api/files`, `GET /api/files/{id}`, `POST /api/files/{id}/download`

Important operational details are captured in the endpoint descriptions:

- The webhook endpoint returns `200` for unknown or stale channels to avoid noisy retries.
- The webhook body may be empty; `X-Goog-*` headers are the notification signal.
- `changes.list` remains the source of truth and runs in the worker.
- Download APIs are documented as deferred because MinIO/S3 is not implemented yet.

## Notes

- Google webhook bodies may be empty; headers are used as the signal.
- Google notification payloads are not treated as source of truth; `changes.list` is.
- One sync cursor chain is processed sequentially per `WatchSource`.
- Parallel syncs across different watch sources are allowed.
- OneDrive, SharePoint, Box, OCR, AI, permissions, OpenSearch, MinIO, and S3 are not implemented.
