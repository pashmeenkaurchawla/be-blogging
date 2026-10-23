import { Comment } from 'src/sqlSchema/comments/comment.entity';
import { CommentStatus } from 'src/sqlSchema/utils/enums/comment-status.enum';

const STATUS_LABELS: Record<number, string> = {
  [CommentStatus.ACTIVE]: 'ACTIVE',
  [CommentStatus.ARCHIVED]: 'ARCHIVED',
  [CommentStatus.REMOVED]: 'DELETED',
};

export class CommentResponseDto {
  id: number;
  authorId: number;
  postId: number;
  parentCommentId: number | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  status: string;

  static fromEntity(comment: Comment): CommentResponseDto {
    const dto = new CommentResponseDto();
    dto.id = comment.id;
    dto.authorId = comment.authorId;
    dto.postId = comment.postId;
    dto.parentCommentId = comment.parentCommentId;
    dto.content = comment.content;
    dto.createdAt = comment.createdAt;
    dto.updatedAt = comment.updatedAt;
    dto.status = STATUS_LABELS[comment.status] ?? 'UNKNOWN';
    return dto;
  }
}
