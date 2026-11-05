"use server";

import { revalidatePath } from "next/cache";

import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { classifyDatabaseError, logDatabaseError } from "@/lib/db-errors";
import { getStaffSession } from "@/lib/require-staff";

import {
  changeBookingStatusSchema,
  type StatusError,
  type StatusResult,
} from "./status-schema";

class StatusChangeError extends Error {
  constructor(public readonly code: StatusError) {
    super(code);
  }
}

function todayInBelgrade() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Belgrade",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const part = (type: string) =>
    parts.find((entry) => entry.type === type)?.value;

  return `${part("year")}-${part("month")}-${part("day")}`;
}

export async function changeBookingStatus(
  input: unknown,
): Promise<StatusResult> {
  const session = await getStaffSession();

  if (!session) {
    return { ok: false, error: "authRequired" };
  }

  const parsed = changeBookingStatusSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: "invalid" };
  }

  const { id, version, action } = parsed.data;

  const expectedStatus = action === "return" ? "ISSUED" : "RESERVED";

  const nextStatus =
    action === "issue"
      ? "ISSUED"
      : action === "return"
        ? "RETURNED"
        : "CANCELLED";

  try {
    await getDb().$transaction(
      async (tx) => {
        const booking = await tx.booking.findUnique({
          where: { id },
          select: {
            status: true,
            version: true,
            startDate: true,
            endDate: true,
            items: {
              select: {
                equipmentId: true,
                equipment: {
                  select: { status: true },
                },
              },
            },
          },
        });

        if (
          !booking ||
          booking.version !== version ||
          booking.status !== expectedStatus
        ) {
          throw new StatusChangeError("conflict");
        }

        if (action === "issue") {
          const today = todayInBelgrade();
          const start = booking.startDate.toISOString().slice(0, 10);
          const end = booking.endDate.toISOString().slice(0, 10);

          if (today < start || today > end) {
            throw new StatusChangeError("outsideDates");
          }

          if (
            booking.items.length === 0 ||
            booking.items.some((item) => item.equipment.status !== "READY")
          ) {
            throw new StatusChangeError("equipmentUnavailable");
          }

          const stillIssued = await tx.bookingItem.findFirst({
            where: {
              equipmentId: {
                in: booking.items.map((item) => item.equipmentId),
              },
              booking: {
                id: { not: id },
                status: "ISSUED",
              },
            },
            select: { id: true },
          });

          if (stillIssued) {
            throw new StatusChangeError("stillIssued");
          }
        }

        const result = await tx.booking.updateMany({
          where: {
            id,
            version,
            status: expectedStatus,
          },
          data: {
            status: nextStatus,
            version: { increment: 1 },
          },
        });

        if (result.count !== 1) {
          throw new StatusChangeError("conflict");
        }
        await tx.bookingEvent.create({
          data: {
            bookingId: id,
            actorId: session.user.id,
            kind:
              action === "issue"
                ? "ISSUED"
                : action === "return"
                  ? "RETURNED"
                  : "CANCELLED",
            bookingVersion: version + 1,
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      },
    );
  } catch (error) {
    if (error instanceof StatusChangeError) {
      return { ok: false, error: error.code };
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return { ok: false, error: "conflict" };
    }

    logDatabaseError("changeBookingStatus", error);
    return { ok: false, error: classifyDatabaseError(error) };
  }

  revalidatePath("/bookings");
  revalidatePath("/customers");
  revalidatePath("/equipment");
  revalidatePath("/calendar");
  revalidatePath("/");
  return { ok: true };
}
