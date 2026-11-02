import type { Metadata } from "next";
import {
  getTranslations,
  setRequestLocale,
} from "next-intl/server";

import LoginForm from "@/components/auth/login-form";
import { redirect } from "@/i18n/navigation";
import { getStaffSession } from "@/lib/require-staff";

export const metadata: Metadata = {
  title: "Вход | Ski Rental CRM",
};

export default async function LoginPage() {
  setRequestLocale("ru");

  const session = await getStaffSession();

  if (session) {
    redirect({
      href: "/",
      locale: "ru",
    });
  }

  const t = await getTranslations("auth");

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10 dark:bg-gray-950">
      <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {t("title")}
        </h1>

        <p className="mb-8 mt-2 text-sm text-gray-500 dark:text-gray-400">
          {t("description")}
        </p>

        <LoginForm />
      </section>
    </main>
  );
}