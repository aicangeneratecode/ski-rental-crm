"use server";

import { revalidatePath } from "next/cache";

import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { getStaffSession } from "@/lib/require-staff";

import {
  paymentSchema,
  type PaymentError,
  type PaymentResult,
} from "./schema";

class PaymentOperationError extends Error {
  constructor(public readonly code: PaymentError) {
    super(code);
  }
}

export async function savePayment(
  input: unknown,
): Promise<PaymentResult> {
  const session = await getStaffSession();

  if (!session) {
    return { ok: false, error: "authRequired" };
  }

  const parsed = paymentSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: "invalid" };
  }

  const data = parsed.data;
  let paymentId: string;

  try {
    paymentId = await getDb().$transaction(
      async (tx) => {
        // Повтор того же запроса возвращает уже сохранённую операцию.
        const existing = await tx.payment.findUnique({
          where: { requestId: data.requestId },
        });

        if (existing) {
          const matches =
            existing.bookingId === data.bookingId &&
            existing.createdById === session.user.id &&
            existing.kind === data.kind &&
            existing.method === data.method &&
            existing.amount === data.amount &&
            existing.note === data.note;

          if (!matches) {
            throw new PaymentOperationError("requestMismatch");
          }

          return existing.id;
        }

        const booking = await tx.booking.findUnique({
          where: { id: data.bookingId },
          select: {
            total: true,
            status: true,
            version: true,
          },
        });

        if (!booking) {
          throw new PaymentOperationError("notFound");
        }

        if (booking.version !== data.version) {
          throw new PaymentOperationError("conflict");
        }

        // По отменённой брони разрешён возврат ранее принятых денег.
        if (
          data.kind === "PAYMENT" &&
          booking.status === "CANCELLED"
        ) {
          throw new PaymentOperationError("cancelled");
        }

        const totals = await tx.payment.groupBy({
          by: ["kind"],
          where: { bookingId: data.bookingId },
          _sum: { amount: true },
        });

        const netPaid = totals.reduce((sum, row) => {
          const amount = row._sum.amount ?? 0;

          return row.kind === "PAYMENT"
            ? sum + amount
            : sum - amount;
        }, 0);

        if (
          data.kind === "PAYMENT" &&
          data.amount > booking.total - netPaid
        ) {
          throw new PaymentOperationError("overpayment");
        }

        if (
          data.kind === "REFUND" &&
          data.amount > netPaid
        ) {
          throw new PaymentOperationError("refundTooLarge");
        }

        // Согласуем оплату с другими изменениями этой брони.
        const updated = await tx.booking.updateMany({
          where: {
            id: data.bookingId,
            version: data.version,
          },
          data: {
            version: { increment: 1 },
          },
        });

        if (updated.count !== 1) {
          throw new PaymentOperationError("conflict");
        }

        const payment = await tx.payment.create({
          data: {
            bookingId: data.bookingId,
            createdById: session.user.id,
            requestId: data.requestId,
            kind: data.kind,
            method: data.method,
            amount: data.amount,
            note: data.note,
          },
          select: { id: true },
        });

        return payment.id;
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      },
    );
  } catch (error) {
    if (error instanceof PaymentOperationError) {
      return { ok: false, error: error.code };
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2034" || error.code === "P2002")
    ) {
      return { ok: false, error: "conflict" };
    }

    return { ok: false, error: "database" };
  }

  revalidatePath("/bookings");
  revalidatePath("/calendar");
  revalidatePath("/customers");
  revalidatePath("/");

  return { ok: true, id: paymentId };
}