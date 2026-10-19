import { Module } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { SqlSchemaModule } from '../sqlSchema/sql-schema.module';
import { RedisModule } from '../core/database/redis/redis.module';

@Module({
  imports: [SqlSchemaModule, RedisModule],
  controllers: [CommentsController],
})
export class CommentsApiModule {}
