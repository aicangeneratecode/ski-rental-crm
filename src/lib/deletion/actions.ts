"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { classifyDatabaseError, logDatabaseError } from "@/lib/db-errors";
import { getStaffSession } from "@/lib/require-staff";

const deleteRecordSchema = z.object({
  kind: z.enum(["customer", "equipment", "booking"]),
  id: z.uuid(),
  version: z.number().int().positive(),
});

export type RecordKind = z.infer<typeof deleteRecordSchema>["kind"];
export type DeleteRecordError =
  | "authRequired"
  | "invalid"
  | "notFound"
  | "conflict"
  | "linkedCustomer"
  | "linkedEquipment"
  | "notArchived"
  | "schemaOutdated"
  | "databaseUnavailable"
  | "database";
export type DeleteRecordResult =
  | { ok: true }
  | { ok: false; error: DeleteRecordError };

class DeleteRejected extends Error {
  constructor(public readonly reason: DeleteRecordError) {
    super(reason);
  }
}

function reject(reason: DeleteRecordError): never {
  throw new DeleteRejected(reason);
}

export async function deleteRecord(input: unknown): Promise<DeleteRecordResult> {
  const staff = await getStaffSession();
  if (!staff) return { ok: false, error: "authRequired" };

  const parsed = deleteRecordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { kind, id, version } = parsed.data;

  try {
    await getDb().$transaction(
      async (tx) => {
        if (kind === "customer") {
          const customer = await tx.customer.findUnique({
            where: { id },
            select: { version: true },
          });
          if (!customer) reject("notFound");
          if (customer.version !== version) reject("conflict");
          if (await tx.booking.count({ where: { customerId: id } })) {
            reject("linkedCustomer");
          }
          const removed = await tx.customer.deleteMany({ where: { id, version } });
          if (removed.count !== 1) reject("conflict");
          return;
        }

        if (kind === "booking") {
          const booking = await tx.booking.findUnique({
            where: { id },
            select: { status: true, version: true, archivedAt: true },
          });
          if (!booking) reject("notFound");
          if (booking.version !== version) reject("conflict");
          if (!booking.archivedAt || !["RETURNED", "CANCELLED"].includes(booking.status)) {
            reject("notArchived");
          }
          // Deleting an archive record is deliberately irreversible; financial
          // payments and the rental's action log are removed together.
          // Equipment inspections remain independently auditable.
          await tx.equipmentMaintenance.updateMany({
            where: { bookingId: id }, data: { bookingId: null },
          });
          await tx.payment.deleteMany({ where: { bookingId: id } });
          await tx.bookingEvent.deleteMany({ where: { bookingId: id } });
          await tx.bookingItem.deleteMany({ where: { bookingId: id } });
          const removed = await tx.booking.deleteMany({
            where: { id, version, status: { in: ["RETURNED", "CANCELLED"] }, archivedAt: { not: null } },
          });
          if (removed.count !== 1) reject("conflict");
          return;
        }

        if (kind === "equipment") {
          const item = await tx.equipment.findUnique({
            where: { id },
            select: { version: true },
          });
          if (!item) reject("notFound");
          if (item.version !== version) reject("conflict");
          // Even completed or cancelled rentals remain references to the item.
          if (await tx.bookingItem.count({ where: { equipmentId: id } })) {
            reject("linkedEquipment");
          }
          const removed = await tx.equipment.deleteMany({ where: { id, version } });
          if (removed.count !== 1) reject("conflict");
          return;
        }


      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 15000,
      },
    );
  } catch (error) {
    if (error instanceof DeleteRejected) return { ok: false, error: error.reason };
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003") {
        return {
          ok: false,
          error: kind === "customer" ? "linkedCustomer" : kind === "equipment" ? "linkedEquipment" : "conflict",
        };
      }
      if (error.code === "P2034") return { ok: false, error: "conflict" };
    }
    logDatabaseError("deleteRecord", error);
    return { ok: false, error: classifyDatabaseError(error) };
  }

  for (const path of ["/customers", "/equipment", "/bookings", "/calendar", "/"]) {
    revalidatePath(path);
  }
  return { ok: true };
}
