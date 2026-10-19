import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
