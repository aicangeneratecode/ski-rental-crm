import ComponentCard from "@/components/common/component-card";
import PageBreadcrumb from "@/components/common/page-breadcrumb";
import { getTranslations } from "next-intl/server";
interface SectionPageProps {
  section: "today" | "bookings" | "equipment" | "customers" | "settings";
}
export default async function SectionPage({ section }: SectionPageProps) {
  const t = await getTranslations("crm");
  return (
    <>
      <PageBreadcrumb pageTitle={t(`${section}.title`)} />
      <div className="mb-6 rounded-2xl bg-brand-50 p-6 dark:bg-brand-950">
        <p className="mb-2 text-sm font-semibold text-brand-600 dark:text-brand-200">
          {t("status")}
        </p>
        <p className="text-gray-700 dark:text-gray-300">{t("description")}</p>
      </div>
      <ComponentCard title={t(`${section}.empty`)}>
        <p className="max-w-2xl text-gray-600 dark:text-gray-300">
          {t(`${section}.body`)}
        </p>
      </ComponentCard>
    </>
  );
}
