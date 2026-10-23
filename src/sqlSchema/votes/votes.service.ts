import {
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { BaseResourceService } from 'src/sqlSchema/base-resource-service';
import { Vote } from 'src/sqlSchema/votes/vote.entity';
import { VoteStatus } from 'src/sqlSchema/utils/enums/vote-status.enum';
import { PostsService } from 'src/sqlSchema/posts/posts.service';
import { CommentsService } from 'src/sqlSchema/comments/comments.service';
import { LoggerService } from 'src/core/logger/logger.service';

@Injectable()
export class VotesService extends BaseResourceService<Vote> {
  constructor(
    @InjectRepository(Vote)
    private readonly votesRepository: Repository<Vote>,
    @Inject(forwardRef(() => PostsService))
    private readonly postsService: PostsService,
    @Inject(forwardRef(() => CommentsService))
    private readonly commentsService: CommentsService,
    private readonly logger: LoggerService,
  ) {
    super(votesRepository);
  }

  async findByPost(postId: number): Promise<Vote[]> {
    return this.repository.find({ where: { postId } });
  }

  async findByComment(commentId: number): Promise<Vote[]> {
    return this.repository.find({ where: { commentId } });
  }

  async voteOnPost(
    authorId: number,
    postId: number,
    voteValue: number,
  ): Promise<Vote> {
    await this.postsService.findByIdOrFail(postId);
    return this.upsertVote(authorId, postId, null, voteValue);
  }

  async voteOnComment(
    authorId: number,
    postId: number,
    commentId: number,
    voteValue: number,
  ): Promise<Vote> {
    await this.postsService.findByIdOrFail(postId);
    const comment = await this.commentsService.findById(commentId);
    if (!comment) {
      throw new NotFoundException(`Comment with id=${commentId} not found`);
    }
    if (comment.postId !== postId) {
      throw new NotFoundException(
        `Comment with id=${commentId} not found on post with id=${postId}`,
      );
    }
    return this.upsertVote(authorId, postId, commentId, voteValue);
  }

  async getPostVoteCounts(
    postId: number,
  ): Promise<{ upvotes: number; downvotes: number; total: number }> {
    await this.postsService.findByIdOrFail(postId);
    return this.getVoteCounts(postId);
  }

  async getCommentVoteCounts(
    postId: number,
    commentId: number,
  ): Promise<{ upvotes: number; downvotes: number; total: number }> {
    await this.postsService.findByIdOrFail(postId);
    const comment = await this.commentsService.findById(commentId);
    if (!comment) {
      throw new NotFoundException(`Comment with id=${commentId} not found`);
    }
    if (comment.postId !== postId) {
      throw new NotFoundException(
        `Comment with id=${commentId} not found on post with id=${postId}`,
      );
    }
    return this.getVoteCounts(postId, commentId);
  }

  private async upsertVote(
    authorId: number,
    postId: number,
    commentId: number | null,
    voteValue: number,
  ): Promise<Vote> {
    const where: FindOptionsWhere<Vote> = {
      authorId,
      postId,
      commentId: commentId === null ? IsNull() : commentId,
    } as FindOptionsWhere<Vote>;

    const existing = await this.findOne(where);

    if (!existing) {
      const vote = await this.create({
        authorId,
        postId,
        commentId,
        vote: voteValue,
        status: VoteStatus.ACTIVE,
      });
      const target = commentId ? `comment ${commentId}` : `post ${postId}`;
      this.logger.log(`Vote created: ${vote.id} on ${target} by user ${authorId}`, 'VotesService');
      return vote;
    }

    if (existing.vote === voteValue) {
      existing.vote = (existing.vote * -1) as Vote['vote'];
    } else {
      existing.vote = voteValue as Vote['vote'];
    }

    const saved = await this.repository.save(existing);
    const target = commentId ? `comment ${commentId}` : `post ${postId}`;
    this.logger.log(`Vote toggled: ${saved.id} on ${target} by user ${authorId}`, 'VotesService');
    return saved;
  }

  private async getVoteCounts(
    postId: number,
    commentId?: number | null,
  ): Promise<{ upvotes: number; downvotes: number; total: number }> {
    const qb = this.repository
      .createQueryBuilder('vote')
      .select('vote.vote', 'voteType')
      .addSelect('COUNT(*)', 'count')
      .where('vote.postId = :postId', { postId })
      .andWhere('vote.status = :status', { status: VoteStatus.ACTIVE })
      .groupBy('vote.vote');

    if (commentId !== undefined && commentId !== null) {
      qb.andWhere('vote.commentId = :commentId', { commentId });
    } else {
      qb.andWhere('vote.commentId IS NULL');
    }

    const results = await qb.getRawMany();

    let upvotes = 0;
    let downvotes = 0;

    for (const row of results) {
      const count = parseInt(row.count, 10);
      if (row.voteType === 1) {
        upvotes = count;
      } else if (row.voteType === -1) {
        downvotes = count;
      }
    }

    return { upvotes, downvotes, total: upvotes + downvotes };
  }

  async hardDeleteRemoved(beforeDate: Date): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .from(Vote)
      .where('status = :status', { status: VoteStatus.REMOVED })
      .andWhere('updatedAt < :beforeDate', { beforeDate })
      .execute();
    return result.affected || 0;
  }
}
