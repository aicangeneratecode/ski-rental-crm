import { z } from "zod";

import { calculateRental } from "./pricing";

export const createBookingSchema = z
  .object({
    customerId: z.uuid(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    travelDay: z.boolean(),
    discountPercent: z.number().int().min(0).max(100),
    discountFixed: z.number().int().min(0).max(2_147_483_647).default(0),
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
    if (values.discountFixed > 0 && values.discountPercent > 0) {
      context.addIssue({ code: "custom", message: "DISCOUNT_MODE_CONFLICT", path: ["discountFixed"] });
    }
    try {
      // Проверяем даты и повторяющиеся экземпляры, цены из базы при сохранении.
      // Настоящие цены получим из базы при сохранении.
      const result = calculateRental({
        ...values,
        discountFixed: 0, // Real subtotal comes from DB; validate fixed amount at save.
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
  | "discountExceedsTotal"
  | "busy"
  | "database";

export type CreateBookingResult =
  | { ok: true; id: string }
  | { ok: false; error: BookingErrorCode };