import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '@org/database';
import { GoogleDriveModule } from '@org/google-drive';
import { MetadataModule } from '@org/metadata';
import { QueueModule } from '@org/queue';
import { DownloadFileProcessor } from './download-file.processor';
import { GoogleDriveSyncProcessor } from './google-drive-sync.processor';
import { GoogleDriveWatchMaintenanceService } from './google-drive-watch-maintenance.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    GoogleDriveModule,
    MetadataModule,
    QueueModule,
  ],
  controllers: [],
  providers: [
    GoogleDriveSyncProcessor,
    DownloadFileProcessor,
    GoogleDriveWatchMaintenanceService,
  ],
})
export class AppModule {}
