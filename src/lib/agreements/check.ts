"use server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getStaffSession } from "@/lib/require-staff";

export async function checkAgreementVersion(input: unknown): Promise<boolean> {
  try {
    if (!(await getStaffSession())) return false;
    const parsed = z
      .object({ id: z.uuid(), version: z.number().int().positive() })
      .safeParse(input);
    if (!parsed.success) return false;
    const booking = await getDb().booking.findUnique({
      where: { id: parsed.data.id },
      select: { version: true, status: true },
    });
    return (
      !!booking &&
      booking.status !== "CANCELLED" &&
      booking.version === parsed.data.version
    );
  } catch {
    return false;
  }
}
