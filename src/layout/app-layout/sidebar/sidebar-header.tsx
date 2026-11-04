"use client";
import Image from "next/image";
import { SidebarHeader } from "@/components/ui/sidebar";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
interface AppSidebarHeaderProps { showContent: boolean; }
export default function AppSidebarHeader({ showContent }: AppSidebarHeaderProps) {
  const t = useTranslations("crm");
  return (
    <SidebarHeader className="border-b border-gray-100 px-5 py-6 dark:border-gray-800">
      <Link href="/" aria-label={t("brand")} className="flex min-h-12 items-center gap-3">
        <Image src="/topride-mark.svg" alt="TOP RIDE" width={46} height={46} className="size-11 shrink-0 rounded-2xl" priority />
        {showContent && (
          <span className="flex min-w-0 flex-col">
            <span className="text-lg font-extrabold leading-tight tracking-[-0.05em] text-gray-900 dark:text-white">TOP <span className="text-brand-600 dark:text-brand-400">RIDE</span></span>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.19em] text-gray-500 dark:text-gray-400">Rental management</span>
          </span>
        )}
      </Link>
    </SidebarHeader>
  );
}