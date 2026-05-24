import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  DownloadFileJobData,
  JOB_NAMES,
  QUEUE_NAMES,
  redisConnectionOptions,
} from '@org/common';
import { PrismaService } from '@org/database';
import { Job, Worker } from 'bullmq';

@Injectable()
export class DownloadFileProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DownloadFileProcessor.name);
  private worker?: Worker<DownloadFileJobData>;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    this.worker = new Worker<DownloadFileJobData>(
      QUEUE_NAMES.downloadFile,
      (job) => this.process(job),
      { connection: redisConnectionOptions(), concurrency: 3 },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }

  private async process(job: Job<DownloadFileJobData>): Promise<void> {
    if (job.name !== JOB_NAMES.downloadFile) {
      return;
    }

    const file = await this.prisma.fileMetadata.findUniqueOrThrow({
      where: { id: job.data.fileMetadataId },
    });

    this.logger.log(
      `Download skipped for ${file.providerFileId}; storage/download is deferred`,
    );

    await this.prisma.fileMetadata.update({
      where: { id: file.id },
      data: { downloadStatus: 'skipped' },
    });
    await this.prisma.downloadJob.updateMany({
      where: { fileMetadataId: file.id, status: 'queued' },
      data: {
        status: 'failed',
        error: 'Download and object storage are deferred.',
      },
    });
  }
}
