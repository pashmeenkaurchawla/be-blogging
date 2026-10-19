import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreatePostDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(512)
  title: string;

  @IsNotEmpty()
  @IsString()
  content: string;
}
