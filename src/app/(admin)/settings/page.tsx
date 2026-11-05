import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PageBreadcrumb from "@/components/common/page-breadcrumb";
import ComponentCard from "@/components/common/component-card";
import SettingsPanel from "@/components/main/settings";
import { requireStaff } from "@/lib/require-staff";
import { readTariffRates } from "@/lib/equipment/tariff-settings";
import { readWorkspaceSettings } from "@/lib/settings/workspace";

export const metadata: Metadata = { title: "Настройки | TOP RIDE" };
export const dynamic = "force-dynamic";

export default async function Page() {
  await requireStaff();
  setRequestLocale("ru");
  const t = await getTranslations("settingsPanel");
  const data = await Promise.all([readTariffRates(), readWorkspaceSettings()]).catch(()=>null);
  return (
    <>
      <PageBreadcrumb pageTitle={t("title")}/>
      {data ? <SettingsPanel rates={data[0]} settings={data[1]}/> :
        <ComponentCard title={t("unavailableTitle")}>
          <p className="text-sm text-gray-500">{t("unavailableHint")}</p>
        </ComponentCard>}
    </>
  );
}
