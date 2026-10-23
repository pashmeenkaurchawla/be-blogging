import { IsOptional, IsNumber, IsIn, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class OffsetPaginationDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit: number = 5;

  @IsOptional()
  @IsIn(['active', 'archived'])
  status: string = 'active';

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  authorId?: number;
}

export class CursorPaginationDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  cursor?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit: number = 5;

  @IsOptional()
  @IsIn(['active', 'archived'])
  status: string = 'active';

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  authorId?: number;
}
