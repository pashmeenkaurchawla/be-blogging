import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
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

  async findPaginatedByPost(
    postId: number,
    options: { page: number; limit: number; status: CommentStatus; authorId?: number },
  ): Promise<{ data: Comment[]; total: number }> {
    const where: Record<string, unknown> = {
      postId,
      status: options.status,
    };
    if (options.authorId) {
      where.authorId = options.authorId;
    }
    const [data, total] = await this.repository.findAndCount({
      where,
      order: { id: 'DESC' },
      skip: (options.page - 1) * options.limit,
      take: options.limit,
    });
    return { data, total };
  }

  async findByCursorByPost(
    postId: number,
    options: { cursor?: number; limit: number; status: CommentStatus; authorId?: number },
  ): Promise<{ data: Comment[]; hasMore: boolean; nextCursor: number | null }> {
    const qb = this.repository
      .createQueryBuilder('comment')
      .where('comment.postId = :postId', { postId })
      .andWhere('comment.status = :status', { status: options.status });

    if (options.authorId) {
      qb.andWhere('comment.authorId = :authorId', { authorId: options.authorId });
    }
    if (options.cursor) {
      qb.andWhere('comment.id < :cursor', { cursor: options.cursor });
    }

    qb.orderBy('comment.id', 'DESC').take(options.limit + 1);

    const results = await qb.getMany();
    const hasMore = results.length > options.limit;
    const data = hasMore ? results.slice(0, options.limit) : results;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return { data, hasMore, nextCursor };
  }

  async softDelete(id: number, authorId: number): Promise<Comment> {
    const comment = await this.findById(id);
    if (!comment) {
      throw new BadRequestException(`Comment with id=${id} not found`);
    }
    if (comment.authorId !== authorId) {
      throw new ForbiddenException('You can only delete your own comments');
    }
    comment.status = CommentStatus.REMOVED;
    return this.repository.save(comment);
  }
}
