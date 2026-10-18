import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { Reservation } from './entities/reservation.entity';

/**
 * In-memory store, scoped per table. This is where a real system would use
 * Redis (fast-path lock) + a DB unique constraint / transaction (source of
 * truth). Locally we only have one process, so a simple per-key async
 * mutex is enough to demonstrate the same "don't double-book this table"
 * guarantee without a database.
 */
@Injectable()
export class ReservationsService {
  private reservations = new Map<string, Reservation>();

  // One lock promise per tableId, so requests for *different* tables never
  // block each other, but two requests for the *same* table are serialized.
  private tableLocks = new Map<string, Promise<unknown>>();

  private async withTableLock<T>(
    tableId: string,
    fn: () => Promise<T> | T,
  ): Promise<T> {
    const previous = this.tableLocks.get(tableId) ?? Promise.resolve();

    let release: () => void;
    const current = new Promise<void>((resolve) => (release = resolve));
    this.tableLocks.set(
      tableId,
      previous.then(() => current),
    );

    await previous;
    try {
      return await fn();
    } finally {
      release!();
    }
  }

  findAll(): Reservation[] {
    return Array.from(this.reservations.values()).sort((a, b) =>
      a.startTime.localeCompare(b.startTime),
    );
  }

  findOne(id: string): Reservation {
    const reservation = this.reservations.get(id);
    if (!reservation) {
      throw new NotFoundException(`Reservation ${id} not found`);
    }
    return reservation;
  }

  async create(dto: CreateReservationDto): Promise<Reservation> {
    const start = new Date(dto.startTime).getTime();
    if (Number.isNaN(start)) {
      throw new BadRequestException('startTime must be a valid ISO date');
    }
    const end = start + dto.durationMinutes * 60_000;

    // Everything that reads-then-writes the same table's bookings has to
    // happen inside the lock, otherwise two requests can both pass the
    // overlap check before either one writes.
    return this.withTableLock(dto.tableId, () => {
      const overlapping = this.findOverlapping(dto.tableId, start, end);
      if (overlapping) {
        throw new ConflictException(
          `Table ${dto.tableId} is already booked for ${overlapping.customerName} ` +
            `at ${overlapping.startTime} (overlaps requested slot)`,
        );
      }

      const reservation: Reservation = {
        id: randomUUID(),
        tableId: dto.tableId,
        customerName: dto.customerName,
        partySize: dto.partySize,
        startTime: dto.startTime,
        durationMinutes: dto.durationMinutes,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
      };
      this.reservations.set(reservation.id, reservation);
      return reservation;
    });
  }

  cancel(id: string): Reservation {
    const reservation = this.findOne(id);
    reservation.status = 'cancelled';
    return reservation;
  }

  private findOverlapping(
    tableId: string,
    start: number,
    end: number,
  ): Reservation | undefined {
    return Array.from(this.reservations.values()).find((r) => {
      if (r.tableId !== tableId || r.status === 'cancelled') return false;
      const rStart = new Date(r.startTime).getTime();
      const rEnd = rStart + r.durationMinutes * 60_000;
      return start < rEnd && end > rStart; // classic interval-overlap check
    });
  }
}
