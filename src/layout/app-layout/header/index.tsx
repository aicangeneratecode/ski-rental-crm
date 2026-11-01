"use client";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/theme-context";
import { MoonIcon, SunIcon } from "@/icons";
import { useTranslations } from "next-intl";
export default function AppHeader() {
  const t = useTranslations("crm");
  const { theme, toggleTheme } = useTheme();
  return (
    <header className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <SidebarTrigger aria-label={t("toggleMenu")} />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {t("subtitle")}
        </span>
      </div>
      <Button
        onClick={toggleTheme}
        aria-label={t("toggleTheme")}
        title={t("toggleTheme")}
      >
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </Button>
    </header>
  );
}
