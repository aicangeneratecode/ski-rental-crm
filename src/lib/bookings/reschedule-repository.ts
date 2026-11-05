import { z } from "zod";
import { getDb } from "@/lib/db";
import { BookingError } from "./repository";
import { createBookingSchema } from "./schema";
import { updateBookingRecord } from "./update-repository";

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
});
export const rescheduleSchema = z.object({
  id: z.uuid(),
  version: z.number().int().positive(),
  startDate: dateOnlySchema,
});
export type RescheduleInput = z.infer<typeof rescheduleSchema>;
export function shiftRentalDates(startDate: string, endDate: string, nextStart: string) {
  const duration = (Date.parse(endDate + "T00:00:00Z") - Date.parse(startDate + "T00:00:00Z")) / 86_400_000;
  if (!Number.isInteger(duration) || duration < 0 || duration > 365) throw new BookingError("invalid");
  const date = new Date(Date.parse(nextStart + "T00:00:00Z") + duration * 86_400_000);
  if (!Number.isFinite(date.getTime())) throw new BookingError("invalid");
  return { startDate: nextStart, endDate: date.toISOString().slice(0, 10) };
}

/** Shift a reserved booking without changing its equipment, duration, customer or discounts. */
export async function rescheduleBookingRecord(input: RescheduleInput, actorId: string): Promise<void> {
  const old = await getDb().booking.findUnique({
    where: { id: input.id },
    select: {
      id: true, version: true, status: true, archivedAt: true,
      customerId: true, startDate: true, endDate: true,
      travelDay: true, discountPercent: true, discountAmount: true, notes: true,
      items: { select: { equipmentId: true, complimentary: true } },
    },
  });
  if (!old || old.version !== input.version) throw new BookingError("conflict");
  if (old.archivedAt || old.status !== "RESERVED") throw new BookingError("notEditable");
  const from = old.startDate.toISOString().slice(0, 10);
  const to = old.endDate.toISOString().slice(0, 10);
  if (from === input.startDate) throw new BookingError("invalid");
  const { startDate, endDate } = shiftRentalDates(from, to, input.startDate);
  const values = createBookingSchema.parse({
    customerId: old.customerId,
    startDate, endDate,
    travelDay: old.travelDay,
    discountPercent: old.discountPercent,
    discountFixed: old.discountPercent === 0 ? old.discountAmount : 0,
    notes: old.notes,
    items: old.items.map(item => ({
      equipmentId: item.equipmentId, complimentary: item.complimentary,
    })),
  });
  // Uses the same serializable transaction, inventory conflict detection, payment
  // guards, and append-only rental event as normal edits.
  await updateBookingRecord({ id: old.id, version: old.version, values }, actorId);
}
