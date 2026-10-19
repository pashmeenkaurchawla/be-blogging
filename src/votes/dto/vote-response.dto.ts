import { Vote } from '../../sqlSchema/votes/vote.entity';
import { VoteType } from '../../sqlSchema/utils/enums/vote-type.enum';

export class VoteResponseDto {
  id: number;
  authorId: number;
  postId: number;
  commentId: number | null;
  vote: 'upvote' | 'downvote';
  createdAt: Date;

  static fromEntity(vote: Vote): VoteResponseDto {
    const dto = new VoteResponseDto();
    dto.id = vote.id;
    dto.authorId = vote.authorId;
    dto.postId = vote.postId;
    dto.commentId = vote.commentId;
    dto.vote = vote.vote === VoteType.UPVOTE ? 'upvote' : 'downvote';
    dto.createdAt = vote.createdAt;
    return dto;
  }
}

export class VoteCountsDto {
  upvotes: number;
  downvotes: number;
  total: number;
}
