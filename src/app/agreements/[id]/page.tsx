import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import AgreementPreview from "@/components/main/agreements/agreement-preview";
import { getDb } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { getBelgradeDate } from "@/lib/bookings/today";
import "./print.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Договор аренды | TOP RIDE",
  robots: { index: false, follow: false },
};

export default async function AgreementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const booking = await getDb().booking.findUnique({
    where: { id },
    select: {
      id: true,
      version: true,
      startDate: true,
      endDate: true,
      status: true,
      paidDays: true,
      travelDay: true,
      discountPercent: true,
      discountAmount: true,
      subtotal: true,
      total: true,
      customer: { select: { name: true } },
      items: {
        orderBy: [{ equipmentCode: "asc" }, { id: "asc" }],
        select: {
          id: true,
          equipmentCode: true,
          equipmentName: true,
          equipment: { select: { size: true } },
          dailyRate: true,
          complimentary: true,
          amount: true,
        },
      },
    },
  });
  if (!booking) notFound();
  const { customer, items, startDate, endDate, ...values } = booking;
  return (
    <AgreementPreview
      today={getBelgradeDate()}
      booking={{
        ...values,
        customerName: customer.name,
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
        items: items.map(
          ({ equipmentCode, equipmentName, equipment, ...item }) => ({
            ...item,
            code: equipmentCode,
            name: equipmentName,
            size: equipment.size,
          }),
        ),
      }}
    />
  );
}
