"use client";

import { useTranslations } from "next-intl";
import {
  formatBookingMoney,
  type BookingRow,
} from "@/lib/bookings/types";

export default function BookingCalculation({
  booking,
}: {
  booking: BookingRow;
}) {
  const t = useTranslations("bookingCalculation");

  return (
    <section className="space-y-3">
      <h3 className="font-semibold">{t("title")}</h3>
      <p className="text-xs text-gray-500">{t("hint")}</p>

      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <span>{t("paidDays", { count: booking.paidDays })}</span>
        <span>
          {t("travelDay")}: {t(booking.travelDay ? "enabled" : "disabled")}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full min-w-[460px] text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th scope="col" className="p-3 text-start">{t("item")}</th>
              <th scope="col" className="p-3 text-end">{t("rate")}</th>
              <th scope="col" className="p-3 text-end">{t("amount")}</th>
            </tr>
          </thead>
          <tbody>
            {booking.items.map((item) => (
              <tr key={item.id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="p-3">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.code}</p>
                  {item.complimentary && (
                    <p className="mt-1 text-xs text-green-600">{t("free")}</p>
                  )}
                </td>
                <td className="p-3 text-end whitespace-nowrap">
                  {formatBookingMoney(item.dailyRate)}
                </td>
                <td className="p-3 text-end whitespace-nowrap">
                  {formatBookingMoney(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="space-y-3 rounded-xl bg-gray-50 p-4 text-sm dark:bg-gray-800">
        <div className="flex justify-between gap-4">
          <dt>{t("subtotal")}</dt>
          <dd className="shrink-0">{formatBookingMoney(booking.subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>{t("discount", { percent: booking.discountPercent })}</dt>
          <dd className="shrink-0">−{formatBookingMoney(booking.discountAmount)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-gray-200 pt-3 text-lg font-semibold dark:border-gray-700">
          <dt>{t("total")}</dt>
          <dd className="shrink-0">{formatBookingMoney(booking.total)}</dd>
        </div>
      </dl>
    </section>
  );
}