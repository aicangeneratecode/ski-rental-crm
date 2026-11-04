"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import RentalDatePicker from "@/components/ui/rental-date-picker";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import {
  formatBookingDate,
  formatBookingMoney,
  type BookingCustomer,
  type BookingEquipment,
  type BookingRow,
} from "@/lib/bookings/types";

import BookingActions from "./booking-actions";
import BookingDetails from "./booking-details";
import BookingForm from "./booking-form";

type BookingListRow = BookingRow & {
  netPaid: number;
};

type Props = {
  rows: BookingListRow[];
  customers: BookingCustomer[];
  equipment: BookingEquipment[];
};

type StatusFilter = "all" | BookingRow["status"];

const statuses: StatusFilter[] = [
  "all",
  "RESERVED",
  "ISSUED",
  "RETURNED",
  "CANCELLED",
];

const statusClasses: Record<BookingRow["status"], string> = {
  RESERVED:
    "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  ISSUED:
    "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  RETURNED:
    "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  CANCELLED:
    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export default function Bookings({ rows, customers, equipment }: Props) {
  const t = useTranslations("bookings");
  const calendarT = useTranslations("calendar");
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const paymentT = useTranslations("bookingPaymentList");
  const [onlyBalance, setOnlyBalance] = useState(false);

  const canCreate = customers.length > 0 && equipment.length > 0;
  const selected = rows.find((row) => row.id === selectedId);
  const invalidDates = !!from && !!to && from > to;
  const search = query.trim().toLowerCase();

  const visible = rows.filter((row) => {
    if (invalidDates) return false;
    if (
      onlyBalance &&
      (row.status === "CANCELLED" || row.netPaid >= row.total)
    ) {
      return false;
    }
    if (status !== "all" && row.status !== status) return false;
    if (from && row.endDate < from) return false;
    if (to && row.startDate > to) return false;

    const text = [
      row.id,
      row.customerName,
      row.customerPhone,
      ...row.items.map((item) => `${item.code} ${item.name}`),
    ]
      .join(" ")
      .toLowerCase();

    return text.includes(search);
  });

  function resetFilters() {
    setQuery("");
    setStatus("all");
    setFrom("");
    setTo("");
    setOnlyBalance(false);
  }

  return (
    <div className="space-y-5 text-gray-900 dark:text-gray-100">
        <Button
          type="button"
          size="sm"
          variant={onlyBalance ? "default" : "outline"}
          aria-pressed={onlyBalance}
          onClick={() => setOnlyBalance((value) => !value)}
        >
          {paymentT("onlyBalance")}
        </Button>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("description")}
        </p>
        <Link
            href="/calendar"
            className={buttonVariants({ variant: "outline" })}
            >
            {calendarT("title")}
        </Link>
        <Button
          disabled={!canCreate}
          onClick={() => {
            setSaved(false);
            setOpen(true);
          }}
        >
          {t("add")}
        </Button>
      </header>

      {!canCreate && (
        <p className="text-sm text-gray-500">{t("setupHint")}</p>
      )}

      {saved && (
        <p role="status" className="text-sm text-green-600">
          {t("saved")}
        </p>
      )}

      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap gap-2">
          {statuses.map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={status === value ? "default" : "outline"}
              aria-pressed={status === value}
              onClick={() => setStatus(value)}
            >
              {value === "all" ? t("layout.all") : t(`statuses.${value}`)}
              <span className="opacity-70">
                {value === "all"
                  ? rows.length
                  : rows.filter((row) => row.status === value).length}
              </span>
            </Button>
          ))}
        </div>

        <div className="grid items-end gap-3 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label
              htmlFor="booking-search"
              className="mb-1.5 block text-xs text-gray-500"
            >
              {t("layout.search")}
            </label>
            <Input
              id="booking-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("layout.search")}
            />
          </div>

          <div>
            <label
              htmlFor="booking-filter-from"
              className="mb-1.5 block text-xs text-gray-500"
            >
              {t("layout.from")}
            </label>
            <RentalDatePicker
                id="booking-filter-from"
                label={t("layout.from")}
                value={from}
                invalid={invalidDates}
                onChange={setFrom}
            />
          </div>

          <div>
            <label
              htmlFor="booking-filter-to"
              className="mb-1.5 block text-xs text-gray-500"
            >
              {t("layout.to")}
            </label>
            <RentalDatePicker
                id="booking-filter-to"
                label={t("layout.to")}
                value={to}
                min={from || undefined}
                invalid={invalidDates}
                onChange={setTo}
                />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            {t("layout.dateHint")}
          </p>
          <Button type="button" size="sm" variant="ghost" onClick={resetFilters}>
            {t("layout.reset")}
          </Button>
        </div>

        {invalidDates && (
          <p role="alert" className="text-sm text-red-600">
            {t("layout.invalidDates")}
          </p>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
        <p>{t("layout.scope")}</p>
        <p role="status">{t("layout.shown", { count: visible.length })}</p>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center dark:border-gray-700">
          <h2 className="font-medium">
            {rows.length === 0 ? t("empty") : t("layout.empty")}
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {t("layout.emptyHint")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((row) => (
            <article
              key={row.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="grid items-start gap-4 lg:grid-cols-12">
                <div className="lg:col-span-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs text-gray-500">
                      {t("reference", { id: row.id.slice(0, 8) })}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs ${statusClasses[row.status]}`}
                    >
                      {t(`statuses.${row.status}`)}
                    </span>
                  </div>
                  <h2 className="mt-2 font-semibold">{row.customerName}</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {row.customerPhone}
                  </p>
                </div>

                <div className="lg:col-span-3">
                  <p className="text-xs text-gray-500">{t("layout.period")}</p>
                  <p className="mt-2 text-sm font-medium">
                    {formatBookingDate(row.startDate)}
                    {" — "}
                    {formatBookingDate(row.endDate)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {t("paidDays", { count: row.paidDays })}
                  </p>
                </div>

                <div className="lg:col-span-3">
                  <p className="text-xs text-gray-500">
                    {t("layout.items", { count: row.items.length })}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm">
                    {row.items.map((item) => item.name).join(", ")}
                  </p>
                </div>

                <div className="lg:col-span-2 lg:text-end">
                  <p className="font-semibold">
                    {formatBookingMoney(row.total)}
                  </p>
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                    {paymentT("paid", {
                      amount: formatBookingMoney(row.netPaid),
                    })}
                  </p>

                  {row.status === "CANCELLED" ? (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {paymentT("cancelled")}
                    </p>
                  ) : row.netPaid >= row.total ? (
                    <p className="mt-1 text-xs font-medium text-green-700 dark:text-green-400">
                      {paymentT("settled")}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                      {paymentT("remaining", {
                        amount: formatBookingMoney(
                          Math.max(0, row.total - row.netPaid),
                        ),
                      })}
                    </p>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => setSelectedId(row.id)}
                  >
                    {t("layout.details")}
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                <BookingActions
                  key={`${row.id}-${row.version}`}
                  booking={row}
                />
              </div>
            </article>
          ))}
        </div>
      )}

      {selected && (
        <BookingDetails
          key={selected.id}
          booking={selected}
          onClose={() => setSelectedId(null)}
        />
      )}

      {open && (
        <BookingForm
          customers={customers}
          equipment={equipment}
          onClose={() => setOpen(false)}
          onSaved={() => setSaved(true)}
        />
      )}
    </div>
  );
}