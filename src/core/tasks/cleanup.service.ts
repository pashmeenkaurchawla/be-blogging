import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PostsService } from 'src/sqlSchema/posts/posts.service';
import { CommentsService } from 'src/sqlSchema/comments/comments.service';
import { VotesService } from 'src/sqlSchema/votes/votes.service';
import { LoggerService } from 'src/core/logger/logger.service';

@Injectable()
export class CleanupService {
  private readonly context = 'CleanupService';

  constructor(
    private readonly postsService: PostsService,
    private readonly commentsService: CommentsService,
    private readonly votesService: VotesService,
    private readonly logger: LoggerService,
  ) {}

  @Cron('0 3 * * *')
  async handleCleanup(): Promise<void> {
    try {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const posts = await this.postsService.hardDeleteRemoved(cutoff);
      const comments = await this.commentsService.hardDeleteRemoved(cutoff);
      const votes = await this.votesService.hardDeleteRemoved(cutoff);
      this.logger.log(
        `Cleanup complete: ${posts} posts, ${comments} comments, ${votes} votes removed`,
        this.context,
      );
    } catch (error) {
      this.logger.error(
        'Cleanup failed',
        error instanceof Error ? error.stack : String(error),
        this.context,
      );
    }
  }
}
