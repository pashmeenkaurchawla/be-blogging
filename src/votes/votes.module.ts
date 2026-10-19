import { Module } from '@nestjs/common';
import { SqlSchemaModule } from '../sqlSchema/sql-schema.module';
import { RedisModule } from '../core/database/redis/redis.module';
import { VotesController } from './votes.controller';

@Module({
  imports: [SqlSchemaModule, RedisModule],
  controllers: [VotesController],
})
export class VotesApiModule {}
