import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Version,
  UseGuards,
  ParseIntPipe,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import Redis from 'ioredis';
import { PostsService } from '../sqlSchema/posts/posts.service';
import { RedisService } from '../core/database/redis/redis.service';
import { JwtAuthGuard } from '../core/auth/jwt-auth.guard';
import { CurrentUser } from '../core/auth/current-user.decorator';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostResponseDto } from './dto/post-response.dto';
import { OffsetPaginationDto } from './dto/post-pagination.dto';
import { CursorPaginationDto } from './dto/post-pagination.dto';
import { PostStatus } from '../sqlSchema/utils/enums/post-status.enum';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  private readonly redis: Redis;

  constructor(
    private readonly postsService: PostsService,
    private readonly redisService: RedisService,
  ) {
    this.redis = this.redisService.getClient();
  }

  @Post()
  @Version('1')
  async create(
    @CurrentUser() user: { id: number; userName: string },
    @Body() dto: CreatePostDto,
  ) {
    const post = await this.postsService.create({
      ...dto,
      authorId: user.id,
    });
    await this.purgeUserCache(user.id);
    return PostResponseDto.fromEntity(post);
  }

  @Get(':id')
  @Version('1')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('include') include?: string,
  ) {
    const post = await this.postsService.findById(id);
    if (!post) {
      throw new NotFoundException(`Post with id=${id} not found`);
    }
    if (post.status === PostStatus.REMOVED) {
      return { id: post.id, status: 'DELETED', message: 'This post has been removed' };
    }
    if (post.status === PostStatus.ARCHIVED && include !== 'archived') {
      throw new NotFoundException(`Post with id=${id} not found`);
    }
    return PostResponseDto.fromEntity(post);
  }

  @Get()
  @Version('1')
  async findAllOffset(
    @CurrentUser() user: { id: number; userName: string },
    @Query() query: OffsetPaginationDto,
  ) {
    const statusNum = query.status === 'active'
      ? PostStatus.ACTIVE
      : PostStatus.ARCHIVED;
    const authorKey = query.authorId ?? 'all';

    if (query.page === 1) {
      const cacheKey = `posts:v1:${user.id}:${query.status}:${authorKey}:p1`;
      const cached = await this.cacheGet(cacheKey);
      if (cached) return cached;

      const { data, total } = await this.postsService.findPaginated({
        page: query.page,
        limit: query.limit,
        status: statusNum,
        authorId: query.authorId,
      });
      const result = {
        data: data.map(PostResponseDto.fromEntity),
        meta: { page: query.page, limit: query.limit, total },
      };
      await this.cacheSet(cacheKey, result, user.id);
      return result;
    }

    const { data, total } = await this.postsService.findPaginated({
      page: query.page,
      limit: query.limit,
      status: statusNum,
      authorId: query.authorId,
    });
    return {
      data: data.map(PostResponseDto.fromEntity),
      meta: { page: query.page, limit: query.limit, total },
    };
  }

  @Get()
  @Version('2')
  async findAllCursor(
    @CurrentUser() user: { id: number; userName: string },
    @Query() query: CursorPaginationDto,
  ) {
    const statusNum = query.status === 'active'
      ? PostStatus.ACTIVE
      : PostStatus.ARCHIVED;
    const authorKey = query.authorId ?? 'all';

    if (!query.cursor) {
      const cacheKey = `posts:v2:${user.id}:${query.status}:${authorKey}:first`;
      const cached = await this.cacheGet(cacheKey);
      if (cached) return cached;

      const { data, hasMore } = await this.postsService.findByCursor({
        limit: query.limit,
        status: statusNum,
        authorId: query.authorId,
      });
      const lastItem = data[data.length - 1];
      const result = {
        data: data.map(PostResponseDto.fromEntity),
        meta: { nextCursor: lastItem?.id ?? null, hasMore },
      };
      await this.cacheSet(cacheKey, result, user.id);
      return result;
    }

    const { data, hasMore } = await this.postsService.findByCursor({
      cursor: query.cursor,
      limit: query.limit,
      status: statusNum,
      authorId: query.authorId,
    });
    const lastItem = data[data.length - 1];
    return {
      data: data.map(PostResponseDto.fromEntity),
      meta: { nextCursor: lastItem?.id ?? null, hasMore },
    };
  }

  @Patch(':id')
  @Version('1')
  async update(
    @CurrentUser() user: { id: number; userName: string },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePostDto,
  ) {
    const post = await this.postsService.findById(id);
    if (!post) {
      throw new NotFoundException(`Post with id=${id} not found`);
    }
    if (post.authorId !== user.id) {
      throw new ForbiddenException('You can only update your own posts');
    }
    const updated = await this.postsService.update(id, dto);
    await this.purgeUserCache(user.id);
    return PostResponseDto.fromEntity(updated);
  }

  @Delete(':id')
  @Version('1')
  async remove(
    @CurrentUser() user: { id: number; userName: string },
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.postsService.softDelete(id, user.id);
    await this.purgeUserCache(user.id);
    return { message: 'Post deleted' };
  }

  private async cacheGet(key: string): Promise<unknown | null> {
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  private async cacheSet(key: string, data: unknown, userId: number): Promise<void> {
    const ttl = 60 + Math.floor(Math.random() * 10);
    await this.redis.set(key, JSON.stringify(data), 'EX', ttl);
    await this.redis.sadd(`posts:keys:${userId}`, key);
  }

  private async purgeUserCache(userId: number): Promise<void> {
    const setKey = `posts:keys:${userId}`;
    const keys = await this.redis.smembers(setKey);
    if (keys.length > 0) {
      await this.redis.del(...keys, setKey);
    } else {
      await this.redis.del(setKey);
    }
  }
}
