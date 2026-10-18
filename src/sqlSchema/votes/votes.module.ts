import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vote } from './vote.entity';
import { VotesService } from './votes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Vote])],
  providers: [VotesService],
  exports: [VotesService],
})
export class VotesModule {}
