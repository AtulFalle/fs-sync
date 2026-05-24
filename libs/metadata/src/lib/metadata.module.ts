import { Module } from '@nestjs/common';
import { DatabaseModule } from '@org/database';
import { MetadataService } from './metadata.service';

@Module({
  imports: [DatabaseModule],
  providers: [MetadataService],
  exports: [MetadataService],
})
export class MetadataModule {}
