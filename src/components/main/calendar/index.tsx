"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Link, useRouter } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BookingDetails from "@/components/main/bookings/booking-details";
import { formatBookingDate } from "@/lib/bookings/types";
import type { CalendarEquipment } from "@/lib/bookings/calendar-types";

const DAY_MS = 86_400_000;
const gridStyle = {
  gridTemplateColumns: "220px minmax(0, 1fr)",
};

function timestamp(value: string) {
  return Date.parse(`${value}T00:00:00.000Z`);
}

function addDays(value: string, days: number) {
  return new Date(timestamp(value) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

function weekOf(value: string) {
  const weekday = new Date(timestamp(value)).getUTCDay();
  return addDays(value, -((weekday + 6) % 7));
}

function offset(start: string, value: string) {
  return Math.round((timestamp(value) - timestamp(start)) / DAY_MS);
}

function dayLabel(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(timestamp(value)));
}

type Props = {
  equipment: CalendarEquipment[];
  today: string;
};

export default function RentalCalendar({ equipment, today }: Props) {
  const t = useTranslations("calendar");
  const live = useTranslations("calendarLive");
  const inventory = useTranslations("inventory");
  const bookingsT = useTranslations("bookings");
  const router = useRouter();

  const [weekStart, setWeekStart] = useState(() => weekOf(today));
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshing, startTransition] = useTransition();

  const days = Array.from({ length: 7 }, (_, index) =>
    addDays(weekStart, index),
  );
  const weekEnd = days[6];
  const search = query.trim().toLocaleLowerCase("ru");

  const visible = equipment.filter((item) =>
    `${item.code} ${item.name} ${item.size}`
      .toLocaleLowerCase("ru")
      .includes(search),
  );

  const selected = equipment
    .flatMap((item) => item.bookings)
    .find((booking) => booking.id === selectedId);

  const intersects = (booking: { startDate: string; endDate: string }) =>
    booking.startDate <= weekEnd && booking.endDate >= weekStart;

  const hasBookings = visible.some((item) =>
    item.bookings.some(intersects),
  );

  return (
    <div className="space-y-5 text-gray-900 dark:text-gray-100">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="mt-1 text-sm text-gray-500">{live("hint")}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={refreshing}
            onClick={() => startTransition(() => router.refresh())}
          >
            {live(refreshing ? "refreshing" : "refresh")}
          </Button>
          <Link
            href="/bookings"
            className={buttonVariants({ variant: "outline" })}
          >
            {t("list")}
          </Link>
        </div>
      </header>

      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            aria-label={t("previous")}
            onClick={() => setWeekStart(addDays(weekStart, -7))}
          >
            ←
          </Button>

          <p aria-live="polite" className="px-2 text-sm font-semibold">
            {formatBookingDate(weekStart)}
            {" — "}
            {formatBookingDate(weekEnd)}
          </p>

          <Button
            type="button"
            variant="outline"
            aria-label={t("next")}
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          >
            →
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setWeekStart(weekOf(today));
              startTransition(() => router.refresh());
            }}
          >
            {live("today")}
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("search")}
            aria-label={t("search")}
          />

          <label className="flex items-center gap-3 text-sm">
            <span className="shrink-0">{live("date")}</span>
            <Input
              type="date"
              value={weekStart}
              min="2000-01-01"
              max="2100-12-31"
              onChange={(event) => {
                const value = event.target.value;
                if (
                  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
                  value >= "2000-01-01" &&
                  value <= "2100-12-31"
                ) {
                  setWeekStart(weekOf(value));
                }
              }}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-3 text-xs">
          <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-800 dark:bg-blue-950 dark:text-blue-200">
            {bookingsT("statuses.RESERVED")}
          </span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {bookingsT("statuses.ISSUED")}
          </span>
        </div>
      </section>

      <p className="text-xs leading-5 text-gray-500">
        {live("availabilityHint")}
      </p>

      <div
        role="region"
        aria-label={t("title")}
        tabIndex={0}
        className="overflow-x-auto rounded-2xl border border-gray-200 bg-white focus-visible:outline-2 dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="min-w-[1000px]">
          <div className="grid border-b border-gray-200 dark:border-gray-800" style={gridStyle}>
            <div className="sticky left-0 z-20 border-r border-gray-200 bg-gray-50 p-4 text-sm font-semibold dark:border-gray-800 dark:bg-gray-900">
              {t("equipment")}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day, index) => (
                <div
                  key={day}
                  className={`border-r border-gray-100 px-2 py-4 text-center text-xs dark:border-gray-800 ${
                    day === today
                      ? "bg-brand-50 font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-200"
                      : index >= 5
                        ? "bg-gray-50 dark:bg-gray-800"
                        : ""
                  }`}
                >
                  {dayLabel(day)}
                </div>
              ))}
            </div>
          </div>

          {visible.map((item) => {
            const entries = item.bookings
              .filter(intersects)
              .sort((a, b) => a.startDate.localeCompare(b.startDate));

            const overdue = item.bookings.some(
              (booking) =>
                booking.status === "ISSUED" && booking.endDate < today,
            );

            return (
              <div
                key={item.id}
                className="grid border-b border-gray-100 last:border-0 dark:border-gray-800"
                style={gridStyle}
              >
                <div className="sticky left-0 z-10 border-r border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                  <p className="break-words text-sm font-semibold">
                    {item.name}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {item.code} · {item.size}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    {inventory(`statuses.${item.status}`)}
                  </p>
                  {overdue && (
                    <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                      {live("overdue")}
                    </p>
                  )}
                </div>

                <div className="relative min-h-28">
                  <div aria-hidden="true" className="absolute inset-0 grid grid-cols-7">
                    {days.map((day, index) => (
                      <div
                        key={day}
                        className={`border-r border-gray-100 dark:border-gray-800 ${
                          index >= 5 ? "bg-gray-50 dark:bg-gray-800/40" : ""
                        }`}
                      />
                    ))}
                  </div>

                  <div className="relative grid grid-cols-7 gap-y-2 py-4">
                    {entries.map((entry, index) => {
                      const start = Math.max(0, offset(weekStart, entry.startDate));
                      const end = Math.min(6, offset(weekStart, entry.endDate));

                      return (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => setSelectedId(entry.id)}
                          aria-label={`${entry.customerName}, ${bookingsT(`statuses.${entry.status}`)}, ${formatBookingDate(entry.startDate)} — ${formatBookingDate(entry.endDate)}`}
                          style={{
                            gridColumn: `${start + 1} / ${end + 2}`,
                            gridRow: index + 1,
                          }}
                          className={`mx-1 min-w-0 rounded-lg px-2 py-3 text-start focus-visible:outline-2 focus-visible:outline-offset-2 ${
                            entry.status === "ISSUED"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
                          }`}
                        >
                          <span className="block truncate text-xs font-semibold">
                            {entry.customerName}
                          </span>
                          <span className="mt-1 block truncate text-xs">
                            {bookingsT(`statuses.${entry.status}`)}
                          </span>
                        </button>
                      );
                    })}

                    {entries.length === 0 && (
                      <p className="col-span-7 p-4 text-xs text-gray-400">
                        {t("available")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {visible.length === 0 && (
            <p className="p-10 text-center text-sm text-gray-500">
              {t("empty")}
            </p>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-500">{t("scrollHint")}</p>

      {visible.length > 0 && !hasBookings && (
        <p role="status" className="text-sm text-gray-500">
          {live("noBookings")}
        </p>
      )}

      {selected && (
        <BookingDetails
          key={selected.id}
          booking={selected}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}