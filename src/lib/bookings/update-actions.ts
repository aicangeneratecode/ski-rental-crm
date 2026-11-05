"use server";

import { revalidatePath } from "next/cache";
import { classifyDatabaseError, logDatabaseError } from "@/lib/db-errors";
import { getStaffSession } from "@/lib/require-staff";
import { BookingError } from "./repository";
import { updateBookingSchema, type UpdateBookingResult } from "./schema";
import { updateBookingRecord } from "./update-repository";

export async function updateBooking(input: unknown): Promise<UpdateBookingResult> {
  const staff = await getStaffSession();
  if (!staff) return { ok: false, error: "authRequired" };

  const parsed = updateBookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  try {
    await updateBookingRecord(parsed.data, staff.user.id);
  } catch (error) {
    if (error instanceof BookingError) return { ok: false, error: error.code };
    logDatabaseError("updateBooking", error);
    return { ok: false, error: classifyDatabaseError(error) };
  }
  for (const path of ["/bookings", "/calendar", "/equipment", "/customers", "/"]) {
    revalidatePath(path);
  }
  return { ok: true };
}
