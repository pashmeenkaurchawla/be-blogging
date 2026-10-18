import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseResourceService } from '../base-resource-service';
import { Vote } from './vote.entity';

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
}
