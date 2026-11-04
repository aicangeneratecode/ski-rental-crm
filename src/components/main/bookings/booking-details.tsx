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
import {
  formatBookingDate,
  formatBookingMoney,
  type BookingRow,
} from "@/lib/bookings/types";

import BookingHistory from "./booking-history";
import BookingCalculation from "./booking-calculation";
import BookingPayments from "./booking-payments";

type Props = {
  booking: BookingRow;
  onClose: () => void;
};

const tabs = ["overview", "payment", "history"] as const;

export default function BookingDetails({ booking, onClose }: Props) {
  const t = useTranslations("bookings");
  const [tab, setTab] = useState<(typeof tabs)[number]>("overview");

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent side="right" style={{ width: "min(100vw, 640px)", maxWidth: "none" }} className="overflow-y-auto border-[#e9e6e1] dark:border-[#313337] dark:bg-[#1b1e21]">
        <SheetHeader>
          <SheetTitle>
            {t("reference", { id: booking.id.slice(0, 8) })}
          </SheetTitle>
          <SheetDescription>{t("layout.cardHint")}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
          <div>
            <p className="font-semibold">{booking.customerName}</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {booking.customerPhone}
            </p>
          </div>
          <span className="rounded-full border border-gray-300 px-3 py-1 text-xs dark:border-gray-600">
            {t(`statuses.${booking.status}`)}
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
              {t(`layout.${value}`)}
            </Button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <h3 className="text-sm text-gray-500">{t("layout.period")}</h3>
                <p className="mt-2 font-medium">
                  {formatBookingDate(booking.startDate)}
                  {" — "}
                  {formatBookingDate(booking.endDate)}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {t("paidDays", { count: booking.paidDays })}
                </p>
              </section>

              <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <h3 className="text-sm text-gray-500">{t("total")}</h3>
                <p className="mt-2 text-2xl font-semibold">
                  {formatBookingMoney(booking.total)}
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  {t("layout.pricingHint")}
                </p>
              </section>
            </div>

            <BookingCalculation booking={booking} />

            <section>
              <h3 className="font-semibold">{t("layout.note")}</h3>
              <p className="mt-2 text-sm break-words whitespace-pre-wrap text-gray-600 dark:text-gray-400">
                {booking.notes || t("layout.noNote")}
              </p>
            </section>
          </div>
        )}

        {tab === "payment" && (
          <BookingPayments key={booking.id} bookingId={booking.id} />
        )}

        {tab === "history" && (
          <BookingHistory
            key={booking.id}
            bookingId={booking.id}
            version={booking.version}
          />
        )}

        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("layout.close")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
