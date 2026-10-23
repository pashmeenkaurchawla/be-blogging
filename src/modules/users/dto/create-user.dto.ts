import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  @MaxLength(255)
  name: string;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value?.trim()?.toLowerCase())
  @Matches(/^[a-zA-Z0-9_]+$/)
  @MinLength(3)
  @MaxLength(255)
  userName: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(255)
  password: string;
}
