# Google Drive Sync UI

Required backend endpoints:

- `GET /api/google-drive/oauth/url?orgId=:orgId`
- `GET /api/watch-sources?provider=google_drive&orgId=:orgId`
- `GET /api/files?watchSourceId=:watchSourceId`
- `GET /api/files/:id`
- `POST /api/watch-sources/:id/sync-now`
- `POST /api/files/:id/download`

Set `environment.apiBaseUrl` for non-relative API hosts.
