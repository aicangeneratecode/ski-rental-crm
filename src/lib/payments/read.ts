"use server";

import { z } from "zod";

import { getDb } from "@/lib/db";
import { getStaffSession } from "@/lib/require-staff";

export async function readBookingPayments(bookingId: string) {
  const session = await getStaffSession();

  if (!session) {
    return { ok: false, error: "authRequired" } as const;
  }

  if (!z.string().uuid().safeParse(bookingId).success) {
    return { ok: false, error: "invalid" } as const;
  }

  try {
    const booking = await getDb().booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        version: true,
        total: true,
        status: true,
        payments: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: {
            id: true,
            requestId: true,
            kind: true,
            method: true,
            amount: true,
            note: true,
            createdAt: true,
            createdBy: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!booking) {
      return { ok: false, error: "notFound" } as const;
    }

    const received = booking.payments.reduce(
      (sum, item) =>
        sum + (item.kind === "PAYMENT" ? item.amount : 0),
      0,
    );

    const refunded = booking.payments.reduce(
      (sum, item) =>
        sum + (item.kind === "REFUND" ? item.amount : 0),
      0,
    );

    const netPaid = received - refunded;

    return {
      ok: true,
      data: {
        id: booking.id,
        version: booking.version,
        total: booking.total,
        status: booking.status,
        received,
        refunded,
        netPaid,
        balance: Math.max(0, booking.total - netPaid),
        payments: booking.payments.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
          employee: item.createdBy.name,
          createdBy: undefined,
        })),
      },
    } as const;
  } catch {
    return { ok: false, error: "database" } as const;
  }
}