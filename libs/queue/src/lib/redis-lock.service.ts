import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { optionalEnv } from '@org/common';
import Redis from 'ioredis';

@Injectable()
export class RedisLockService implements OnModuleDestroy {
  private readonly redis = new Redis({
    host: optionalEnv('REDIS_HOST', 'localhost'),
    port: Number(optionalEnv('REDIS_PORT', '6379')),
    maxRetriesPerRequest: null,
  });

  async acquire(key: string, ttlMs: number): Promise<string | null> {
    const token = `${Date.now()}:${Math.random()}`;
    const result = await this.redis.set(key, token, 'PX', ttlMs, 'NX');
    return result === 'OK' ? token : null;
  }

  async release(key: string, token: string): Promise<void> {
    await this.redis.eval(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      1,
      key,
      token,
    );
  }

  async onModuleDestroy(): Promise<void> {
    this.redis.disconnect();
  }
}
