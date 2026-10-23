import { Vote } from 'src/sqlSchema/votes/vote.entity';
import { VoteType } from 'src/sqlSchema/utils/enums/vote-type.enum';

const VOTE_LABELS: Record<number, 'upvote' | 'downvote'> = {
  [VoteType.UPVOTE]: 'upvote',
  [VoteType.DOWNVOTE]: 'downvote',
};

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
    dto.vote = VOTE_LABELS[vote.vote];
    dto.createdAt = vote.createdAt;
    return dto;
  }
}

export class VoteCountsDto {
  upvotes: number;
  downvotes: number;
  total: number;
}
