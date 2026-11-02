import AppLayout from "@/layout/app-layout";
import { requireStaff } from "@/lib/require-staff";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStaff();

  return <AppLayout>{children}</AppLayout>;
}