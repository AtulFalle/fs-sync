import { Global, Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { RedisLockService } from './redis-lock.service';

@Global()
@Module({
  providers: [QueueService, RedisLockService],
  exports: [QueueService, RedisLockService],
})
export class QueueModule {}
