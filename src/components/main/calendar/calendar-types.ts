import type { BookingRow } from "@/lib/bookings/types";

export type CalendarRental = BookingRow & {
  customerId: string;
  createdById: string;
  createdByName: string;
  equipmentIds: string[];
  tariffs: string[];
};

export type CalendarInventory = {
  id: string;
  code: string;
  name: string;
  size: string;
  tariff: string;
  status: "READY" | "MAINTENANCE" | "ARCHIVED";
};

export type CalendarFilters = {
  equipmentId: string;
  tariff: string;
  customerId: string;
  staffId: string;
  search: string;
};

export type CalendarView = "month" | "week" | "day" | "agenda" | "board" | "occupancy";
