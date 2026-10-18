import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  BeforeApplicationShutdown,
} from '@nestjs/common';
import Redis from 'ioredis';
import { LoggerService } from '../../logger/logger.service';
import { RedisConfigService } from '../../../config/redis-config.service';

@Injectable()
export class RedisService
  implements OnModuleInit, OnModuleDestroy, BeforeApplicationShutdown
{
  private client: Redis;

  constructor(
    private readonly redisConfig: RedisConfigService,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit() {
    this.logger.log('Connecting to Redis...', 'RedisService');

    this.client = new Redis({
      host: this.redisConfig.host,
      port: this.redisConfig.port,
      password: this.redisConfig.password || undefined,
      lazyConnect: true,
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

    await this.client.connect();
    this.logger.log('Redis connection established', 'RedisService');
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

  getClient(): Redis {
    return this.client;
  }
}
