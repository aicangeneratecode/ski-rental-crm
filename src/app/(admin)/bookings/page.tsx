import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import PageBreadcrumb from "@/components/common/page-breadcrumb";
import ComponentCard from "@/components/common/component-card";
import Bookings from "@/components/main/bookings";
import { getDb } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";

export const metadata: Metadata = {
  title: "Бронирования | Ski Rental CRM",
};

export const dynamic = "force-dynamic";

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

async function loadData() {
  const db = getDb();

  const [customers, equipment, bookings] = await Promise.all([
    db.customer.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        phone: true,
      },
    }),
    db.equipment.findMany({
      where: { status: "READY" },
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        size: true,
        dailyRate: true,
        bookingItems: {
          where: {
            booking: {
              status: { in: ["RESERVED", "ISSUED"] },
            },
          },
          select: {
            booking: {
              select: {
                startDate: true,
                endDate: true,
              },
            },
          },
        },
      },
    }),
    db.booking.findMany({
      take: 100,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
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
        payments: {
          select: {
            kind: true,
            amount: true,
          },
        },
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
            dailyRate: true,
            amount: true,
          },
        },
      },
    }),
  ]);

  return {
    customers,
    equipment: equipment.map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      size: item.size,
      dailyRate: item.dailyRate,
      reservations: item.bookingItems.map(({ booking }) => ({
        startDate: dateOnly(booking.startDate),
        endDate: dateOnly(booking.endDate),
      })),
    })),
    rows: bookings.map((booking) => ({
      id: booking.id,
      version: booking.version,
      customerName: booking.customer.name,
      customerPhone: booking.customer.phone,
      startDate: dateOnly(booking.startDate),
      endDate: dateOnly(booking.endDate),
      status: booking.status,
      paidDays: booking.paidDays,
      travelDay: booking.travelDay,
      discountPercent: booking.discountPercent,
      subtotal: booking.subtotal,
      discountAmount: booking.discountAmount,
      total: booking.total,
      notes: booking.notes,
      netPaid: booking.payments.reduce(
        (sum, payment) =>
          sum +
          (payment.kind === "PAYMENT"
            ? payment.amount
            : -payment.amount),
        0,
      ),
      items: booking.items.map((item) => ({
        id: item.id,
        code: item.equipmentCode,
        name: item.equipmentName,
        complimentary: item.complimentary,
        dailyRate: item.dailyRate,
        amount: item.amount,
      })),
    })),
  };
}

export default async function Page() {
  await requireStaff();
  setRequestLocale("ru");

  const t = await getTranslations("bookings");
  const data = await loadData().catch(() => null);

  return (
    <>
      <PageBreadcrumb pageTitle={t("title")} />

      {data ? (
        <Bookings {...data} />
      ) : (
        <ComponentCard title={t("offlineTitle")}>
          <p className="text-sm text-gray-500">{t("offlineBody")}</p>
        </ComponentCard>
      )}
    </>
  );
}
