import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@org/database';
import { GoogleDriveModule } from '@org/google-drive';
import { MetadataModule } from '@org/metadata';
import { QueueModule } from '@org/queue';
import { FilesController } from './files.controller';
import { GoogleDriveBrowserController } from './google-drive-browser.controller';
import { GoogleDriveOAuthController } from './google-drive-oauth.controller';
import { OrganizationsController } from './organizations.controller';
import { WatchSourcesController } from './watch-sources.controller';
import { GoogleDriveWebhookController } from './webhooks/google-drive-webhook.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    GoogleDriveModule,
    MetadataModule,
    QueueModule,
  ],
  controllers: [
    OrganizationsController,
    GoogleDriveBrowserController,
    GoogleDriveOAuthController,
    GoogleDriveWebhookController,
    WatchSourcesController,
    FilesController,
  ],
  providers: [],
})
export class AppModule {}
