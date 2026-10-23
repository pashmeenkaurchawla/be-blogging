import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  Version,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/core/auth/jwt-auth.guard';
import { CurrentUser } from 'src/core/auth/current-user.decorator';
import { VotesService } from 'src/sqlSchema/votes/votes.service';
import { CreateVoteDto } from 'src/modules/votes/dto/create-vote.dto';
import {
  VoteResponseDto,
  VoteCountsDto,
} from 'src/modules/votes/dto/vote-response.dto';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class VotesController {
  constructor(private readonly votesService: VotesService) {}

  @Post(':postId/votes')
  @Version('1')
  async voteOnPost(
    @CurrentUser() user: { id: number; userName: string },
    @Param('postId', ParseIntPipe) postId: number,
    @Body() dto: CreateVoteDto,
  ): Promise<VoteResponseDto> {
    const vote = await this.votesService.voteOnPost(user.id, postId, dto.vote);
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
    const vote = await this.votesService.voteOnComment(
      user.id,
      postId,
      commentId,
      dto.vote,
    );
    return VoteResponseDto.fromEntity(vote);
  }

  @Get(':postId/votes')
  @Version('1')
  async getPostVoteCounts(
    @Param('postId', ParseIntPipe) postId: number,
  ): Promise<VoteCountsDto> {
    return this.votesService.getPostVoteCounts(postId);
  }

  @Get(':postId/comments/:commentId/votes')
  @Version('1')
  async getCommentVoteCounts(
    @Param('postId', ParseIntPipe) postId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
  ): Promise<VoteCountsDto> {
    return this.votesService.getCommentVoteCounts(postId, commentId);
  }
}
