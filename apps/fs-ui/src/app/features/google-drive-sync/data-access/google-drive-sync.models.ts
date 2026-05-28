export interface Organization {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface WatchSource {
  id: string;
  connectionId: string;
  provider: 'google_drive';
  sourceType: 'user_drive' | 'shared_drive';
  externalSourceId: string;
  driveId?: string | null;
  rootFolderId?: string | null;
  pageToken?: string | null;
  channelId?: string | null;
  resourceId?: string | null;
  expiresAt?: string | null;
  status: 'active' | 'expired' | 'error' | 'disabled';
  createdAt: string;
  updatedAt: string;
}

export interface GoogleDriveBrowserItem {
  id: string;
  name: string;
  mimeType: string;
  isFolder: boolean;
  webViewLink?: string | null;
  modifiedAt?: string | null;
}

export interface GoogleDriveBrowserResponse {
  connectionId: string;
  watchSourceId: string;
  parentId?: string | null;
  items: GoogleDriveBrowserItem[];
}

export interface FileMetadata {
  id: string;
  orgId: string;
  watchSourceId: string;
  provider: 'google_drive';
  providerFileId: string;
  name: string;
  path?: string | null;
  parentProviderId?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  md5Checksum?: string | null;
  version?: string | null;
  webViewLink?: string | null;
  isFolder: boolean;
  trashed: boolean;
  deletedAt?: string | null;
  modifiedAt?: string | null;
  lastSyncedAt: string;
  downloadStatus:
    | 'not_required'
    | 'queued'
    | 'downloading'
    | 'stored'
    | 'failed'
    | 'deleted';
  objectStorageKey?: string | null;
  createdAt: string;
  updatedAt: string;
}
