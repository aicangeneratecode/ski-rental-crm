import type { Metadata } from "next";
import {
  getTranslations,
  setRequestLocale,
} from "next-intl/server";

import PageBreadcrumb from "@/components/common/page-breadcrumb";
import ComponentCard from "@/components/common/component-card";
import Customers from "@/components/main/customers";
import { getDb } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";

export const metadata: Metadata = {
  title: "Клиенты | Ski Rental CRM",
};

export const dynamic = "force-dynamic";

export default async function Page() {
  await requireStaff();
  setRequestLocale("ru");

  const t = await getTranslations("customers");

  const rows = await getDb()
    .customer.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        notes: true,
        version: true,
      },
    })
    .catch(() => null);

  return (
    <>
      <PageBreadcrumb pageTitle={t("title")} />

      {rows === null ? (
        <ComponentCard title={t("offlineTitle")}>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t("offlineBody")}
          </p>
        </ComponentCard>
      ) : (
        <Customers rows={rows} />
      )}
    </>
  );
}