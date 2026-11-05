import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireStaff } from "@/lib/require-staff";
import { getBelgradeDate } from "@/lib/bookings/today";
import { loadReportData, parseReportPeriod } from "@/lib/reports/report-data";
import ComponentCard from "@/components/common/component-card";
import ReportsDashboard from "@/components/main/reports";

export const metadata: Metadata = { title: "Аналитика | TOP RIDE" };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireStaff();
  setRequestLocale("ru");
  const t = await getTranslations("reports");
  const today = getBelgradeDate();
  const filters = await searchParams;
  const period = parseReportPeriod(filters, today);
  if (!period) return (
    <ComponentCard title={t("invalidPeriodTitle")}>
      <p className="text-sm text-gray-500">{t("invalidPeriodHint")}</p>
      <a href="/reports" className="mt-4 inline-block text-brand-700 underline dark:text-brand-300">{t("resetPeriod")}</a>
    </ComponentCard>
  );
  const data = await loadReportData(period).catch(error => {
    console.error("[TOP RIDE reports] Database report query failed", error);
    return null;
  });
  if (!data) return (
    <ComponentCard title={t("offlineTitle")}>
      <p className="text-sm leading-6 text-gray-500">{t("offlineHint")}</p>
    </ComponentCard>
  );
  return <ReportsDashboard key={period.from+"-"+period.to} data={data} today={today}/>;
}
