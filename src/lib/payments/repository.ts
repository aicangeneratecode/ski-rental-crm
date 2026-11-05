import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import type { PaymentError, PaymentInput } from "./schema";

export class PaymentOperationError extends Error {
  constructor(public readonly code: PaymentError) {
    super(code);
    this.name = "PaymentOperationError";
  }
}

/** Transactional money movement shared by server action and DB integration tests. */
export async function savePaymentRecord(data: PaymentInput, staffId: string): Promise<string> {
  try {
    return await getDb().$transaction(async (tx) => {
      const existing = await tx.payment.findUnique({ where: { requestId: data.requestId } });
      if (existing) {
        if (
          existing.bookingId !== data.bookingId ||
          existing.createdById !== staffId ||
          existing.kind !== data.kind ||
          existing.method !== data.method ||
          existing.amount !== data.amount ||
          existing.note !== data.note
        ) throw new PaymentOperationError("requestMismatch");
        return existing.id;
      }

      const booking = await tx.booking.findUnique({
        where: { id: data.bookingId },
        select: { total: true, status: true, version: true },
      });
      if (!booking) throw new PaymentOperationError("notFound");
      if (booking.version !== data.version) throw new PaymentOperationError("conflict");
      if (data.kind === "PAYMENT" && booking.status === "CANCELLED") {
        throw new PaymentOperationError("cancelled");
      }

      const totals = await tx.payment.groupBy({
        by: ["kind"],
        where: { bookingId: data.bookingId },
        _sum: { amount: true },
      });
      const netPaid = totals.reduce((sum, row) =>
        sum + (row.kind === "PAYMENT" ? 1 : -1) * (row._sum.amount ?? 0), 0);

      if (data.kind === "PAYMENT" && data.amount > booking.total - netPaid) {
        throw new PaymentOperationError("overpayment");
      }
      if (data.kind === "REFUND" && data.amount > netPaid) {
        throw new PaymentOperationError("refundTooLarge");
      }

      const updated = await tx.booking.updateMany({
        where: { id: data.bookingId, version: data.version },
        data: { version: { increment: 1 } },
      });
      if (updated.count !== 1) throw new PaymentOperationError("conflict");

      const created = await tx.payment.create({
        data: {
          bookingId: data.bookingId,
          createdById: staffId,
          requestId: data.requestId,
          kind: data.kind,
          method: data.method,
          amount: data.amount,
          note: data.note,
        },
        select: { id: true },
      });
      return created.id;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2034" || error.code === "P2002")) {
      throw new PaymentOperationError("conflict");
    }
    throw error;
  }
}
