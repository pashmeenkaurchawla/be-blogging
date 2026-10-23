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
  Version,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/core/auth/jwt-auth.guard';
import { CurrentUser } from 'src/core/auth/current-user.decorator';
import { CommentsService } from 'src/sqlSchema/comments/comments.service';
import { CreateCommentDto } from 'src/modules/comments/dto/create-comment.dto';
import { UpdateCommentDto } from 'src/modules/comments/dto/update-comment.dto';
import { CommentResponseDto } from 'src/modules/comments/dto/comment-response.dto';
import {
  OffsetPaginationDto,
  CursorPaginationDto,
} from 'src/modules/comments/dto/comment-pagination.dto';

@Controller('posts/:postId/comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  async create(
    @Param('postId', ParseIntPipe) postId: number,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: { id: number; userName: string },
  ) {
    const comment = await this.commentsService.createForPost(
      postId,
      user.id,
      dto,
    );
    return CommentResponseDto.fromEntity(comment);
  }

  @Post(':commentId')
  async reply(
    @Param('postId', ParseIntPipe) postId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: { id: number; userName: string },
  ) {
    const comment = await this.commentsService.replyToComment(
      postId,
      commentId,
      user.id,
      dto,
    );
    return CommentResponseDto.fromEntity(comment);
  }

  @Get(':commentId')
  async findOne(
    @Param('postId', ParseIntPipe) postId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Query('include') include?: string,
  ) {
    const result = await this.commentsService.findByIdForPost(
      commentId,
      postId,
      include === 'archived',
    );
    if ('message' in result) return result;
    return CommentResponseDto.fromEntity(result);
  }

  @Get()
  async findAllOffset(
    @Param('postId', ParseIntPipe) postId: number,
    @Query() query: OffsetPaginationDto,
    @CurrentUser() user: { id: number; userName: string },
  ) {
    const { data, meta } = await this.commentsService.findPaginatedCached(
      user.id,
      postId,
      query,
    );
    return { data: data.map(CommentResponseDto.fromEntity), meta };
  }

  @Get()
  @Version('2')
  async findAllCursor(
    @Param('postId', ParseIntPipe) postId: number,
    @Query() query: CursorPaginationDto,
    @CurrentUser() user: { id: number; userName: string },
  ) {
    const { data, meta } = await this.commentsService.findByCursorCached(
      user.id,
      postId,
      query,
    );
    return { data: data.map(CommentResponseDto.fromEntity), meta };
  }

  @Patch(':commentId')
  async update(
    @Param('postId', ParseIntPipe) postId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: { id: number; userName: string },
  ) {
    const updated = await this.commentsService.updateOwned(
      commentId,
      postId,
      user.id,
      dto,
    );
    return CommentResponseDto.fromEntity(updated);
  }

  @Delete(':commentId')
  async remove(
    @Param('postId', ParseIntPipe) postId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @CurrentUser() user: { id: number; userName: string },
  ) {
    await this.commentsService.softDelete(commentId, user.id, postId);
    return { message: 'Comment deleted' };
  }
}
