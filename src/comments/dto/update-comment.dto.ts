import { IsOptional, IsString, MaxLength, IsIn } from 'class-validator';
import { CommentStatus } from '../../sqlSchema/utils/enums/comment-status.enum';

export class UpdateCommentDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @IsOptional()
  @IsIn([CommentStatus.ACTIVE, CommentStatus.ARCHIVED])
  status?: number;
}
