import { IsOptional, IsIn, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class OffsetPaginationDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(50)
  limit: number = 5;

  @IsOptional()
  @IsIn(['active', 'archived'])
  status: string = 'active';

  @IsOptional()
  @Type(() => Number)
  authorId?: number;
}

export class CursorPaginationDto {
  @IsOptional()
  @Type(() => Number)
  cursor?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(50)
  limit: number = 5;

  @IsOptional()
  @IsIn(['active', 'archived'])
  status: string = 'active';

  @IsOptional()
  @Type(() => Number)
  authorId?: number;
}
