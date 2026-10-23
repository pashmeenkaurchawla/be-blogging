import { Module } from '@nestjs/common';
import { ReservationsController } from 'src/reservations/reservations.controller';
import { ReservationsService } from 'src/reservations/reservations.service';

@Module({
  controllers: [ReservationsController],
  providers: [ReservationsService],
})
export class ReservationsModule {}
