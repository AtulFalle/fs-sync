export const QUEUE_NAMES = {
  googleDriveSync: 'google-drive-sync',
  downloadFile: 'download-file',
  reconciliation: 'reconciliation',
} as const;

export const JOB_NAMES = {
  googleDriveSync: 'google-drive-sync',
  downloadFile: 'download-file',
  reconcileGoogleDrive: 'reconcile-google-drive',
  renewGoogleDriveWatches: 'renew-google-drive-watches',
} as const;

export interface GoogleDriveSyncJobData {
  watchSourceId: string;
}

export interface DownloadFileJobData {
  fileMetadataId: string;
}
