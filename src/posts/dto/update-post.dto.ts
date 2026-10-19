import { IsOptional, IsString, MaxLength, IsIn } from 'class-validator';
import { PostStatus } from '../../sqlSchema/utils/enums/post-status.enum';

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsIn([PostStatus.ACTIVE, PostStatus.ARCHIVED])
  status?: number;
}
