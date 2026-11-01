import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import SectionPage from "@/components/main/crm/section-page";
export const metadata: Metadata = { title: "Сегодня | Ski Rental CRM" };
export default async function Page() {
  setRequestLocale("ru");
  return <SectionPage section="today" />;
}
