"use server";

import { z } from "zod";
import { getDb } from "@/lib/db";
import { getStaffSession } from "@/lib/require-staff";

export async function readBookingHistory(id: string) {
  if (!(await getStaffSession()))
    return { ok: false, error: "authRequired" } as const;
  if (!z.string().uuid().safeParse(id).success)
    return { ok: false, error: "invalid" } as const;
  try {
    const booking = await getDb().booking.findUnique({
      where: { id },
      select: {
        createdAt: true,
        createdBy: { select: { name: true } },
        events: {
          orderBy: [{ createdAt: "desc" }, { bookingVersion: "desc" }],
          select: {
            id: true,
            kind: true,
            createdAt: true,
            actor: { select: { name: true } },
          },
        },
      },
    });
    if (!booking) return { ok: false, error: "notFound" } as const;
    const events = booking.events.map((event) => ({
      id: event.id,
      kind: event.kind,
      createdAt: event.createdAt.toISOString(),
      actor: event.actor.name,
    }));
    const legacy = !events.some((event) => event.kind === "CREATED");
    // Creation metadata is factual even for bookings predating the event log.
    if (legacy)
      events.push({
        id: `created-${id}`,
        kind: "CREATED",
        createdAt: booking.createdAt.toISOString(),
        actor: booking.createdBy.name,
      });
    return { ok: true, events, legacy } as const;
  } catch {
    return { ok: false, error: "database" } as const;
  }
}
