import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from 'src/sqlSchema/posts/posts.entity';
import { PostsService } from 'src/sqlSchema/posts/posts.service';
import { RedisModule } from 'src/core/database/redis/redis.module';

@Module({
  imports: [TypeOrmModule.forFeature([Post]), RedisModule],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
