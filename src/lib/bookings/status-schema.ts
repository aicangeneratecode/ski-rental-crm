import { z } from "zod";

export const changeBookingStatusSchema = z.object({
  id: z.uuid(),
  version: z.number().int().positive(),
  action: z.enum(["issue", "return", "cancel"]),
  reason: z.string().trim().max(500).default(""),
});

export type BookingAction = z.infer<
  typeof changeBookingStatusSchema
>["action"];

export type StatusError =
  | "authRequired"
  | "invalid"
  | "conflict"
  | "outsideDates"
  | "earlyReasonRequired"
  | "equipmentReservedToday"
  | "equipmentUnavailable"
  | "stillIssued"
  | "schemaOutdated"
  | "databaseUnavailable"
  | "database";

export type StatusResult =
  | { ok: true }
  | { ok: false; error: StatusError };