import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PageBreadcrumb from "@/components/common/page-breadcrumb";
import ComponentCard from "@/components/common/component-card";
import EquipmentCatalog from "@/components/main/equipment";
import { getDb } from "@/lib/db";
import { equipmentSchema } from "@/lib/equipment/schema";
import type { EquipmentRow } from "@/lib/equipment/types";
export const metadata: Metadata = { title: "Оборудование | Ski Rental CRM" };
export const dynamic = "force-dynamic";
export default async function Page() {
  setRequestLocale("ru");
  const t = await getTranslations("inventory");
  let rows: EquipmentRow[] = [];
  let problem: "setup" | "offline" | null = null;
  if (!process.env.DATABASE_URL) problem = "setup";
  else {
    try {
      const records = await getDb().equipment.findMany({
        orderBy: { createdAt: "desc" },
      });
      rows = records.map((record) => ({
        ...equipmentSchema.parse(record),
        id: record.id,
        version: record.version,
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
        <EquipmentCatalog
          rows={rows}
          readOnly={process.env.NODE_ENV !== "development"}
        />
      )}
    </>
  );
}
