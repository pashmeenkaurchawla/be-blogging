import { Module } from '@nestjs/common';
import { UsersModule } from 'src/sqlSchema/users/users.module';
import { PostsModule } from 'src/sqlSchema/posts/posts.module';
import { CommentsModule } from 'src/sqlSchema/comments/comments.module';
import { VotesModule } from 'src/sqlSchema/votes/votes.module';

@Module({
  imports: [UsersModule, PostsModule, CommentsModule, VotesModule],
  exports: [UsersModule, PostsModule, CommentsModule, VotesModule],
})
export class SqlSchemaModule {}
