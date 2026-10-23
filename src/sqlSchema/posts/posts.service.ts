import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository, DeepPartial } from 'typeorm';
import { BaseResourceService } from 'src/sqlSchema/base-resource-service';
import { Post } from 'src/sqlSchema/posts/posts.entity';
import { PostStatus } from 'src/sqlSchema/utils/enums/post-status.enum';
import { RedisService } from 'src/core/database/redis/redis.service';
import { LoggerService } from 'src/core/logger/logger.service';

@Injectable()
export class PostsService extends BaseResourceService<Post> {
  constructor(
    @InjectRepository(Post)
    private readonly postsRepository: Repository<Post>,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {
    super(postsRepository);
  }

  async findByIdOrFail(id: number): Promise<Post> {
    const post = await this.findById(id);
    if (!post) {
      throw new NotFoundException(`Post with id=${id} not found`);
    }
    return post;
  }

  async findActiveById(
    id: number,
    includeArchived = false,
  ): Promise<Post | { id: number; status: string; message: string }> {
    const post = await this.findByIdOrFail(id);

    if (post.status === PostStatus.REMOVED) {
      return {
        id: post.id,
        status: 'DELETED',
        message: 'This post has been removed',
      };
    }
    if (post.status === PostStatus.ARCHIVED && !includeArchived) {
      throw new NotFoundException(`Post with id=${id} not found`);
    }
    return post;
  }

  async createForUser(
    authorId: number,
    data: DeepPartial<Post>,
  ): Promise<Post> {
    const post = await this.create({ ...data, authorId });
    await this.purgeUserCache(authorId);
    this.logger.log(`Post created: ${post.id} by user ${authorId}`, 'PostsService');
    return post;
  }

  async updateOwned(
    id: number,
    authorId: number,
    data: DeepPartial<Post>,
  ): Promise<Post> {
    const post = await this.findByIdOrFail(id);
    if (post.authorId !== authorId) {
      throw new ForbiddenException('You can only update your own posts');
    }
    const updated = await this.update(id, data);
    await this.purgeUserCache(authorId);
    this.logger.log(`Post updated: ${id} by user ${authorId}`, 'PostsService');
    return updated;
  }

  async softDelete(id: number, authorId: number): Promise<void> {
    const post = await this.findByIdOrFail(id);
    if (post.authorId !== authorId) {
      throw new ForbiddenException('You can only delete your own posts');
    }
    post.status = PostStatus.REMOVED;
    await this.repository.save(post);
    await this.purgeUserCache(authorId);
    this.logger.log(`Post deleted: ${id} by user ${authorId}`, 'PostsService');
  }

  async findByAuthor(authorId: number): Promise<Post[]> {
    return this.repository.find({ where: { authorId } });
  }

  private resolveStatus(status: string): PostStatus {
    return status === 'archived' ? PostStatus.ARCHIVED : PostStatus.ACTIVE;
  }

  async findPaginatedCached(
    userId: number,
    query: {
      page: number;
      limit: number;
      status: string;
      authorId?: number;
      cacheTtl?: number;
    },
  ): Promise<{
    data: Post[];
    meta: { page: number; limit: number; total: number };
  }> {
    const statusNum = this.resolveStatus(query.status);
    const authorKey = query.authorId ?? 'all';

    if (query.page === 1) {
      const cacheKey = `posts:v1:${userId}:${query.status}:${authorKey}:p1`;
      const cached = await this.cacheGet<{
        data: Post[];
        meta: { page: number; limit: number; total: number };
      }>(cacheKey);
      if (cached) return cached;

      const result = await this.queryPaginated(
        query.page,
        query.limit,
        statusNum,
        query.authorId,
      );
      await this.cacheSet(cacheKey, result, userId, query.cacheTtl);
      return result;
    }

    return this.queryPaginated(
      query.page,
      query.limit,
      statusNum,
      query.authorId,
    );
  }

  async findByCursorCached(
    userId: number,
    query: {
      cursor?: number;
      limit: number;
      status: string;
      authorId?: number;
      cacheTtl?: number;
    },
  ): Promise<{
    data: Post[];
    meta: { nextCursor: number | null; hasMore: boolean };
  }> {
    const statusNum = this.resolveStatus(query.status);
    const authorKey = query.authorId ?? 'all';

    if (!query.cursor) {
      const cacheKey = `posts:v2:${userId}:${query.status}:${authorKey}:first`;
      const cached = await this.cacheGet<{
        data: Post[];
        meta: { nextCursor: number | null; hasMore: boolean };
      }>(cacheKey);
      if (cached) return cached;

      const result = await this.queryCursor(
        query.limit,
        statusNum,
        query.authorId,
      );
      await this.cacheSet(cacheKey, result, userId, query.cacheTtl);
      return result;
    }

    return this.queryCursor(
      query.limit,
      statusNum,
      query.authorId,
      query.cursor,
    );
  }

  private async queryPaginated(
    page: number,
    limit: number,
    status: PostStatus,
    authorId?: number,
  ): Promise<{
    data: Post[];
    meta: { page: number; limit: number; total: number };
  }> {
    const where: Record<string, unknown> = { status };
    if (authorId) where.authorId = authorId;

    const [data, total] = await this.repository.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { id: 'DESC' },
    });
    return { data, meta: { page, limit, total } };
  }

  private async queryCursor(
    limit: number,
    status: PostStatus,
    authorId?: number,
    cursor?: number,
  ): Promise<{
    data: Post[];
    meta: { nextCursor: number | null; hasMore: boolean };
  }> {
    const where: Record<string, unknown> = { status };
    if (authorId) where.authorId = authorId;
    if (cursor) where.id = LessThan(cursor);

    const results = await this.repository.find({
      where,
      order: { id: 'DESC' },
      take: limit + 1,
    });
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return { data, meta: { nextCursor, hasMore } };
  }

  async hardDeleteRemoved(beforeDate: Date): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .from(Post)
      .where('status = :status', { status: PostStatus.REMOVED })
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
    userId: number,
    baseTtl?: number,
  ): Promise<void> {
    const ttl = (baseTtl ?? 60) + Math.floor(Math.random() * 10);
    await this.redisService.set(key, JSON.stringify(data), ttl);
    await this.redisService.sadd(`posts:keys:${userId}`, key);
  }

  private async purgeUserCache(userId: number): Promise<void> {
    const setKey = `posts:keys:${userId}`;
    const keys = await this.redisService.smembers(setKey);
    if (keys.length > 0) {
      await this.redisService.del(...keys, setKey);
    } else {
      await this.redisService.del(setKey);
    }
  }
}
