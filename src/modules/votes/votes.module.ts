import { Module } from '@nestjs/common';
import { SqlSchemaModule } from 'src/sqlSchema/sql-schema.module';
import { VotesController } from 'src/modules/votes/votes.controller';
import { RedisModule } from 'src/core/database/redis/redis.module';

@Module({
  imports: [SqlSchemaModule, RedisModule],
  controllers: [VotesController],
})
export class VotesApiModule {}
