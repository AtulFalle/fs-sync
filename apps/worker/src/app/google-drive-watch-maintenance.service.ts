import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Provider } from '@prisma/client';
import { PrismaService } from '@org/database';
import { GoogleDriveProviderService } from '@org/google-drive';
import { QueueService } from '@org/queue';

@Injectable()
export class GoogleDriveWatchMaintenanceService {
  private readonly logger = new Logger(GoogleDriveWatchMaintenanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly googleDrive: GoogleDriveProviderService,
    private readonly queues: QueueService,
  ) {}

  @Cron('0 * * * *')
  async renewExpiringWatches(): Promise<void> {
    const threshold = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const watchSources = await this.prisma.watchSource.findMany({
      where: {
        provider: Provider.google_drive,
        status: 'active',
        OR: [{ expiresAt: null }, { expiresAt: { lt: threshold } }],
      },
    });

    for (const watchSource of watchSources) {
      try {
        if (watchSource.channelId && watchSource.resourceId) {
          await this.googleDrive.stopChannel(
            watchSource.connectionId,
            watchSource.channelId,
            watchSource.resourceId,
          );
        }

        const channel = await this.googleDrive.watchChanges(
          watchSource.connectionId,
          watchSource.id,
        );
        await this.prisma.watchSource.update({
          where: { id: watchSource.id },
          data: {
            channelId: channel.channelId,
            resourceId: channel.resourceId,
            channelToken: channel.channelToken,
            expiresAt: channel.expiresAt,
          },
        });
      } catch (error) {
        this.logger.error(
          `Failed to renew Google Drive watch ${watchSource.id}`,
          error,
        );
      }
    }
  }

  @Cron('0 0 * * *')
  async reconcileActiveSources(): Promise<void> {
    const watchSources = await this.prisma.watchSource.findMany({
      where: { provider: Provider.google_drive, status: 'active' },
      select: { id: true },
    });

    for (const watchSource of watchSources) {
      await this.queues.enqueueGoogleDriveSync(watchSource.id);
    }
  }
}
