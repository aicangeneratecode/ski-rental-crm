import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import ComponentCard from "@/components/common/component-card";
import Customers from "@/components/main/customers";
import { getDb } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import {
  summarizeCustomerRentals,
  type CustomerListRow,
  type CustomerRental,
} from "@/lib/customers/list-utils";

export const metadata: Metadata = {
  title: "Клиенты | TOP RIDE",
};
export const dynamic = "force-dynamic";

async function loadCustomers(): Promise<CustomerListRow[]> {
  const customers = await getDb().customer.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      notes: true,
      version: true,
      createdAt: true,
      bookings: {
        orderBy: [{ startDate: "desc" }, { id: "desc" }],
        select: {
          id: true,
          startDate: true,
          endDate: true,
          status: true,
          total: true,
          payments: {
            select: { kind: true, amount: true },
          },
        },
      },
    },
  });

  return customers.map((customer) => {
    const rentals: CustomerRental[] = customer.bookings.map((booking) => ({
      id: booking.id,
      startDate: booking.startDate.toISOString().slice(0, 10),
      endDate: booking.endDate.toISOString().slice(0, 10),
      status: booking.status,
      total: booking.total,
      netPaid: booking.payments.reduce(
        (sum, payment) => sum + (payment.kind === "PAYMENT" ? payment.amount : -payment.amount),
        0,
      ),
    }));

    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      notes: customer.notes,
      version: customer.version,
      createdAt: customer.createdAt.toISOString(),
      rentals,
      ...summarizeCustomerRentals(rentals),
    };
  });
}

export default async function Page() {
  await requireStaff();
  setRequestLocale("ru");

  const t = await getTranslations("customers");
  const rows = await loadCustomers().catch(() => null);

  if (rows === null) {
    return (
      <ComponentCard title={t("offlineTitle")}>
        <p className="text-sm text-gray-600 dark:text-gray-300">{t("offlineBody")}</p>
      </ComponentCard>
    );
  }
  return <Customers rows={rows} />;
}
