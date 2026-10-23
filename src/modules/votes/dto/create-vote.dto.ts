import { IsNotEmpty, IsIn } from 'class-validator';

export class CreateVoteDto {
  @IsNotEmpty()
  @IsIn([1, -1])
  vote: number;
}
