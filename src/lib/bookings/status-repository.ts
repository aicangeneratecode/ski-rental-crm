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
  reason = "",
): Promise<void> {
  const expectedStatus = action === "return" ? "ISSUED" : "RESERVED";
  const nextStatus = action === "issue" ? "ISSUED" : action === "return" ? "RETURNED" : "CANCELLED";

  for (let attempt = 0; attempt < 3; attempt += 1) {
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
        if (today > end) throw new StatusChangeError("outsideDates");
        if (today < start) {
          // One-day early pickup only, by explicit reason and with stock availability.
          const previousDay = new Date(Date.parse(start + "T00:00:00Z") - 86_400_000)
            .toISOString().slice(0, 10);
          if (today < previousDay) throw new StatusChangeError("outsideDates");
          if (reason.trim().length < 8) throw new StatusChangeError("earlyReasonRequired");
        }
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
        if (today < start) {
          const otherReservationToday = await tx.bookingItem.findFirst({
            where: {
              equipmentId: { in: booking.items.map((item) => item.equipmentId) },
              booking: {
                id: { not: id },
                status: "RESERVED",
                startDate: { lte: new Date(today + "T00:00:00Z") },
                endDate: { gte: new Date(today + "T00:00:00Z") },
              },
            },
            select: { id: true },
          });
          if (otherReservationToday) throw new StatusChangeError("equipmentReservedToday");
        }
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
          details: action === "issue" && today < booking.startDate.toISOString().slice(0, 10)
            ? "Досрочная выдача " + today + ". Причина: " + reason.trim()
            : "",
        },
      });
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000,
    });
      return;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        if (attempt < 2) continue;
        throw new StatusChangeError("conflict");
      }
      throw error;
    }
  }
}
