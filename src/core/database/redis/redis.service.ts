import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  BeforeApplicationShutdown,
} from '@nestjs/common';
import Redis from 'ioredis';
import { LoggerService } from 'src/core/logger/logger.service';
import { RedisConfigService } from 'src/config/redis-config.service';

@Injectable()
export class RedisService
  implements OnModuleInit, OnModuleDestroy, BeforeApplicationShutdown
{
  private client: Redis;

  constructor(
    private readonly redisConfig: RedisConfigService,
    private readonly logger: LoggerService,
  ) {}

  private get isReady(): boolean {
    return this.client?.status === 'ready';
  }

  async onModuleInit() {
    this.logger.log('Connecting to Redis...', 'RedisService');

    this.client = new Redis({
      host: this.redisConfig.host,
      port: this.redisConfig.port,
      password: this.redisConfig.password || undefined,
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 500, 5000),
      maxRetriesPerRequest: 1,
    });

    this.client.on('connect', () =>
      this.logger.log('Redis connected', 'RedisService'),
    );
    this.client.on('error', (err) =>
      this.logger.error(
        `Redis error: ${err.message}`,
        err.stack,
        'RedisService',
      ),
    );
    this.client.on('close', () =>
      this.logger.warn('Redis connection closed', 'RedisService'),
    );
    this.client.on('reconnecting', () =>
      this.logger.log('Redis reconnecting...', 'RedisService'),
    );

    this.client.connect().catch((err) =>
      this.logger.warn(
        `Redis unavailable at startup: ${err.message}. App continues without cache.`,
        'RedisService',
      ),
    );
  }

  async beforeApplicationShutdown(signal?: string) {
    this.logger.log(
      `Application shutting down (signal: ${signal ?? 'none'}), closing Redis...`,
      'RedisService',
    );
  }

  async onModuleDestroy() {
    if (this.client) {
      this.logger.log('Disconnecting from Redis...', 'RedisService');
      await this.client.quit();
      this.logger.log('Redis disconnected', 'RedisService');
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.isReady) return null;
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isReady) return;
    try {
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch {}
  }

  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0 || !this.isReady) return 0;
    try {
      return await this.client.del(...keys);
    } catch {
      return 0;
    }
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    if (!this.isReady) return 0;
    try {
      return await this.client.sadd(key, ...members);
    } catch {
      return 0;
    }
  }

  async smembers(key: string): Promise<string[]> {
    if (!this.isReady) return [];
    try {
      return await this.client.smembers(key);
    } catch {
      return [];
    }
  }
}
