import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from 'src/sqlSchema/comments/comment.entity';
import { CommentsService } from 'src/sqlSchema/comments/comments.service';
import { RedisModule } from 'src/core/database/redis/redis.module';
import { PostsModule } from 'src/sqlSchema/posts/posts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment]),
    RedisModule,
    forwardRef(() => PostsModule),
  ],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
