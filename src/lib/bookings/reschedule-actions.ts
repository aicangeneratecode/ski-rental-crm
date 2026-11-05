"use server";

import { revalidatePath } from "next/cache";
import { getStaffSession } from "@/lib/require-staff";
import { classifyDatabaseError, logDatabaseError } from "@/lib/db-errors";
import { BookingError, type BookingErrorCode } from "./repository";
import { rescheduleBookingRecord, rescheduleSchema } from "./reschedule-repository";

export type RescheduleResult =
  | { ok: true }
  | { ok: false; error: BookingErrorCode };

export async function rescheduleBooking(input: unknown): Promise<RescheduleResult> {
  const staff = await getStaffSession();
  if (!staff) return { ok: false, error: "authRequired" };
  const parsed = rescheduleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  try {
    await rescheduleBookingRecord(parsed.data, staff.user.id);
  } catch (error) {
    if (error instanceof BookingError) return { ok: false, error: error.code };
    logDatabaseError("rescheduleBooking", error);
    return { ok: false, error: classifyDatabaseError(error) };
  }
  for (const path of ["/bookings", "/calendar", "/customers", "/equipment", "/"]) {
    revalidatePath(path);
  }
  return { ok: true };
}
