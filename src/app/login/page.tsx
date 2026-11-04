import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import LoginForm from "@/components/auth/login-form";
import { redirect } from "@/i18n/navigation";
import { getStaffSession } from "@/lib/require-staff";

export const metadata: Metadata = { title: "Вход | TOP RIDE" };
export default async function LoginPage() {
  setRequestLocale("ru");
  const session = await getStaffSession();
  if (session) redirect({ href: "/", locale: "ru" });
  const t = await getTranslations("auth");
  return (
    <main className="topride-login flex min-h-screen items-center justify-center px-4 py-12">
      <section className="w-full max-w-[440px] rounded-3xl border border-gray-200 bg-white p-7 shadow-theme-lg sm:p-10 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-10 flex items-center gap-4">
          <Image src="/topride-mark.svg" alt="TOP RIDE" width={58} height={58} priority className="rounded-2xl" />
          <div>
            <p className="text-2xl font-extrabold tracking-[-0.055em] text-gray-900 dark:text-white">TOP <span className="text-brand-600 dark:text-brand-400">RIDE</span></p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Rental management</p>
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{t("title")}</h1>
        <p className="mb-8 mt-2 text-sm text-gray-500 dark:text-gray-400">{t("description")}</p>
        <LoginForm />
        <p className="mt-9 border-t border-gray-100 pt-5 text-center text-xs text-gray-400 dark:border-gray-800">TOP RIDE · BELGRADE</p>
      </section>
    </main>
  );
}