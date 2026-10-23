import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vote } from 'src/sqlSchema/votes/vote.entity';
import { VotesService } from 'src/sqlSchema/votes/votes.service';
import { PostsModule } from 'src/sqlSchema/posts/posts.module';
import { CommentsModule } from 'src/sqlSchema/comments/comments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vote]),
    forwardRef(() => PostsModule),
    forwardRef(() => CommentsModule),
  ],
  providers: [VotesService],
  exports: [VotesService],
})
export class VotesModule {}
