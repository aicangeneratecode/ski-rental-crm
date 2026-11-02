import { z } from "zod";

import { calculateRental } from "./pricing";

export const createBookingSchema = z
  .object({
    customerId: z.uuid(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    travelDay: z.boolean(),
    discountPercent: z.union([
      z.literal(0),
      z.literal(5),
      z.literal(10),
      z.literal(15),
      z.literal(20),
    ]),
    notes: z.string().trim().max(2000),
    items: z
      .array(
        z.object({
          equipmentId: z.uuid(),
          complimentary: z.boolean(),
        }),
      )
      .min(1)
      .max(100),
  })
  .superRefine((values, context) => {
    try {
      // Здесь проверяем даты, скидку и повторяющиеся экземпляры.
      // Настоящие цены получим из базы при сохранении.
      const result = calculateRental({
        ...values,
        items: values.items.map((item) => ({
          ...item,
          dailyRate: 0,
        })),
      });

      if (result.calendarDays > 366) {
        context.addIssue({
          code: "custom",
          message: "RENTAL_TOO_LONG",
          path: ["endDate"],
        });
      }
    } catch {
      context.addIssue({
        code: "custom",
        message: "INVALID_PRICING",
        path: ["endDate"],
      });
    }
  });

export type CreateBookingInput = z.infer<
  typeof createBookingSchema
>;

export type BookingErrorCode =
  | "authRequired"
  | "invalid"
  | "customerMissing"
  | "equipmentUnavailable"
  | "datesUnavailable"
  | "amountTooLarge"
  | "busy"
  | "database";

export type CreateBookingResult =
  | { ok: true; id: string }
  | { ok: false; error: BookingErrorCode };