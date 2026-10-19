import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
  NotFoundException,
  ForbiddenException,
  Version,
} from '@nestjs/common';
import { JwtAuthGuard } from '../core/auth/jwt-auth.guard';
import { CurrentUser } from '../core/auth/current-user.decorator';
import { CommentsService } from '../sqlSchema/comments/comments.service';
import { PostsService } from '../sqlSchema/posts/posts.service';
import { RedisService } from '../core/database/redis/redis.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentResponseDto } from './dto/comment-response.dto';
import {
  OffsetPaginationDto,
  CursorPaginationDto,
} from './dto/comment-pagination.dto';
import { CommentStatus } from '../sqlSchema/utils/enums/comment-status.enum';

@Controller('posts/:postId/comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly postsService: PostsService,
    private readonly redisService: RedisService,
  ) {}

  @Post()
  @Version('1')
  async create(
    @Param('postId', ParseIntPipe) postId: number,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: { id: number; userName: string },
  ) {
    await this.verifyPostExists(postId);
    const comment = await this.commentsService.create({
      ...dto,
      authorId: user.id,
      postId,
    });
    await this.purgeCache(postId);
    return CommentResponseDto.fromEntity(comment);
  }

  @Post(':commentId')
  @Version('1')
  async reply(
    @Param('postId', ParseIntPipe) postId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: { id: number; userName: string },
  ) {
    await this.verifyPostExists(postId);
    const comment = await this.commentsService.create({
      content: dto.content,
      authorId: user.id,
      postId,
      parentCommentId: commentId,
    });
    await this.purgeCache(postId);
    return CommentResponseDto.fromEntity(comment);
  }

  @Get(':commentId')
  @Version('1')
  async findOne(
    @Param('postId', ParseIntPipe) postId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Query('include') include?: string,
  ) {
    await this.verifyPostExists(postId);
    const comment = await this.commentsService.findById(commentId);
    if (!comment || comment.postId !== postId) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.status === CommentStatus.REMOVED) {
      return { id: comment.id, status: 'DELETED', message: 'This comment has been removed' };
    }
    if (comment.status === CommentStatus.ARCHIVED && include !== 'archived') {
      throw new NotFoundException('Comment not found');
    }
    return CommentResponseDto.fromEntity(comment);
  }

  @Get()
  @Version('1')
  async findAllOffset(
    @Param('postId', ParseIntPipe) postId: number,
    @Query() query: OffsetPaginationDto,
    @CurrentUser() user: { id: number; userName: string },
  ) {
    await this.verifyPostExists(postId);
    const statusValue = query.status === 'archived'
      ? CommentStatus.ARCHIVED
      : CommentStatus.ACTIVE;

    const cacheKey = `comments:v1:${user.id}:${postId}:${query.status}:p${query.page}`;
    if (query.page === 1) {
      const cached = await this.cacheGet(cacheKey);
      if (cached) return cached;
    }

    const { data, total } = await this.commentsService.findPaginatedByPost(
      postId,
      { page: query.page, limit: query.limit, status: statusValue, authorId: query.authorId },
    );
    const result = {
      data: data.map(CommentResponseDto.fromEntity),
      meta: { page: query.page, limit: query.limit, total },
    };

    if (query.page === 1) {
      await this.cacheSet(cacheKey, result, postId);
    }
    return result;
  }

  @Get()
  @Version('2')
  async findAllCursor(
    @Param('postId', ParseIntPipe) postId: number,
    @Query() query: CursorPaginationDto,
    @CurrentUser() user: { id: number; userName: string },
  ) {
    await this.verifyPostExists(postId);
    const statusValue = query.status === 'archived'
      ? CommentStatus.ARCHIVED
      : CommentStatus.ACTIVE;

    const isFirstPage = !query.cursor;
    const cacheKey = `comments:v2:${user.id}:${postId}:${query.status}:first`;
    if (isFirstPage) {
      const cached = await this.cacheGet(cacheKey);
      if (cached) return cached;
    }

    const { data, hasMore, nextCursor } = await this.commentsService.findByCursorByPost(
      postId,
      { cursor: query.cursor, limit: query.limit, status: statusValue, authorId: query.authorId },
    );
    const result = {
      data: data.map(CommentResponseDto.fromEntity),
      meta: { nextCursor, hasMore },
    };

    if (isFirstPage) {
      await this.cacheSet(cacheKey, result, postId);
    }
    return result;
  }

  @Patch(':commentId')
  @Version('1')
  async update(
    @Param('postId', ParseIntPipe) postId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: { id: number; userName: string },
  ) {
    await this.verifyPostExists(postId);
    const comment = await this.commentsService.findById(commentId);
    if (!comment || comment.postId !== postId) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.authorId !== user.id) {
      throw new ForbiddenException('You can only edit your own comments');
    }
    const updated = await this.commentsService.update(commentId, dto);
    await this.purgeCache(postId);
    return CommentResponseDto.fromEntity(updated);
  }

  @Delete(':commentId')
  @Version('1')
  async remove(
    @Param('postId', ParseIntPipe) postId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @CurrentUser() user: { id: number; userName: string },
  ) {
    await this.verifyPostExists(postId);
    await this.commentsService.softDelete(commentId, user.id);
    await this.purgeCache(postId);
    return { message: 'Comment deleted' };
  }

  private async verifyPostExists(postId: number): Promise<void> {
    const post = await this.postsService.findById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }
  }

  private async cacheGet(key: string): Promise<unknown | null> {
    const cached = await this.redisService.getClient().get(key);
    return cached ? JSON.parse(cached) : null;
  }

  private async cacheSet(key: string, data: unknown, postId: number): Promise<void> {
    const ttl = 60 + Math.floor(Math.random() * 10);
    const client = this.redisService.getClient();
    await client.set(key, JSON.stringify(data), 'EX', ttl);
    await client.sadd(`comments:keys:${postId}`, key);
  }

  private async purgeCache(postId: number): Promise<void> {
    const client = this.redisService.getClient();
    const keys = await client.smembers(`comments:keys:${postId}`);
    if (keys.length > 0) {
      await client.del(...keys);
    }
    await client.del(`comments:keys:${postId}`);
  }
}
