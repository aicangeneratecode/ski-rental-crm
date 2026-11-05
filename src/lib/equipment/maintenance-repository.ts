import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";

export type InspectionKind = "INSPECTION" | "SERVICE" | "DAMAGE";
export type InspectionCondition = "OK" | "NEEDS_SERVICE" | "DAMAGED";
export type MaintenanceFailure = "conflict" | "issued" | "archived" | "missing";
export class MaintenanceError extends Error {
  constructor(public readonly code: MaintenanceFailure) { super(code); }
}

export type InspectionInput = {
  equipmentId: string;
  version: number;
  kind: InspectionKind;
  condition: InspectionCondition;
  note: string;
};

export async function recordEquipmentInspection(input: InspectionInput, actorId: string) {
  const db = getDb();
  for (let attempt=0; attempt<3; attempt++) {
    try {
      await db.$transaction(async tx => {
        const equipment = await tx.equipment.findUnique({
          where: { id: input.equipmentId },
          select: { id: true, version: true, status: true },
        });
        if (!equipment) throw new MaintenanceError("missing");
        if (equipment.version !== input.version) throw new MaintenanceError("conflict");
        if (equipment.status === "ARCHIVED") throw new MaintenanceError("archived");
        const issued = await tx.bookingItem.findFirst({
          where: { equipmentId: input.equipmentId, booking: { status: "ISSUED" } },
          select: { id: true },
        });
        if (issued) throw new MaintenanceError("issued");
        const status = input.condition === "OK" ? "READY" : "MAINTENANCE";
        const changed = await tx.equipment.updateMany({
          where: { id: input.equipmentId, version: input.version, status: { not: "ARCHIVED" } },
          data: { status, version: { increment: 1 } },
        });
        if (changed.count !== 1) throw new MaintenanceError("conflict");
        await tx.equipmentMaintenance.create({
          data: {
            equipmentId: input.equipmentId, actorId,
            kind: input.kind, condition: input.condition, note: input.note,
          },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait:5000, timeout:12000 });
      return;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        if (attempt<2) continue;
        throw new MaintenanceError("conflict");
      }
      throw error;
    }
  }
}
