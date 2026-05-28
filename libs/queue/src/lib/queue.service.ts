import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { JOB_NAMES, QUEUE_NAMES, redisConnectionOptions } from '@org/common';
import { Queue } from 'bullmq';

@Injectable()
export class QueueService implements OnModuleDestroy {
  readonly googleDriveSyncQueue = new Queue(QUEUE_NAMES.googleDriveSync, {
    connection: redisConnectionOptions(),
  });

  readonly downloadFileQueue = new Queue(QUEUE_NAMES.downloadFile, {
    connection: redisConnectionOptions(),
  });

  readonly reconciliationQueue = new Queue(QUEUE_NAMES.reconciliation, {
    connection: redisConnectionOptions(),
  });

  async enqueueGoogleDriveSync(watchSourceId: string): Promise<void> {
    await this.googleDriveSyncQueue.add(
      JOB_NAMES.googleDriveSync,
      { watchSourceId },
      {
        jobId: `google-drive-sync-${watchSourceId}`,
        attempts: 6,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 500,
        removeOnFail: false,
      },
    );
  }

  async enqueueGoogleDriveSyncContinuation(
    watchSourceId: string,
  ): Promise<void> {
    await this.googleDriveSyncQueue.add(
      JOB_NAMES.googleDriveSync,
      { watchSourceId },
      {
        jobId: `google-drive-sync-${watchSourceId}-${Date.now()}`,
        attempts: 6,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 500,
        removeOnFail: false,
      },
    );
  }

  async enqueueDownloadFile(fileMetadataId: string): Promise<void> {
    await this.downloadFileQueue.add(
      JOB_NAMES.downloadFile,
      { fileMetadataId },
      {
        jobId: `download-file-${fileMetadataId}`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: 500,
        removeOnFail: false,
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([
      this.googleDriveSyncQueue.close(),
      this.downloadFileQueue.close(),
      this.reconciliationQueue.close(),
    ]);
  }
}
