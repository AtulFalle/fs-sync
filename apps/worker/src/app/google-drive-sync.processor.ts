import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  GoogleDriveSyncJobData,
  JOB_NAMES,
  QUEUE_NAMES,
  redisConnectionOptions,
} from '@org/common';
import { PrismaService } from '@org/database';
import { GoogleDriveProviderService } from '@org/google-drive';
import { MetadataService } from '@org/metadata';
import { QueueService, RedisLockService } from '@org/queue';
import { Job, Worker } from 'bullmq';

@Injectable()
export class GoogleDriveSyncProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GoogleDriveSyncProcessor.name);
  private worker?: Worker<GoogleDriveSyncJobData>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly googleDrive: GoogleDriveProviderService,
    private readonly metadata: MetadataService,
    private readonly queues: QueueService,
    private readonly locks: RedisLockService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker<GoogleDriveSyncJobData>(
      QUEUE_NAMES.googleDriveSync,
      (job) => this.process(job),
      { connection: redisConnectionOptions(), concurrency: 5 },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }

  private async process(job: Job<GoogleDriveSyncJobData>): Promise<void> {
    if (job.name !== JOB_NAMES.googleDriveSync) {
      return;
    }

    const { watchSourceId } = job.data;
    const lockKey = `sync:google-drive:${watchSourceId}`;
    const lockToken = await this.locks.acquire(lockKey, 10 * 60 * 1000);
    if (!lockToken) {
      this.logger.debug(
        `Skipped concurrent sync for watchSource ${watchSourceId}`,
      );
      return;
    }

    try {
      await this.syncOnePage(watchSourceId);
    } finally {
      await this.locks.release(lockKey, lockToken);
    }
  }

  private async syncOnePage(watchSourceId: string): Promise<void> {
    const watchSource = await this.prisma.watchSource.findUniqueOrThrow({
      where: { id: watchSourceId },
      include: { connection: true },
    });

    const changes = await this.googleDrive.listChanges(
      watchSource.connectionId,
      watchSource.pageToken,
      watchSource.driveId ?? undefined,
    );

    for (const change of changes.changes ?? []) {
      if (!change.fileId) {
        continue;
      }

      if (change.removed) {
        await this.metadata.markRemoved(watchSource.id, change.fileId);
        continue;
      }

      const file =
        change.file ??
        (await this.googleDrive.getFileMetadata(
          watchSource.connectionId,
          change.fileId,
        ));
      const normalized = this.googleDrive.normalizeFile(file);
      const matchesScope = await this.metadata.matchesScopes(
        watchSource.id,
        normalized,
      );
      if (!matchesScope) {
        continue;
      }

      await this.metadata.upsertGoogleDriveFile({
        orgId: watchSource.connection.orgId,
        watchSourceId: watchSource.id,
        file: normalized,
      });
    }

    if (changes.nextPageToken) {
      await this.prisma.watchSource.update({
        where: { id: watchSource.id },
        data: { pageToken: changes.nextPageToken },
      });
      await this.queues.enqueueGoogleDriveSyncContinuation(watchSource.id);
      return;
    }

    if (changes.newStartPageToken) {
      await this.prisma.watchSource.update({
        where: { id: watchSource.id },
        data: { pageToken: changes.newStartPageToken },
      });
    }
  }
}
