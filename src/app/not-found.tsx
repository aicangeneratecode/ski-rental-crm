"use client";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center text-gray-900 dark:text-white">
      <p className="text-6xl font-bold">404</p>
      <h1 className="text-xl">{t("message")}</h1>
      <Link href="/" className="rounded-lg bg-brand-500 px-5 py-3 text-white">
        {t("backHome")}
      </Link>
    </main>
  );
}
