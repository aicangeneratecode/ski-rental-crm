import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import ComponentCard from "@/components/common/component-card";
import RentalCalendar from "@/components/main/calendar";
import type {
  CalendarInventory,
  CalendarRental,
} from "@/components/main/calendar/calendar-types";
import { getDb } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { getBelgradeDate } from "@/lib/bookings/today";

export const metadata: Metadata = { title: "Календарь аренд | TOP RIDE" };
export const dynamic = "force-dynamic";

async function loadData(): Promise<{
  rentals: CalendarRental[];
  inventory: CalendarInventory[];
}> {
  const db = getDb();
  const [bookings, equipment] = await Promise.all([
    db.booking.findMany({
      where: { status: { not: "CANCELLED" }, archivedAt: null },
      orderBy: [{ startDate: "asc" }, { id: "asc" }],
      select: {
        id: true,
        version: true,
        customerId: true,
        createdById: true,
        createdBy: { select: { name: true } },
        customer: { select: { name: true, phone: true } },
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
        items: {
          orderBy: { equipmentCode: "asc" },
          select: {
            id: true,
            equipmentId: true,
            equipmentCode: true,
            equipmentName: true,
            complimentary: true,
            dailyRate: true,
            amount: true,
            equipment: { select: { tariff: true, size: true } },
          },
        },
      },
    }),
    db.equipment.findMany({
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        size: true,
        tariff: true,
        status: true,
      },
    }),
  ]);

  const inventory: CalendarInventory[] = equipment.map((item) => {
    if (
      item.status !== "READY" &&
      item.status !== "MAINTENANCE" &&
      item.status !== "ARCHIVED"
    ) {
      throw new Error("INVALID_EQUIPMENT_STATUS");
    }
    return {
      id: item.id,
      code: item.code,
      name: item.name,
      size: item.size,
      tariff: item.tariff,
      status: item.status,
    };
  });

  const rentals: CalendarRental[] = bookings.map((booking) => ({
    id: booking.id,
    version: booking.version,
    customerId: booking.customerId,
    customerName: booking.customer.name,
    customerPhone: booking.customer.phone,
    createdById: booking.createdById,
    createdByName: booking.createdBy.name,
    equipmentIds: booking.items.map((item) => item.equipmentId),
    tariffs: Array.from(
      new Set(booking.items.map((item) => item.equipment.tariff)),
    ),
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
      size: item.equipment.size,
      complimentary: item.complimentary,
      dailyRate: item.dailyRate,
      amount: item.amount,
    })),
  }));
  return { rentals, inventory };
}

export default async function Page() {
  await requireStaff();
  setRequestLocale("ru");
  const t = await getTranslations("calendarLive");
  const data = await loadData().catch(() => null);
  if (!data) {
    return (
      <ComponentCard title={t("offlineTitle")}>
        <p className="text-sm text-gray-500">{t("offlineBody")}</p>
      </ComponentCard>
    );
  }
  return <RentalCalendar {...data} today={getBelgradeDate()} />;
}
