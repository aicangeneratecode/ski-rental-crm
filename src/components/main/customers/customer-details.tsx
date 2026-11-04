"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatBookingDate, formatBookingMoney } from "@/lib/bookings/types";
import { customerRentalBalance, type CustomerListRow } from "@/lib/customers/list-utils";

type Props = {
  customer: CustomerListRow;
  onClose: () => void;
  onEdit: () => void;
};

const tabs = ["overview", "history", "notes"] as const;

export default function CustomerDetails({ customer, onClose, onEdit }: Props) {
  const t = useTranslations("customerProfile");
  const w = useTranslations("customersWorkspace");
  const bookingT = useTranslations("bookings");
  const [tab, setTab] = useState<(typeof tabs)[number]>("overview");
  const [showAll, setShowAll] = useState(false);

  const initials = customer.name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => part[0]).join("").toLocaleUpperCase("ru");
  const completedTotal = customer.rentals
    .filter((rental) => rental.status === "RETURNED")
    .reduce((sum, rental) => sum + rental.total, 0);
  const shownRentals = showAll ? customer.rentals : customer.rentals.slice(0, 20);

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" style={{ width: "min(100vw, 680px)", maxWidth: "none" }}
        className="overflow-y-auto border-[#e9e6e1] dark:border-[#313337] dark:bg-[#1b1e21]">
        <SheetHeader>
          <SheetTitle>{t("open")}</SheetTitle>
          <SheetDescription>{t("description")}</SheetDescription>
        </SheetHeader>

        <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-brand-50/75 p-4 dark:bg-brand-500/10">
          <div aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-sm font-extrabold text-brand-800 dark:bg-brand-500/20 dark:text-brand-300">{initials}</div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-gray-900 dark:text-white">{customer.name}</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {w("customerRef", { id: customer.id.slice(0, 8).toUpperCase() })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((value) => (
            <Button key={value} type="button" size="sm"
              variant={tab === value ? "default" : "outline"}
              aria-pressed={tab === value} onClick={() => setTab(value)}>
              {t(value)}
            </Button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400">{t("rentals")}</h3>
                <p className="mt-2 text-2xl font-extrabold tabular-nums text-gray-900 dark:text-white">{customer.completedCount}</p>
              </section>
              <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400">{t("active")}</h3>
                <p className="mt-2 text-2xl font-extrabold tabular-nums text-gray-900 dark:text-white">{customer.activeCount}</p>
              </section>
              <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400">{t("total")}</h3>
                <p className="mt-2 text-lg font-extrabold tabular-nums text-gray-900 dark:text-white">{formatBookingMoney(completedTotal)}</p>
              </section>
            </div>

            <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400">{w("totalBalance")}</h3>
              <p className={`mt-2 text-xl font-extrabold tabular-nums ${customer.balance > 0
                ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-100"}`}>
                {formatBookingMoney(customer.balance)}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{w("balanceExplanation")}</p>
            </section>

            <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <h3 className="font-semibold">{t("contacts")}</h3>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="min-w-0">
                  <dt className="text-xs text-gray-500">{t("phone")}</dt>
                  <dd className="mt-1 break-all text-sm">
                    {customer.phone ? (
                      <a href={`tel:${customer.phone}`} className="text-brand-700 hover:underline dark:text-brand-400">{customer.phone}</a>
                    ) : t("notSpecified")}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-gray-500">{t("email")}</dt>
                  <dd className="mt-1 break-all text-sm">
                    {customer.email ? (
                      <a href={`mailto:${customer.email}`} className="text-brand-700 hover:underline dark:text-brand-400">{customer.email}</a>
                    ) : t("notSpecified")}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        )}

        {tab === "history" && (
          <section className="space-y-3">
            <h3 className="font-semibold">{t("historyTitle")}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("historyHint")}</p>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full min-w-[460px] text-sm">
                <thead className="bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  <tr>
                    {(["booking", "dates", "status", "amount"] as const).map((field) => (
                      <th key={field} scope="col" className="px-3 py-3 text-start text-xs font-semibold">{t(field)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shownRentals.map((rental) => (
                    <tr key={rental.id} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="px-3 py-3 text-xs font-semibold">#{rental.id.slice(0, 8).toUpperCase()}</td>
                      <td className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">
                        {formatBookingDate(rental.startDate)} — {formatBookingDate(rental.endDate)}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {bookingT(`statuses.${rental.status}`)}
                      </td>
                      <td className="px-3 py-3 text-xs tabular-nums">
                        {formatBookingMoney(rental.total)}
                        {customerRentalBalance(rental) > 0 && (
                          <span className="mt-1 block text-[11px] text-red-600 dark:text-red-400">
                            {w("balance")}: {formatBookingMoney(customerRentalBalance(rental))}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {customer.rentals.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-9 text-center text-sm text-gray-500">{t("historyEmpty")}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {!showAll && customer.rentals.length > shownRentals.length && (
              <Button type="button" size="sm" variant="outline" onClick={() => setShowAll(true)}>
                {w("showAllHistory", { count: customer.rentals.length })}
              </Button>
            )}
          </section>
        )}

        {tab === "notes" && (
          <section className="space-y-3">
            <h3 className="font-semibold">{t("notes")}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t("notesHint")}</p>
            <div className="whitespace-pre-wrap break-words rounded-xl bg-gray-50 p-4 text-sm leading-6 dark:bg-gray-800">
              {customer.notes || t("noNotes")}
            </div>
          </section>
        )}

        <div className="mt-auto flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
          <Button type="button" variant="outline" onClick={onClose}>{t("close")}</Button>
          <Button type="button" onClick={onEdit}>{t("edit")}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
