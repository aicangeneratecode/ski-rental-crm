"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import EquipmentMaintenancePanel from "./equipment-maintenance-panel";

import { formatBookingDate } from "@/lib/bookings/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatRsd } from "@/lib/equipment/tariffs";
import type { EquipmentRow } from "@/lib/equipment/types";

type Props = {
  item: EquipmentRow;
  readOnly: boolean;
  onClose: () => void;
  onEdit: () => void;
};

const tabs = ["overview", "availability", "maintenance"] as const;

export default function EquipmentDetails({
  item,
  readOnly,
  onClose,
  onEdit,
}: Props) {
  const t = useTranslations("equipmentProfile");
  const inventory = useTranslations("inventory");
  const bookingsT = useTranslations("bookings");

  const [tab, setTab] = useState<(typeof tabs)[number]>("overview");

  const statusColor =
    item.status === "READY"
      ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
      : item.status === "MAINTENANCE"
        ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
          <div>
            <p className="font-semibold">{item.code}</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {inventory(`tariffs.${item.tariff}`)}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs ${statusColor}`}>
            {inventory(`statuses.${item.status}`)}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={tab === value ? "default" : "outline"}
              aria-pressed={tab === value}
              onClick={() => setTab(value)}
            >
              {t(value)}
            </Button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <h3 className="text-sm text-gray-500">
                  {t("dailyRate")}
                </h3>
                <p className="mt-2 text-2xl font-semibold">
                  {formatRsd(item.dailyRate)}
                </p>
                <p className="mt-2 text-xs leading-5 text-gray-500">
                  {t("rateHint")}
                </p>
              </section>

              <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <h3 className="text-sm text-gray-500">
                  {inventory("fields.size")}
                </h3>
                <p className="mt-2 text-2xl font-semibold">{item.size}</p>
              </section>
            </div>

            <p className="rounded-xl bg-gray-50 p-3 text-xs leading-5 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              {t("statusHint")}
            </p>

            <section>
              <h3 className="font-semibold">{t("notes")}</h3>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600 dark:text-gray-400">
                {item.notes || t("noNotes")}
              </p>
            </section>
          </div>
        )}

        {tab === "availability" && (
            <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">{t("availabilityTitle")}</h3>
                <span className="text-xs text-gray-500">
                    {t("bookingCount", { count: item.bookings.length })}
                </span>
                </div>

                <p className="text-sm leading-6 text-gray-500">
                {t("availabilityHint")}
                </p>

                {item.status !== "READY" && (
                <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    {t("notReady")}
                </p>
                )}

                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="w-full min-w-[520px] text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                        {(["period", "customer", "bookingStatus"] as const).map(
                        (key) => (
                            <th
                            key={key}
                            scope="col"
                            className="px-4 py-3 text-start font-medium"
                            >
                            {t(key)}
                            </th>
                        ),
                        )}
                    </tr>
                    </thead>

                    <tbody>
                    {item.bookings.map((booking) => (
                        <tr
                        key={booking.id}
                        className="border-t border-gray-100 dark:border-gray-800"
                        >
                        <td className="px-4 py-4 align-top whitespace-nowrap">
                            <p>{formatBookingDate(booking.startDate)}</p>
                            <p className="mt-1 text-gray-500">
                            {formatBookingDate(booking.endDate)}
                            </p>
                            <p className="mt-2 text-xs text-gray-500">
                            {bookingsT("reference", {
                                id: booking.id.slice(0, 8),
                            })}
                            </p>
                        </td>

                        <td className="px-4 py-4 align-top">
                            <p className="font-medium">{booking.customerName}</p>
                            <a
                            href={`tel:${booking.customerPhone}`}
                            className="mt-1 inline-block text-xs text-brand-600 hover:underline dark:text-brand-400"
                            >
                            {booking.customerPhone}
                            </a>
                        </td>

                        <td className="px-4 py-4 align-top">
                            <span
                            className={`inline-block rounded-full px-2.5 py-1 text-xs whitespace-nowrap ${
                                booking.status === "ISSUED"
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            }`}
                            >
                            {bookingsT(`statuses.${booking.status}`)}
                            </span>
                        </td>
                        </tr>
                    ))}

                    {item.bookings.length === 0 && (
                        <tr>
                        <td
                            colSpan={3}
                            className="px-5 py-10 text-center text-gray-500"
                        >
                            {t("availabilityEmpty")}
                        </td>
                        </tr>
                    )}
                    </tbody>
                </table>
                </div>

                <p className="text-xs leading-5 text-gray-500">
                {t("availabilityFooter")}
                </p>
            </section>
            )}
        {tab === "maintenance" && (
          <EquipmentMaintenancePanel item={item} readOnly={readOnly} />
        )}

        <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("close")}
          </Button>
          <Button type="button" disabled={readOnly} onClick={onEdit}>
            {t("edit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}