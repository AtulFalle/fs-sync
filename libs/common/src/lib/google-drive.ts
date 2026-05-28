export const GOOGLE_DRIVE_PROVIDER = 'google_drive' as const;
export const GOOGLE_DRIVE_FOLDER_MIME_TYPE =
  'application/vnd.google-apps.folder';
export const GOOGLE_WORKSPACE_MIME_PREFIX = 'application/vnd.google-apps';

export const GOOGLE_DRIVE_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
] as const;

export const GOOGLE_DRIVE_CHANGE_FIELDS =
  'nextPageToken,newStartPageToken,changes(fileId,removed,file(id,name,mimeType,size,md5Checksum,parents,trashed,modifiedTime,webViewLink,version),time)';

export const GOOGLE_DRIVE_FILE_FIELDS =
  'nextPageToken,files(id,name,mimeType,size,md5Checksum,parents,trashed,modifiedTime,webViewLink,version)';

export const GOOGLE_EXPORT_MIME_TYPES: Record<string, string> = {
  'application/vnd.google-apps.document': 'application/pdf',
  'application/vnd.google-apps.spreadsheet':
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.google-apps.presentation': 'application/pdf',
};
