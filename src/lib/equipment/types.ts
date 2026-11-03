import type { EquipmentInput } from "./schema";

export interface EquipmentBooking {
  id: string;
  startDate: string;
  endDate: string;
  status: "RESERVED" | "ISSUED";
  customerName: string;
  customerPhone: string;
}

export interface EquipmentRow extends EquipmentInput {
  id: string;
  version: number;
  bookings: EquipmentBooking[];
}
export type SaveResult =
  | { ok: true }
  | {
      ok: false;
      error: "invalid" | "duplicate" | "conflict" | "database" | "authRequired";
    };
