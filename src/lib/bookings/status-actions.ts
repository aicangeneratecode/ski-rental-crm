"use server";

import { revalidatePath } from "next/cache";
import { classifyDatabaseError, logDatabaseError } from "@/lib/db-errors";
import { getStaffSession } from "@/lib/require-staff";

import {
  changeBookingStatusSchema,
  type StatusResult,
} from "./status-schema";
import { StatusChangeError, changeBookingStatusRecord } from "./status-repository";

export async function changeBookingStatus(input: unknown): Promise<StatusResult> {
  const session = await getStaffSession();
  if (!session) return { ok: false, error: "authRequired" };
  const parsed = changeBookingStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  try {
    const { id, version, action, reason } = parsed.data;
    await changeBookingStatusRecord(id, version, action, session.user.id, undefined, reason);
  } catch (error) {
    if (error instanceof StatusChangeError) return { ok: false, error: error.code };
    logDatabaseError("changeBookingStatus", error);
    return { ok: false, error: classifyDatabaseError(error) };
  }

  for (const path of ["/bookings", "/customers", "/equipment", "/calendar", "/"]) {
    revalidatePath(path);
  }
  return { ok: true };
}
