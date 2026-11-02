import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import TodayDashboard from "@/components/main/today";
import { requireStaff } from "@/lib/require-staff";

export const metadata: Metadata = {
  title: "Сегодня | Ski Rental CRM",
};

export const dynamic = "force-dynamic";

export default async function Page() {
  await requireStaff();
  setRequestLocale("ru");

  return <TodayDashboard />;
}