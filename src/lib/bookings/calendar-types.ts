import type { BookingRow } from "./types";

export type CalendarEquipment = {
  id: string;
  code: string;
  name: string;
  size: string;
  status: "READY" | "MAINTENANCE" | "ARCHIVED";
  bookings: BookingRow[];
};