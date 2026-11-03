import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PageBreadcrumb from "@/components/common/page-breadcrumb";
import ComponentCard from "@/components/common/component-card";
import EquipmentCatalog from "@/components/main/equipment";
import { getDb } from "@/lib/db";
import { equipmentSchema } from "@/lib/equipment/schema";
import type { EquipmentRow } from "@/lib/equipment/types";
import { requireStaff } from "@/lib/require-staff";

export const metadata: Metadata = { title: "Оборудование | Ski Rental CRM" };
export const dynamic = "force-dynamic";
export default async function Page() {
  await requireStaff();
  setRequestLocale("ru");
  const t = await getTranslations("inventory");
  let rows: EquipmentRow[] = [];
  let problem: "setup" | "offline" | null = null;
  if (!process.env.DATABASE_URL) problem = "setup";
  else {
    try {
      const records = await getDb().equipment.findMany({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
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
                  startDate: true,
                  endDate: true,
                  status: true,
                  customer: {
                    select: {
                      name: true,
                      phone: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
      rows = records.map((record) => ({
        ...equipmentSchema.parse(record),
        id: record.id,
        version: record.version,
        bookings: record.bookingItems
          .map(({ booking }) => {
            if (
              booking.status !== "RESERVED" &&
              booking.status !== "ISSUED"
            ) {
              throw new Error("INVALID_ACTIVE_BOOKING_STATUS");
            }
      
            return {
              id: booking.id,
              startDate: booking.startDate.toISOString().slice(0, 10),
              endDate: booking.endDate.toISOString().slice(0, 10),
              status: booking.status,
              customerName: booking.customer.name,
              customerPhone: booking.customer.phone,
            };
          })
          .sort(
            (a, b) =>
              a.startDate.localeCompare(b.startDate) ||
              a.id.localeCompare(b.id),
          ),
      }));
    } catch {
      problem = "offline";
    }
  }
  return (
    <>
      <PageBreadcrumb pageTitle={t("title")} />
      {problem ? (
        <ComponentCard title={t(`${problem}Title`)}>
          <p className="text-gray-600 dark:text-gray-300">
            {t(`${problem}Body`)}
          </p>
          <code className="block rounded-lg bg-gray-50 p-4 text-sm text-gray-800 dark:bg-gray-900 dark:text-gray-200">
            npm run db:setup
          </code>
        </ComponentCard>
      ) : (
        <EquipmentCatalog rows={rows} readOnly={false} />
      )}
    </>
  );
}
