import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { BaseResourceService } from '../base-resource-service';
import { Vote } from './vote.entity';
import { VoteStatus } from '../utils/enums/vote-status.enum';

@Injectable()
export class VotesService extends BaseResourceService<Vote> {
  constructor(
    @InjectRepository(Vote)
    private readonly votesRepository: Repository<Vote>,
  ) {
    super(votesRepository);
  }

  async findByPost(postId: number): Promise<Vote[]> {
    return this.repository.find({ where: { postId } });
  }

  async findByComment(commentId: number): Promise<Vote[]> {
    return this.repository.find({ where: { commentId } });
  }

  async upsertVote(
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
      return this.create({
        authorId,
        postId,
        commentId,
        vote: voteValue,
        status: VoteStatus.ACTIVE,
      });
    }

    if (existing.vote === voteValue) {
      existing.vote = (existing.vote * -1) as Vote['vote'];
    } else {
      existing.vote = voteValue as Vote['vote'];
    }

    return this.repository.save(existing);
  }

  async getVoteCounts(
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
}
