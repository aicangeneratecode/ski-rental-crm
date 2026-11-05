import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";

export type PurgeErrorCode = "notFound" | "conflict" | "notArchived";
export class PurgeError extends Error {
  constructor(public readonly code: PurgeErrorCode) {
    super(code);
    this.name = "PurgeError";
  }
}

/** Irreversibly delete only an archived closed booking and its linked financial history. */
export async function purgeArchivedBooking(id: string, version: number) {
  try {
    await getDb().$transaction(async tx => {
      const booking = await tx.booking.findUnique({
        where: { id }, select: { version: true, status: true, archivedAt: true },
      });
      if (!booking) throw new PurgeError("notFound");
      if (booking.version !== version) throw new PurgeError("conflict");
      if (!booking.archivedAt || !["RETURNED", "CANCELLED"].includes(booking.status))
        throw new PurgeError("notArchived");

      // Equipment condition inspections remain independently auditable; clear the
      // now-invalid booking reference but preserve the inspection and its actor.
      await tx.equipmentMaintenance.updateMany({
        where: { bookingId: id }, data: { bookingId: null },
      });
      await tx.payment.deleteMany({ where: { bookingId: id } });
      await tx.bookingEvent.deleteMany({ where: { bookingId: id } });
      await tx.bookingItem.deleteMany({ where: { bookingId: id } });
      const result = await tx.booking.deleteMany({
        where: {
          id, version,
          status: { in: ["RETURNED", "CANCELLED"] },
          archivedAt: { not: null },
        },
      });
      if (result.count !== 1) throw new PurgeError("conflict");
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 15000,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")
      throw new PurgeError("conflict");
    throw error;
  }
}
