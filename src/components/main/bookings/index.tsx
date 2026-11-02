"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import BookingActions from "./booking-actions";

import { Button } from "@/components/ui/button";
import {
  formatBookingDate,
  formatBookingMoney,
  type BookingCustomer,
  type BookingEquipment,
  type BookingRow,
} from "@/lib/bookings/types";

import BookingForm from "./booking-form";

type Props = {
  rows: BookingRow[];
  customers: BookingCustomer[];
  equipment: BookingEquipment[];
};

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

export default function Bookings({
  rows,
  customers,
  equipment,
}: Props) {
  const t = useTranslations("bookings");
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const canCreate = customers.length > 0 && equipment.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("description")}
        </p>
        <Button
          disabled={!canCreate}
          onClick={() => {
            setSaved(false);
            setOpen(true);
          }}
        >
          {t("add")}
        </Button>
      </div>

      {!canCreate && (
        <p className="text-sm text-gray-500">{t("setupHint")}</p>
      )}

      {saved && (
        <p role="status" className="text-sm text-green-600">
          {t("saved")}
        </p>
      )}

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-500 dark:border-gray-700">
          {t("empty")}
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-500">{t("recent")}</p>
          <div className="grid gap-4 xl:grid-cols-2">
            {rows.map((row) => (
              <article
                key={row.id}
                className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-gray-500">
                      {t("reference", { id: row.id.slice(0, 8) })}
                    </p>
                    <h2 className="mt-1 font-semibold">
                      {row.customerName}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {row.customerPhone}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${statusClasses[row.status]}`}
                  >
                    {t(`statuses.${row.status}`)}
                  </span>
                </div>

                <div className="text-sm">
                  <p className="font-medium">
                    {formatBookingDate(row.startDate)}
                    {" — "}
                    {formatBookingDate(row.endDate)}
                  </p>
                  <p className="text-gray-500">
                    {t("paidDays", { count: row.paidDays })}
                  </p>
                </div>

                <ul className="space-y-1 text-sm">
                  {row.items.map((item) => (
                    <li key={item.id}>
                      {item.code} · {item.name}
                      {item.complimentary && (
                        <span className="ms-2 text-green-600">
                          {t("free")}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>

                {row.notes && (
                  <p className="whitespace-pre-wrap break-words text-sm text-gray-500">
                    {row.notes}
                  </p>
                )}

                <div className="flex justify-between border-t border-gray-100 pt-3 font-semibold dark:border-gray-800">
                  <span>{t("total")}</span>
                  <span>{formatBookingMoney(row.total)}</span>
                </div>
                <BookingActions
                key={`${row.id}-${row.version}`}
                booking={row}
                />
              </article>
            ))}
          </div>
        </>
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