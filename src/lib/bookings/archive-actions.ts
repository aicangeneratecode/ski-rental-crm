"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { classifyDatabaseError, logDatabaseError } from "@/lib/db-errors";
import { getStaffSession } from "@/lib/require-staff";
import { ArchiveBookingError, setBookingArchivedRecord } from "./archive-repository";

const schema = z.object({
  id: z.uuid(),
  version: z.number().int().positive(),
  operation: z.enum(["archive", "restore"]),
});

export type ArchiveBookingResult =
  | { ok: true }
  | { ok: false; error: "authRequired" | "invalid" | "notFound" | "conflict" | "activeBooking" | "schemaOutdated" | "databaseUnavailable" | "database" };

export async function changeBookingArchive(input: unknown): Promise<ArchiveBookingResult> {
  const staff = await getStaffSession();
  if (!staff) return { ok: false, error: "authRequired" };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const { id, version, operation } = parsed.data;
  try {
    await setBookingArchivedRecord(id, version, operation, staff.user.id);
  } catch (error) {
    if (error instanceof ArchiveBookingError) return { ok: false, error: error.code };
    logDatabaseError("changeBookingArchive", error);
    return { ok: false, error: classifyDatabaseError(error) };
  }

  for (const path of ["/", "/bookings", "/calendar", "/customers", "/equipment"]) {
    revalidatePath(path);
  }
  return { ok: true };
}
