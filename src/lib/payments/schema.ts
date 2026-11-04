import { z } from "zod";

export const paymentSchema = z.object({
  bookingId: z.string().uuid(),
  version: z.number().int().positive(),
  requestId: z.string().uuid(),
  kind: z.enum(["PAYMENT", "REFUND"]),
  method: z.enum(["CASH", "CARD", "TRANSFER"]),
  amount: z.number().int().positive().max(2_147_483_647),
  note: z.string().trim().max(1000).default(""),
});

export type PaymentInput = z.infer<typeof paymentSchema>;

export type PaymentError =
  | "authRequired"
  | "invalid"
  | "notFound"
  | "cancelled"
  | "overpayment"
  | "refundTooLarge"
  | "requestMismatch"
  | "conflict"
  | "database";

export type PaymentResult =
  | { ok: true; id: string }
  | { ok: false; error: PaymentError };