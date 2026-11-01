import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
interface BreadcrumbProps {
  pageTitle: string;
}
export default function PageBreadcrumb({ pageTitle }: BreadcrumbProps) {
  const t = useTranslations("crm");
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
        {pageTitle}
      </h1>
      <nav
        aria-label={t("navigation")}
        className="flex gap-2 text-sm text-gray-500 dark:text-gray-400"
      >
        <Link href="/">{t("home")}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{pageTitle}</span>
      </nav>
    </div>
  );
}
