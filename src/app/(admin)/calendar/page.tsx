import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import RentalCalendar from "@/components/main/calendar";
import { requireStaff } from "@/lib/require-staff";

export const metadata: Metadata = {
  title: "Календарь занятости | Ski Rental CRM",
};

export const dynamic = "force-dynamic";

export default async function Page() {
  await requireStaff();
  setRequestLocale("ru");

  return <RentalCalendar />;
}