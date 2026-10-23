export class Reservation {
  id: string;
  tableId: string;
  customerName: string;
  partySize: number;
  startTime: string; // ISO timestamp
  durationMinutes: number;
  status: 'confirmed' | 'cancelled';
  createdAt: string;
}
