import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { getBelgradeDate } from "./today";
import { calculateRental } from "./pricing";
import { BookingError } from "./repository";
import type { UpdateBookingInput } from "./schema";

const dateOnly = (date: Date) => date.toISOString().slice(0, 10);

function editEventDetails(changes: {
  oldStart: string; oldEnd: string; newStart: string; newEnd: string;
  customerChanged: boolean; equipmentChanged: boolean; priceOld: number; priceNew: number;
  notesChanged: boolean; discountChanged: boolean;
}) {
  const details = [
    changes.oldStart !== changes.newStart || changes.oldEnd !== changes.newEnd
      ? "Даты: " + changes.oldStart + "–" + changes.oldEnd + " → " + changes.newStart + "–" + changes.newEnd
      : "",
    changes.customerChanged ? "Клиент изменён" : "",
    changes.equipmentChanged ? "Состав/условия снаряжения изменены" : "",
    changes.discountChanged ? "Скидка изменена" : "",
    changes.priceOld !== changes.priceNew
      ? "Стоимость: " + changes.priceOld + " → " + changes.priceNew + " RSD"
      : "",
    changes.notesChanged ? "Примечание изменено" : "",
  ].filter(Boolean).join("; ");
  return details || "Данные аренды подтверждены";
}

/**
 * Adjust a reserved rental or extend an issued rental.
 * All inventory checks, payment checks, line changes and audit history are committed atomically.
 */
export async function updateBookingRecord(
  input: UpdateBookingInput,
  actorId: string,
  today = getBelgradeDate(),
): Promise<void> {
  const { id, version, values } = input;
  const db = getDb();
  const start = new Date(values.startDate + "T00:00:00.000Z");
  const end = new Date(values.endDate + "T00:00:00.000Z");
  const equipmentIds = values.items.map((item) => item.equipmentId);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await db.$transaction(async (tx) => {
        const booking = await tx.booking.findUnique({
          where: { id },
          select: {
            version: true, archivedAt: true, status: true, customerId: true,
            startDate: true, endDate: true, travelDay: true, discountPercent: true,
            discountAmount: true, subtotal: true, total: true, notes: true,
            items: {
              select: {
                id: true, equipmentId: true, equipmentCode: true, equipmentName: true,
                dailyRate: true, complimentary: true, amount: true,
              },
            },
          },
        });
        if (!booking) throw new BookingError("conflict");
        if (booking.version !== version) throw new BookingError("conflict");
        if (booking.archivedAt || (booking.status !== "RESERVED" && booking.status !== "ISSUED")) {
          throw new BookingError("notEditable");
        }

        const oldStart = dateOnly(booking.startDate);
        const oldEnd = dateOnly(booking.endDate);
        const oldItems = new Map(booking.items.map((item) => [item.equipmentId, item]));
        const issued = booking.status === "ISSUED";
        if (issued) {
          const sameItems = values.items.length === booking.items.length &&
            values.items.every((item) =>
              oldItems.get(item.equipmentId)?.complimentary === item.complimentary);
          if (!sameItems || values.customerId !== booking.customerId ||
            values.startDate !== oldStart || values.travelDay !== booking.travelDay ||
            values.endDate < oldEnd || values.endDate < today) {
            throw new BookingError("issuedRestriction");
          }
        }

        const customer = await tx.customer.findUnique({
          where: { id: values.customerId }, select: { id: true, mergedIntoId: true },
        });
        if (!customer || customer.mergedIntoId) throw new BookingError("customerMissing");

        const equipment = await tx.equipment.findMany({
          where: { id: { in: equipmentIds } },
          select: { id: true, code: true, name: true, status: true, dailyRate: true },
        });
        if (equipment.length !== equipmentIds.length) throw new BookingError("equipmentUnavailable");

        const byId = new Map(equipment.map((item) => [item.id, item]));
        if (values.items.some((item) => {
          const record = byId.get(item.equipmentId);
          return !record || (!oldItems.has(item.equipmentId) && record.status !== "READY");
        })) throw new BookingError("equipmentUnavailable");

        // Dates are inclusive. An unreturned rental can block a unit even after
        // its planned return date. Exclude the rental being edited.
        const overlapping = await tx.bookingItem.findFirst({
          where: {
            equipmentId: { in: equipmentIds },
            booking: {
              id: { not: id },
              archivedAt: null,
              OR: [
                {
                  status: { in: ["RESERVED", "ISSUED"] },
                  startDate: { lte: end },
                  endDate: { gte: start },
                },
                { status: "ISSUED", endDate: { lt: new Date(today + "T00:00:00.000Z") } },
              ],
            },
          },
          select: { id: true },
        });
        if (overlapping) throw new BookingError("datesUnavailable");

        const selected = values.items.map((item) => {
          const record = byId.get(item.equipmentId);
          if (!record) throw new BookingError("equipmentUnavailable");
          const previous = oldItems.get(item.equipmentId);
          return {
            equipmentId: item.equipmentId,
            equipmentCode: previous?.equipmentCode ?? record.code,
            equipmentName: previous?.equipmentName ?? record.name,
            // Keep the price originally agreed for equipment that stays in this booking.
            dailyRate: previous?.dailyRate ?? record.dailyRate,
            complimentary: item.complimentary,
          };
        });

        let pricing: ReturnType<typeof calculateRental>;
        try {
          pricing = calculateRental({
            startDate: values.startDate,
            endDate: values.endDate,
            travelDay: values.travelDay,
            discountPercent: values.discountPercent,
            discountFixed: values.discountFixed,
            items: selected,
          });
        } catch (error) {
          if (error instanceof Error && error.message === "DISCOUNT_EXCEEDS_SUBTOTAL") {
            throw new BookingError("discountExceedsTotal");
          }
          if (error instanceof Error && error.message === "AMOUNT_TOO_LARGE") {
            throw new BookingError("amountTooLarge");
          }
          throw new BookingError("invalid");
        }

        const totals = await tx.payment.groupBy({
          by: ["kind"],
          where: { bookingId: id },
          _sum: { amount: true },
        });
        const netPaid = totals.reduce((sum, payment) =>
          sum + (payment.kind === "PAYMENT" ? 1 : -1) * (payment._sum.amount ?? 0), 0);
        if (pricing.total < netPaid) throw new BookingError("refundRequired");

        const changedEquipment = booking.items.length !== selected.length ||
          selected.some((item) => {
            const previous = oldItems.get(item.equipmentId);
            return !previous || previous.complimentary !== item.complimentary;
          });
        const details = editEventDetails({
          oldStart, oldEnd, newStart: values.startDate, newEnd: values.endDate,
          customerChanged: values.customerId !== booking.customerId,
          equipmentChanged: changedEquipment,
          priceOld: booking.total, priceNew: pricing.total,
          notesChanged: booking.notes !== values.notes,
          discountChanged: booking.discountPercent !== values.discountPercent ||
            booking.discountAmount !== pricing.discountAmount,
        });

        // Optimistic revision is the serialization point for concurrent payments,
        // returns and edits on this same rental.
        const updated = await tx.booking.updateMany({
          where: { id, version, status: booking.status, archivedAt: null },
          data: {
            customerId: values.customerId,
            startDate: start,
            endDate: end,
            travelDay: values.travelDay,
            discountPercent: values.discountPercent,
            paidDays: pricing.paidDays,
            subtotal: pricing.subtotal,
            discountAmount: pricing.discountAmount,
            total: pricing.total,
            notes: values.notes,
            version: { increment: 1 },
          },
        });
        if (updated.count !== 1) throw new BookingError("conflict");

        const removedIds = booking.items
          .filter((item) => !equipmentIds.includes(item.equipmentId))
          .map((item) => item.id);
        if (removedIds.length) {
          await tx.bookingItem.deleteMany({ where: { id: { in: removedIds }, bookingId: id } });
        }
        for (let index = 0; index < selected.length; index += 1) {
          const item = selected[index];
          const previous = oldItems.get(item.equipmentId);
          const payload = {
            equipmentCode: item.equipmentCode,
            equipmentName: item.equipmentName,
            dailyRate: item.dailyRate,
            complimentary: item.complimentary,
            amount: pricing.lines[index].amount,
          };
          if (previous) {
            await tx.bookingItem.update({ where: { id: previous.id }, data: payload });
          } else {
            await tx.bookingItem.create({
              data: { bookingId: id, equipmentId: item.equipmentId, ...payload },
            });
          }
        }

        await tx.bookingEvent.create({
          data: {
            bookingId: id,
            actorId,
            kind: values.endDate > oldEnd ? "EXTENDED" : "UPDATED",
            details,
            bookingVersion: version + 1,
          },
        });
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 15000,
      });
      return;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        if (attempt < 2) continue;
        throw new BookingError("busy");
      }
      throw error;
    }
  }
}
