import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { getBelgradeDate } from "./today";
import type { BookingAction, StatusError } from "./status-schema";

export class StatusChangeError extends Error {
  constructor(public readonly code: StatusError) {
    super(code);
    this.name = "StatusChangeError";
  }
}

/** Single transactional implementation shared by the app and database integration tests. */
export async function changeBookingStatusRecord(
  id: string,
  version: number,
  action: BookingAction,
  staffId: string,
  today = getBelgradeDate(),
): Promise<void> {
  const expectedStatus = action === "return" ? "ISSUED" : "RESERVED";
  const nextStatus = action === "issue" ? "ISSUED" : action === "return" ? "RETURNED" : "CANCELLED";

  try {
    await getDb().$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id },
        select: {
          status: true,
          version: true,
          startDate: true,
          endDate: true,
          archivedAt: true,
          items: {
            select: {
              equipmentId: true,
              equipment: { select: { status: true } },
            },
          },
        },
      });

      if (!booking || booking.archivedAt ||
          booking.version !== version || booking.status !== expectedStatus) {
        throw new StatusChangeError("conflict");
      }

      if (action === "issue") {
        const start = booking.startDate.toISOString().slice(0, 10);
        const end = booking.endDate.toISOString().slice(0, 10);
        if (today < start || today > end) throw new StatusChangeError("outsideDates");
        if (booking.items.length === 0 ||
            booking.items.some((item) => item.equipment.status !== "READY")) {
          throw new StatusChangeError("equipmentUnavailable");
        }

        const stillIssued = await tx.bookingItem.findFirst({
          where: {
            equipmentId: { in: booking.items.map((item) => item.equipmentId) },
            booking: { id: { not: id }, status: "ISSUED" },
          },
          select: { id: true },
        });
        if (stillIssued) throw new StatusChangeError("stillIssued");
      }

      const result = await tx.booking.updateMany({
        where: { id, version, status: expectedStatus, archivedAt: null },
        data: { status: nextStatus, version: { increment: 1 } },
      });
      if (result.count !== 1) throw new StatusChangeError("conflict");

      await tx.bookingEvent.create({
        data: {
          bookingId: id,
          actorId: staffId,
          kind: action === "issue" ? "ISSUED" : action === "return" ? "RETURNED" : "CANCELLED",
          bookingVersion: version + 1,
        },
      });
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new StatusChangeError("conflict");
    }
    throw error;
  }
}
