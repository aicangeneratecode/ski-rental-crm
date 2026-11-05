import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";

import { calculateRental } from "./pricing";
import type { BookingErrorCode, CreateBookingInput } from "./schema";

export class BookingError extends Error {
  constructor(public readonly code: BookingErrorCode) {
    super(code);
    this.name = "BookingError";
  }
}

export async function createBookingRecord(
  values: CreateBookingInput,
  staffId: string,
): Promise<string> {
  const db = getDb();

  const startDate = new Date(`${values.startDate}T00:00:00.000Z`);
  const endDate = new Date(`${values.endDate}T00:00:00.000Z`);

  const equipmentIds = values.items.map((item) => item.equipmentId);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.$transaction(
        async (tx) => {
          const customer = await tx.customer.findUnique({
            where: { id: values.customerId },
            select: { id: true },
          });

          if (!customer) {
            throw new BookingError("customerMissing");
          }

          const equipment = await tx.equipment.findMany({
            where: {
              id: { in: equipmentIds },
            },
            select: {
              id: true,
              code: true,
              name: true,
              dailyRate: true,
              status: true,
            },
          });

          if (
            equipment.length !== equipmentIds.length ||
            equipment.some((item) => item.status !== "READY")
          ) {
            throw new BookingError("equipmentUnavailable");
          }

          const overlap = await tx.bookingItem.findFirst({
            where: {
              equipmentId: { in: equipmentIds },
              booking: {
                status: {
                  in: ["RESERVED", "ISSUED"],
                },
                startDate: { lte: endDate },
                endDate: { gte: startDate },
              },
            },
            select: { id: true },
          });

          if (overlap) {
            throw new BookingError("datesUnavailable");
          }

          const selectedItems = values.items.map((item) => {
            const record = equipment.find(
              (entry) => entry.id === item.equipmentId,
            );

            if (!record) {
              throw new BookingError("equipmentUnavailable");
            }

            return {
              ...item,
              dailyRate: record.dailyRate,
              equipmentCode: record.code,
              equipmentName: record.name,
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
            items: selectedItems,
            });
          } catch (error) {
            if (error instanceof Error && error.message === "DISCOUNT_EXCEEDS_SUBTOTAL") {
              throw new BookingError("discountExceedsTotal");
            }
            throw error;
          }

          // Денежные поля в PostgreSQL имеют тип Int.
          if (pricing.standardSubtotal > 2_147_483_647) {
            throw new BookingError("amountTooLarge");
          }

          const booking = await tx.booking.create({
            data: {
              customerId: values.customerId,
              createdById: staffId,
              startDate,
              endDate,
              status: "RESERVED",
              travelDay: values.travelDay,
              discountPercent: values.discountPercent,
              paidDays: pricing.paidDays,
              subtotal: pricing.subtotal,
              discountAmount: pricing.discountAmount,
              total: pricing.total,
              notes: values.notes,
              items: {
                create: selectedItems.map((item, index) => ({
                  equipmentId: item.equipmentId,
                  equipmentCode: item.equipmentCode,
                  equipmentName: item.equipmentName,
                  dailyRate: item.dailyRate,
                  complimentary: item.complimentary,
                  amount: pricing.lines[index].amount,
                })),
              },
            },
            select: { id: true },
          });

          await tx.bookingEvent.create({
            data: {
              bookingId: booking.id,
              actorId: staffId,
              kind: "CREATED",
              bookingVersion: 1,
            },
          });
          return booking.id;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 10000,
        },
      );
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034";

      if (!retryable) {
        throw error;
      }

      if (attempt === 2) {
        throw new BookingError("busy");
      }
    }
  }

  throw new BookingError("busy");
}
