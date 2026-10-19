import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { BaseResourceService } from '../base-resource-service';
import { Comment } from './comment.entity';
import { CommentStatus } from '../utils/enums/comment-status.enum';

@Injectable()
export class CommentsService extends BaseResourceService<Comment> {
  constructor(
    @InjectRepository(Comment)
    private readonly commentsRepository: Repository<Comment>,
  ) {
    super(commentsRepository);
  }

  async create(data: DeepPartial<Comment>): Promise<Comment> {
    if (data.parentCommentId) {
      const parent = await this.findById(data.parentCommentId as number);
      if (parent && parent.parentCommentId !== null) {
        throw new BadRequestException(
          'Only single-level nesting is allowed',
        );
      }
    }
    return super.create(data);
  }

  async findByPost(postId: number): Promise<Comment[]> {
    return this.repository.find({ where: { postId } });
  }

  async hardDeleteRemoved(beforeDate: Date): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .from(Comment)
      .where('status = :status', { status: CommentStatus.REMOVED })
      .andWhere('updatedAt < :beforeDate', { beforeDate })
      .execute();
    return result.affected || 0;
  }
}
