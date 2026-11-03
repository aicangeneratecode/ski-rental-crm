import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import PageBreadcrumb from "@/components/common/page-breadcrumb";
import SettingsPanel from "@/components/main/settings";
import { requireStaff } from "@/lib/require-staff";

export const metadata: Metadata = {
  title: "Настройки | Ski Rental CRM",
};

export const dynamic = "force-dynamic";

export default async function Page() {
  await requireStaff();
  setRequestLocale("ru");

  const t = await getTranslations("settingsPanel");

  return (
    <>
      <PageBreadcrumb pageTitle={t("title")} />
      <SettingsPanel />
    </>
  );
}