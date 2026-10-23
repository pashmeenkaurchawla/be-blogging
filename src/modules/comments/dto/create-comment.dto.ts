import { IsNotEmpty, IsString, MaxLength, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCommentDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(5000)
  content: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  parentCommentId?: number;
}
