import { Module } from '@nestjs/common';
import { SqlSchemaModule } from 'src/sqlSchema/sql-schema.module';
import { PostsController } from 'src/modules/posts/posts.controller';
import { RedisModule } from 'src/core/database/redis/redis.module';

@Module({
  imports: [SqlSchemaModule, RedisModule],
  controllers: [PostsController],
})
export class PostsApiModule {}
