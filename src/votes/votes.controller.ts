import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  Version,
} from '@nestjs/common';
import { JwtAuthGuard } from '../core/auth/jwt-auth.guard';
import { CurrentUser } from '../core/auth/current-user.decorator';
import { VotesService } from '../sqlSchema/votes/votes.service';
import { PostsService } from '../sqlSchema/posts/posts.service';
import { CommentsService } from '../sqlSchema/comments/comments.service';
import { CreateVoteDto } from './dto/create-vote.dto';
import { VoteResponseDto, VoteCountsDto } from './dto/vote-response.dto';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class VotesController {
  constructor(
    private readonly votesService: VotesService,
    private readonly postsService: PostsService,
    private readonly commentsService: CommentsService,
  ) {}

  @Post(':postId/votes')
  @Version('1')
  async voteOnPost(
    @CurrentUser() user: { id: number; userName: string },
    @Param('postId', ParseIntPipe) postId: number,
    @Body() dto: CreateVoteDto,
  ): Promise<VoteResponseDto> {
    const post = await this.postsService.findById(postId);
    if (!post) {
      throw new NotFoundException(`Post with id=${postId} not found`);
    }
    const vote = await this.votesService.upsertVote(user.id, postId, null, dto.vote);
    return VoteResponseDto.fromEntity(vote);
  }

  @Post(':postId/comments/:commentId/votes')
  @Version('1')
  async voteOnComment(
    @CurrentUser() user: { id: number; userName: string },
    @Param('postId', ParseIntPipe) postId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() dto: CreateVoteDto,
  ): Promise<VoteResponseDto> {
    const post = await this.postsService.findById(postId);
    if (!post) {
      throw new NotFoundException(`Post with id=${postId} not found`);
    }
    const comment = await this.commentsService.findById(commentId);
    if (!comment) {
      throw new NotFoundException(`Comment with id=${commentId} not found`);
    }
    if (comment.postId !== postId) {
      throw new NotFoundException(`Comment with id=${commentId} not found on post with id=${postId}`);
    }
    const vote = await this.votesService.upsertVote(user.id, postId, commentId, dto.vote);
    return VoteResponseDto.fromEntity(vote);
  }

  @Get(':postId/votes')
  @Version('1')
  async getPostVoteCounts(
    @Param('postId', ParseIntPipe) postId: number,
  ): Promise<VoteCountsDto> {
    const post = await this.postsService.findById(postId);
    if (!post) {
      throw new NotFoundException(`Post with id=${postId} not found`);
    }
    return this.votesService.getVoteCounts(postId);
  }

  @Get(':postId/comments/:commentId/votes')
  @Version('1')
  async getCommentVoteCounts(
    @Param('postId', ParseIntPipe) postId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
  ): Promise<VoteCountsDto> {
    const post = await this.postsService.findById(postId);
    if (!post) {
      throw new NotFoundException(`Post with id=${postId} not found`);
    }
    const comment = await this.commentsService.findById(commentId);
    if (!comment) {
      throw new NotFoundException(`Comment with id=${commentId} not found`);
    }
    if (comment.postId !== postId) {
      throw new NotFoundException(`Comment with id=${commentId} not found on post with id=${postId}`);
    }
    return this.votesService.getVoteCounts(postId, commentId);
  }
}
