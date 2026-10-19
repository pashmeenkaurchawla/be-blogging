import { Module } from '@nestjs/common';
import { SqlSchemaModule } from '../sqlSchema/sql-schema.module';
import { RedisModule } from '../core/database/redis/redis.module';
import { PostsController } from './posts.controller';

@Module({
  imports: [SqlSchemaModule, RedisModule],
  controllers: [PostsController],
})
export class PostsApiModule {}
