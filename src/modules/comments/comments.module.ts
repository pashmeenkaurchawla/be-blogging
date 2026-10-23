import { Module } from '@nestjs/common';
import { RedisModule } from 'src/core/database/redis/redis.module';
import { CommentsController } from 'src/modules/comments/comments.controller';
import { SqlSchemaModule } from 'src/sqlSchema/sql-schema.module';

@Module({
  imports: [SqlSchemaModule, RedisModule],
  controllers: [CommentsController],
})
export class CommentsApiModule {}
