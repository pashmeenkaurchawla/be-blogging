import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @IsString()
  @Transform(({ value }) => value?.trim()?.toLowerCase())
  @Matches(/^[a-zA-Z0-9_]+$/)
  @MinLength(3)
  @MaxLength(255)
  userName: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(255)
  password: string;
}
