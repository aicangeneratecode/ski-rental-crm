"use client";
import SignOutButton from "@/components/auth/sign-out-button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useTheme } from "@/context/theme-context";
import { MoonIcon, SunIcon } from "@/icons";
import { useTranslations } from "next-intl";

export default function AppHeader() {
  const t = useTranslations("crm");
  const { theme, toggleTheme } = useTheme();
  return (
    <header className="topride-header sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b px-3 py-3 sm:min-h-20 sm:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger aria-label={t("toggleMenu")} className="topride-icon-button" />
        <div className="hidden h-7 w-px bg-gray-200 dark:bg-gray-800 sm:block" />
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-600 dark:text-brand-400">TOP RIDE / CRM</p>
          <p className="truncate text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100">{t("subtitle")}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={toggleTheme} aria-label={t("toggleTheme")} title={t("toggleTheme")}
          className="topride-icon-button inline-flex size-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition-colors hover:border-brand-300 hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:text-brand-400">
          {theme === "dark" ? <SunIcon className="size-5" /> : <MoonIcon className="size-5" />}
        </button>
        <SignOutButton />
      </div>
    </header>
  );
}