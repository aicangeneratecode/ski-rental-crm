import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import ComponentCard from "@/components/common/component-card";
import RentalCalendar from "@/components/main/calendar";
import { getDb } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { getBelgradeDate } from "@/lib/bookings/today";
import type { CalendarEquipment } from "@/lib/bookings/calendar-types";

export const metadata: Metadata = {
  title: "Календарь занятости | Ski Rental CRM",
};

export const dynamic = "force-dynamic";

async function loadEquipment(): Promise<CalendarEquipment[]> {
  const equipment = await getDb().equipment.findMany({
    where: {
      OR: [
        { status: { not: "ARCHIVED" } },
        {
          bookingItems: {
            some: {
              booking: {
                status: { in: ["RESERVED", "ISSUED"] },
              },
            },
          },
        },
      ],
    },
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      size: true,
      status: true,
      bookingItems: {
        where: {
          booking: {
            status: { in: ["RESERVED", "ISSUED"] },
          },
        },
        select: {
          booking: {
            select: {
              id: true,
              version: true,
              startDate: true,
              endDate: true,
              status: true,
              paidDays: true,
              travelDay: true,
              discountPercent: true,
              subtotal: true,
              discountAmount: true,
              total: true,
              notes: true,
              customer: {
                select: { name: true, phone: true },
              },
              items: {
                orderBy: { equipmentCode: "asc" },
                select: {
                  id: true,
                  equipmentCode: true,
                  equipmentName: true,
                  complimentary: true,
                  dailyRate: true,
                  amount: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return equipment.map((item) => {
    const status = item.status;

    if (
      status !== "READY" &&
      status !== "MAINTENANCE" &&
      status !== "ARCHIVED"
    ) {
      throw new Error("INVALID_EQUIPMENT_STATUS");
    }

    return {
      id: item.id,
      code: item.code,
      name: item.name,
      size: item.size,
      status,
      bookings: item.bookingItems.map(({ booking }) => ({
        id: booking.id,
        version: booking.version,
        customerName: booking.customer.name,
        customerPhone: booking.customer.phone,
        startDate: booking.startDate.toISOString().slice(0, 10),
        endDate: booking.endDate.toISOString().slice(0, 10),
        status: booking.status,
        paidDays: booking.paidDays,
        travelDay: booking.travelDay,
        discountPercent: booking.discountPercent,
        subtotal: booking.subtotal,
        discountAmount: booking.discountAmount,
        total: booking.total,
        notes: booking.notes,
        items: booking.items.map((entry) => ({
          id: entry.id,
          code: entry.equipmentCode,
          name: entry.equipmentName,
          complimentary: entry.complimentary,
          dailyRate: entry.dailyRate,
          amount: entry.amount,
        })),
      })),
    };
  });
}

export default async function Page() {
  await requireStaff();
  setRequestLocale("ru");

  const t = await getTranslations("calendarLive");
  const today = getBelgradeDate();
  const equipment = await loadEquipment().catch(() => null);

  if (equipment === null) {
    return (
      <ComponentCard title={t("offlineTitle")}>
        <p className="text-sm text-gray-500">{t("offlineBody")}</p>
      </ComponentCard>
    );
  }

  return <RentalCalendar equipment={equipment} today={today} />;
}
