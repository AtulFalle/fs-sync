import { Module } from '@nestjs/common';
import { DatabaseModule } from '@org/database';
import { GoogleDriveProviderService } from './google-drive-provider.service';

@Module({
  imports: [DatabaseModule],
  providers: [GoogleDriveProviderService],
  exports: [GoogleDriveProviderService],
})
export class GoogleDriveModule {}
