import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { isDeletableBookingStatus } from "@/lib/deletion/policy";

export type ArchiveOperation = "archive" | "restore";
export type ArchiveErrorCode = "notFound" | "conflict" | "activeBooking";

export class ArchiveBookingError extends Error {
  constructor(public readonly code: ArchiveErrorCode) {
    super(code);
    this.name = "ArchiveBookingError";
  }
}

/** Close-booking-only reversible archive. Payment and audit rows are never removed. */
export async function setBookingArchivedRecord(
  id: string,
  version: number,
  operation: ArchiveOperation,
  actorId: string,
): Promise<void> {
  const archived = operation === "archive";
  try {
    await getDb().$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id },
        select: { version: true, status: true, archivedAt: true },
      });
      if (!booking) throw new ArchiveBookingError("notFound");
      if (booking.version !== version || (booking.archivedAt !== null) !== !archived) {
        throw new ArchiveBookingError("conflict");
      }
      if (!isDeletableBookingStatus(booking.status)) {
        throw new ArchiveBookingError("activeBooking");
      }
      const updated = await tx.booking.updateMany({
        where: {
          id,
          version,
          status: { in: ["RETURNED", "CANCELLED"] },
          archivedAt: archived ? null : { not: null },
        },
        data: {
          archivedAt: archived ? new Date() : null,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) throw new ArchiveBookingError("conflict");

      await tx.bookingEvent.create({
        data: {
          bookingId: id,
          actorId,
          kind: archived ? "ARCHIVED" : "RESTORED",
          bookingVersion: version + 1,
        },
      });
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 15000,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new ArchiveBookingError("conflict");
    }
    throw error;
  }
}
