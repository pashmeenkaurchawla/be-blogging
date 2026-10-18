import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { PostsModule } from './posts/posts.module';
import { CommentsModule } from './comments/comments.module';
import { VotesModule } from './votes/votes.module';

@Module({
  imports: [UsersModule, PostsModule, CommentsModule, VotesModule],
  exports: [UsersModule, PostsModule, CommentsModule, VotesModule],
})
export class SqlSchemaModule {}
