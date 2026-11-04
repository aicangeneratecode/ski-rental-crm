"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
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
  | "activeBooking"
  | "database";
export type DeleteRecordResult =
  | { ok: true }
  | { ok: false; error: DeleteRecordError };

export function isDeletableBookingStatus(status: string): boolean {
  return status === "RETURNED" || status === "CANCELLED";
}

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

        const booking = await tx.booking.findUnique({
          where: { id },
          select: { version: true, status: true },
        });
        if (!booking) reject("notFound");
        if (booking.version !== version) reject("conflict");
        if (!isDeletableBookingStatus(booking.status)) reject("activeBooking");

        // Delete the complete closed-booking record atomically. This erases
        // its payments and audit events; the confirmation UI warns explicitly.
        await tx.payment.deleteMany({ where: { bookingId: id } });
        await tx.bookingEvent.deleteMany({ where: { bookingId: id } });
        await tx.bookingItem.deleteMany({ where: { bookingId: id } });
        const removed = await tx.booking.deleteMany({
          where: { id, version, status: { in: ["RETURNED", "CANCELLED"] } },
        });
        if (removed.count !== 1) reject("conflict");
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
          error: kind === "customer" ? "linkedCustomer"
            : kind === "equipment" ? "linkedEquipment" : "conflict",
        };
      }
      if (error.code === "P2034") return { ok: false, error: "conflict" };
    }
    return { ok: false, error: "database" };
  }

  for (const path of ["/customers", "/equipment", "/bookings", "/calendar", "/"]) {
    revalidatePath(path);
  }
  return { ok: true };
}
