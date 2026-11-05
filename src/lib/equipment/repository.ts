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
      const current = await db.equipment.findUnique({
        where: { id },
        select: { status: true, version: true },
      });
      if (!current || current.version !== version) return { ok: false, error: "conflict" };
      if (values.status !== "READY" && current.status !== values.status) {
        const issued = await db.bookingItem.findFirst({
          where: { equipmentId: id, booking: { status: "ISSUED" } },
          select: { id: true },
        });
        if (issued) return { ok: false, error: "issued" };
      }
      if (values.status === "READY" && current.status !== "READY") {
        const latest = await db.equipmentMaintenance.findFirst({
          where: { equipmentId: id },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: { kind: true, condition: true },
        });
        if (current.status === "MAINTENANCE" || latest && latest.condition !== "OK") {
          return { ok: false, error: "inspectionRequired" };
        }
      }
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
