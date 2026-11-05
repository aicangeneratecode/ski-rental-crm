import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { classifyDatabaseError, logDatabaseError } from "@/lib/db-errors";
import { saveEquipmentSchema } from "./schema";
import type { SaveResult } from "./types";
export async function saveEquipmentRecord(input: unknown): Promise<SaveResult> {
  const parsed = saveEquipmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { id, version, values } = parsed.data;
  try {
    const db = getDb();
    if (id) {
      const updated = await db.equipment.updateMany({
        where: { id, version },
        data: { ...values, version: { increment: 1 } },
      });
      if (!updated.count) return { ok: false, error: "conflict" };
    } else {
      await db.equipment.create({ data: values });
    }
    return { ok: true };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return { ok: false, error: "duplicate" };
    logDatabaseError("saveEquipment", error);
    return { ok: false, error: classifyDatabaseError(error) };
  }
}
