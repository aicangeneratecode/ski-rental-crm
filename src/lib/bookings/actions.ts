"use server";

import { revalidatePath } from "next/cache";

import { getStaffSession } from "@/lib/require-staff";
import { classifyDatabaseError, logDatabaseError } from "@/lib/db-errors";

import {
  BookingError,
  createBookingRecord,
} from "./repository";
import {
  createBookingSchema,
  type CreateBookingResult,
} from "./schema";

export async function createBooking(
  input: unknown,
): Promise<CreateBookingResult> {
  const session = await getStaffSession();

  if (!session) {
    return { ok: false, error: "authRequired" };
  }

  const parsed = createBookingSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: "invalid" };
  }

  let id: string;

  try {
    id = await createBookingRecord(
      parsed.data,
      session.user.id,
    );
  } catch (error) {
    if (error instanceof BookingError) {
      return { ok: false, error: error.code };
    }

    logDatabaseError("createBooking", error);
    return { ok: false, error: classifyDatabaseError(error) };
  }

  revalidatePath("/bookings");
  revalidatePath("/customers");
  revalidatePath("/");
  revalidatePath("/calendar");
  return { ok: true, id };
}