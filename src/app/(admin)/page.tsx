import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import ComponentCard from "@/components/common/component-card";
import TodayDashboard from "@/components/main/today";
import { getDb } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { getBelgradeDate } from "@/lib/bookings/today";
import type { BookingRow } from "@/lib/bookings/types";

export const metadata: Metadata = {
  title: "Сегодня | Ski Rental CRM",
};

export const dynamic = "force-dynamic";

async function loadRows(today: string): Promise<BookingRow[]> {
  const day = new Date(`${today}T00:00:00.000Z`);

  const bookings = await getDb().booking.findMany({
    where: {
      OR: [
        {
          status: "RESERVED",
          startDate: { lte: day },
        },
        {
          status: "ISSUED",
          endDate: { lte: day },
        },
      ],
    },
    orderBy: [{ startDate: "asc" }, { id: "asc" }],
    select: {
      id: true,
      version: true,
      startDate: true,
      endDate: true,
      status: true,
      paidDays: true,
      total: true,
      notes: true,
      customer: {
        select: {
          name: true,
          phone: true,
        },
      },
      items: {
        orderBy: { equipmentCode: "asc" },
        select: {
          id: true,
          equipmentCode: true,
          equipmentName: true,
          complimentary: true,
        },
      },
    },
  });

  return bookings.map((booking) => ({
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
    items: booking.items.map((item) => ({
      id: item.id,
      code: item.equipmentCode,
      name: item.equipmentName,
      complimentary: item.complimentary,
    })),
  }));
}

export default async function Page() {
  await requireStaff();
  setRequestLocale("ru");

  const t = await getTranslations("todayLive");
  const today = getBelgradeDate();
  const rows = await loadRows(today).catch(() => null);

  if (rows === null) {
    return (
      <ComponentCard title={t("offlineTitle")}>
        <p className="text-sm text-gray-500">{t("offlineBody")}</p>
      </ComponentCard>
    );
  }

  return <TodayDashboard rows={rows} today={today} />;
}