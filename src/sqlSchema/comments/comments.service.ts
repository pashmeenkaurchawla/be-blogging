import {
  Inject,
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { BaseResourceService } from 'src/sqlSchema/base-resource-service';
import { Comment } from 'src/sqlSchema/comments/comment.entity';
import { CommentStatus } from 'src/sqlSchema/utils/enums/comment-status.enum';
import { RedisService } from 'src/core/database/redis/redis.service';
import { PostsService } from 'src/sqlSchema/posts/posts.service';
import { LoggerService } from 'src/core/logger/logger.service';

@Injectable()
export class CommentsService extends BaseResourceService<Comment> {
  constructor(
    @InjectRepository(Comment)
    private readonly commentsRepository: Repository<Comment>,
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => PostsService))
    private readonly postsService: PostsService,
    private readonly logger: LoggerService,
  ) {
    super(commentsRepository);
  }

  async createForPost(
    postId: number,
    authorId: number,
    dto: { content: string; parentCommentId?: number },
  ): Promise<Comment> {
    await this.postsService.findByIdOrFail(postId);
    const comment = await this.create({
      content: dto.content,
      authorId,
      postId,
      parentCommentId: dto.parentCommentId,
    });
    await this.purgeCache(postId);
    this.logger.log(`Comment created: ${comment.id} on post ${postId} by user ${authorId}`, 'CommentsService');
    return comment;
  }

  async replyToComment(
    postId: number,
    commentId: number,
    authorId: number,
    dto: { content: string },
  ): Promise<Comment> {
    await this.postsService.findByIdOrFail(postId);
    const comment = await this.create({
      content: dto.content,
      authorId,
      postId,
      parentCommentId: commentId,
    });
    await this.purgeCache(postId);
    this.logger.log(`Reply created: ${comment.id} to comment ${commentId} on post ${postId}`, 'CommentsService');
    return comment;
  }

  async create(data: DeepPartial<Comment>): Promise<Comment> {
    if (data.parentCommentId) {
      const parent = await this.findById(data.parentCommentId as number);
      if (parent && parent.parentCommentId !== null) {
        throw new BadRequestException('Only single-level nesting is allowed');
      }
    }
    return super.create(data);
  }

  async findByIdForPost(
    commentId: number,
    postId: number,
    includeArchived = false,
  ): Promise<Comment | { id: number; status: string; message: string }> {
    const comment = await this.findById(commentId);
    if (!comment || comment.postId !== postId) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.status === CommentStatus.REMOVED) {
      return {
        id: comment.id,
        status: 'DELETED',
        message: 'This comment has been removed',
      };
    }
    if (comment.status === CommentStatus.ARCHIVED && !includeArchived) {
      throw new NotFoundException('Comment not found');
    }
    return comment;
  }

  async updateOwned(
    commentId: number,
    postId: number,
    authorId: number,
    data: DeepPartial<Comment>,
  ): Promise<Comment> {
    const comment = await this.findById(commentId);
    if (!comment || comment.postId !== postId) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.authorId !== authorId) {
      throw new ForbiddenException('You can only edit your own comments');
    }
    const updated = await this.update(commentId, data);
    await this.purgeCache(postId);
    this.logger.log(`Comment updated: ${commentId} by user ${authorId}`, 'CommentsService');
    return updated;
  }

  async softDelete(
    id: number,
    authorId: number,
    postId?: number,
  ): Promise<Comment> {
    const comment = await this.findById(id);
    if (!comment) {
      throw new NotFoundException(`Comment with id=${id} not found`);
    }
    if (comment.authorId !== authorId) {
      throw new ForbiddenException('You can only delete your own comments');
    }
    comment.status = CommentStatus.REMOVED;
    const saved = await this.repository.save(comment);
    await this.purgeCache(postId ?? comment.postId);
    this.logger.log(`Comment deleted: ${id} by user ${authorId}`, 'CommentsService');
    return saved;
  }

  private resolveStatus(status: string): CommentStatus {
    return status === 'archived'
      ? CommentStatus.ARCHIVED
      : CommentStatus.ACTIVE;
  }

  async findPaginatedCached(
    userId: number,
    postId: number,
    query: {
      page: number;
      limit: number;
      status: string;
      authorId?: number;
      cacheTtl?: number;
    },
  ): Promise<{
    data: Comment[];
    meta: { page: number; limit: number; total: number };
  }> {
    await this.postsService.findByIdOrFail(postId);
    const statusValue = this.resolveStatus(query.status);

    if (query.page === 1) {
      const cacheKey = `comments:v1:${userId}:${postId}:${query.status}:p${query.page}`;
      const cached = await this.cacheGet<{
        data: Comment[];
        meta: { page: number; limit: number; total: number };
      }>(cacheKey);
      if (cached) return cached;

      const result = await this.queryPaginated(
        postId,
        query.page,
        query.limit,
        statusValue,
        query.authorId,
      );
      await this.cacheSet(cacheKey, result, postId, query.cacheTtl);
      return result;
    }

    return this.queryPaginated(
      postId,
      query.page,
      query.limit,
      statusValue,
      query.authorId,
    );
  }

  async findByCursorCached(
    userId: number,
    postId: number,
    query: {
      cursor?: number;
      limit: number;
      status: string;
      authorId?: number;
      cacheTtl?: number;
    },
  ): Promise<{
    data: Comment[];
    meta: { nextCursor: number | null; hasMore: boolean };
  }> {
    await this.postsService.findByIdOrFail(postId);
    const statusValue = this.resolveStatus(query.status);

    if (!query.cursor) {
      const cacheKey = `comments:v2:${userId}:${postId}:${query.status}:first`;
      const cached = await this.cacheGet<{
        data: Comment[];
        meta: { nextCursor: number | null; hasMore: boolean };
      }>(cacheKey);
      if (cached) return cached;

      const result = await this.queryCursor(
        postId,
        query.limit,
        statusValue,
        query.authorId,
      );
      await this.cacheSet(cacheKey, result, postId, query.cacheTtl);
      return result;
    }

    return this.queryCursor(
      postId,
      query.limit,
      statusValue,
      query.authorId,
      query.cursor,
    );
  }

  private async queryPaginated(
    postId: number,
    page: number,
    limit: number,
    status: CommentStatus,
    authorId?: number,
  ): Promise<{
    data: Comment[];
    meta: { page: number; limit: number; total: number };
  }> {
    const where: Record<string, unknown> = { postId, status };
    if (authorId) where.authorId = authorId;

    const [data, total] = await this.repository.findAndCount({
      where,
      order: { id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, meta: { page, limit, total } };
  }

  private async queryCursor(
    postId: number,
    limit: number,
    status: CommentStatus,
    authorId?: number,
    cursor?: number,
  ): Promise<{
    data: Comment[];
    meta: { nextCursor: number | null; hasMore: boolean };
  }> {
    const qb = this.repository
      .createQueryBuilder('comment')
      .where('comment.postId = :postId', { postId })
      .andWhere('comment.status = :status', { status });

    if (authorId) {
      qb.andWhere('comment.authorId = :authorId', { authorId });
    }
    if (cursor) {
      qb.andWhere('comment.id < :cursor', { cursor });
    }

    qb.orderBy('comment.id', 'DESC').take(limit + 1);

    const results = await qb.getMany();
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return { data, meta: { nextCursor, hasMore } };
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

  private async cacheGet<T>(key: string): Promise<T | null> {
    const cached = await this.redisService.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  private async cacheSet(
    key: string,
    data: unknown,
    postId: number,
    baseTtl?: number,
  ): Promise<void> {
    const ttl = (baseTtl ?? 60) + Math.floor(Math.random() * 10);
    await this.redisService.set(key, JSON.stringify(data), ttl);
    await this.redisService.sadd(`comments:keys:${postId}`, key);
  }

  private async purgeCache(postId: number): Promise<void> {
    const setKey = `comments:keys:${postId}`;
    const keys = await this.redisService.smembers(setKey);
    if (keys.length > 0) {
      await this.redisService.del(...keys, setKey);
    } else {
      await this.redisService.del(setKey);
    }
  }
}
