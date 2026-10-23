import { IsInt, IsISO8601, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateReservationDto {
  @IsString()
  @IsNotEmpty()
  tableId: string;

  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsInt()
  @Min(1)
  partySize: number;

  @IsISO8601()
  startTime: string;

  @IsInt()
  @Min(15)
  durationMinutes: number;
}
