"use client";
import { SidebarHeader } from "@/components/ui/sidebar";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
interface AppSidebarHeaderProps {
  showContent: boolean;
}
export default function AppSidebarHeader({
  showContent,
}: AppSidebarHeaderProps) {
  const t = useTranslations("crm");
  return (
    <SidebarHeader className="px-5 py-8">
      <Link
        href="/"
        aria-label={t("brand")}
        className="flex items-center gap-3 text-gray-900 dark:text-white"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 font-bold text-white">
          S
        </span>
        {showContent && <span className="font-semibold">{t("brand")}</span>}
      </Link>
    </SidebarHeader>
  );
}
