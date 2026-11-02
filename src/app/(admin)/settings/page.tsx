import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import PageBreadcrumb from "@/components/common/page-breadcrumb";
import ComponentCard from "@/components/common/component-card";
import { tariffs, formatRsd } from "@/lib/equipment/tariffs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
export const metadata: Metadata = { title: "Настройки | Ski Rental CRM" };
export default async function Page() {
  setRequestLocale("ru");
  const t = await getTranslations("inventory");
  const crm = await getTranslations("crm");
  return (
    <>
      <PageBreadcrumb pageTitle={crm("settings.title")} />
      <ComponentCard title={t("tariffTitle")} desc={t("tariffHint")}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell
                  isHeader
                  className="py-3 text-start text-gray-600 dark:text-gray-300"
                >
                  {t("fields.tariff")}
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 text-end text-gray-600 dark:text-gray-300"
                >
                  {t("rateColumn")}
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tariffs.map((tariff) => (
                <TableRow
                  key={tariff.code}
                  className="border-t border-gray-100 dark:border-gray-800"
                >
                  <TableCell className="py-3 text-gray-800 dark:text-gray-200">
                    {t(`tariffs.${tariff.code}`)}
                  </TableCell>
                  <TableCell className="py-3 text-end text-gray-800 dark:text-gray-200">
                    {tariff.rate === null
                      ? t("manual")
                      : formatRsd(tariff.rate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ComponentCard>
    </>
  );
}
