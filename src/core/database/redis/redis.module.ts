import { Module } from '@nestjs/common';
import { RedisService } from 'src/core/database/redis/redis.service';

@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
