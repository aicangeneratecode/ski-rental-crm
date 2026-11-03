"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatBookingDate } from "@/lib/bookings/types";

import {
  demoEquipment,
  demoEntries,
  type CalendarEntry,
} from "./demo-data";

const INITIAL_DATE = "2027-01-11";
const DAY_MS = 86_400_000;

const colors: Record<CalendarEntry["status"], string> = {
  reserved:
    "border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200",
  issued:
    "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
  maintenance:
    "border-gray-300 bg-gray-200 text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200",
};

function timestamp(value: string) {
  return Date.parse(`${value}T00:00:00.000Z`);
}

function addDays(value: string, days: number) {
  return new Date(timestamp(value) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

function dayOffset(start: string, value: string) {
  return Math.round((timestamp(value) - timestamp(start)) / DAY_MS);
}

function dayLabel(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export default function RentalCalendar() {
  const t = useTranslations("calendar");
  const [weekStart, setWeekStart] = useState(INITIAL_DATE);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CalendarEntry | null>(null);

  const days = Array.from({ length: 7 }, (_, index) =>
    addDays(weekStart, index),
  );
  const weekEnd = days[6];

  const search = query.trim().toLowerCase();
  const equipment = demoEquipment.filter((item) =>
    `${item.code} ${t(`examples.${item.name}`)} ${item.size}`
      .toLowerCase()
      .includes(search),
  );

  const visibleEntries = demoEntries.filter(
    (entry) =>
      entry.startDate <= weekEnd &&
      entry.endDate >= weekStart &&
      equipment.some((item) => item.id === entry.equipmentId),
  );

  const selectedEquipment = demoEquipment.find(
    (item) => item.id === selected?.equipmentId,
  );

  return (
    <div className="space-y-5 text-gray-900 dark:text-gray-100">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          {t("demo")}
        </p>
        <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
          {t("demoHint")}
        </p>
      </div>

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("description")}
          </p>
        </div>
        <Link
          href="/bookings"
          className={buttonVariants({ variant: "outline" })}
        >
          {t("list")}
        </Link>
      </header>

      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
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
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setWeekStart(INITIAL_DATE)}
          >
            {t("reset")}
          </Button>
        </div>

        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("search")}
          aria-label={t("search")}
        />

        <div className="flex flex-wrap gap-3 text-xs">
          {(["reserved", "issued", "maintenance"] as const).map(
            (status) => (
              <span
                key={status}
                className={`rounded-full border px-3 py-1 ${colors[status]}`}
              >
                {t(status)}
              </span>
            ),
          )}
        </div>
      </section>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t("hint")}
      </p>

      <div
        role="region"
        aria-label={t("title")}
        tabIndex={0}
        className="overflow-x-auto rounded-2xl border border-gray-200 bg-white focus-visible:outline-2 dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="min-w-[1000px]">
          <div
            className="grid border-b border-gray-200 dark:border-gray-800"
            style={{ gridTemplateColumns: "220px minmax(0, 1fr)" }}
          >
            <div className="sticky left-0 z-20 border-r border-gray-200 bg-gray-50 p-4 text-sm font-semibold dark:border-gray-800 dark:bg-gray-900">
              {t("equipment")}
            </div>

            <div className="grid grid-cols-7">
              {days.map((day, index) => (
                <div
                  key={day}
                  className={`border-r border-gray-100 px-2 py-4 text-center text-xs font-medium last:border-r-0 dark:border-gray-800 ${
                    index >= 5
                      ? "bg-gray-50 dark:bg-gray-800/50"
                      : ""
                  }`}
                >
                  {dayLabel(day)}
                </div>
              ))}
            </div>
          </div>

          {equipment.map((item) => {
            const entries = visibleEntries.filter(
              (entry) => entry.equipmentId === item.id,
            );

            return (
              <div
                key={item.id}
                className="grid border-b border-gray-100 last:border-b-0 dark:border-gray-800"
                style={{ gridTemplateColumns: "220px minmax(0, 1fr)" }}
              >
                <div className="sticky left-0 z-10 border-r border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                  <p className="text-sm font-semibold">
                    {t(`examples.${item.name}`)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {item.code} · {item.size}
                  </p>
                </div>

                <div className="relative min-h-24">
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 grid grid-cols-7"
                  >
                    {days.map((day, index) => (
                      <div
                        key={day}
                        className={`border-r border-gray-100 last:border-r-0 dark:border-gray-800 ${
                          index >= 5
                            ? "bg-gray-50 dark:bg-gray-800/50"
                            : ""
                        }`}
                      />
                    ))}
                  </div>

                  <div className="relative grid h-full min-h-24 grid-cols-7 items-center py-4">
                    {entries.map((entry) => {
                      const start = Math.max(
                        0,
                        dayOffset(weekStart, entry.startDate),
                      );
                      const end = Math.min(
                        6,
                        dayOffset(weekStart, entry.endDate),
                      );

                      const label =
                        entry.status === "maintenance"
                          ? t("maintenance")
                          : entry.customer;

                      return (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => setSelected(entry)}
                          aria-label={`${label}, ${t(entry.status)}, ${formatBookingDate(entry.startDate)} — ${formatBookingDate(entry.endDate)}`}
                          title={`${label} · ${entry.id}`}
                          style={{
                            gridColumn: `${start + 1} / ${end + 2}`,
                            gridRow: 1,
                          }}
                          className={`mx-1 min-w-0 rounded-lg border px-2 py-2 text-start transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 ${colors[entry.status]}`}
                        >
                          <span className="block truncate text-xs font-semibold">
                            {label}
                          </span>
                          <span className="mt-1 block truncate text-[11px]">
                            {t(entry.status)}
                          </span>
                        </button>
                      );
                    })}

                    {entries.length === 0 && (
                      <p className="col-span-7 px-4 text-xs text-gray-400">
                        {t("available")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {equipment.length === 0 && (
            <p className="p-10 text-center text-sm text-gray-500">
              {t("empty")}
            </p>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-500">{t("scrollHint")}</p>

      {equipment.length > 0 && visibleEntries.length === 0 && (
        <p role="status" className="text-sm text-gray-500">
          {t("noBookings")}
        </p>
      )}

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.id}</DialogTitle>
                <DialogDescription>{t("detailHint")}</DialogDescription>
              </DialogHeader>

              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-gray-500">{t("status")}</dt>
                  <dd className="mt-1 font-medium">{t(selected.status)}</dd>
                </div>

                {selected.customer && (
                  <div>
                    <dt className="text-gray-500">{t("customer")}</dt>
                    <dd className="mt-1">{selected.customer}</dd>
                  </div>
                )}

                <div>
                  <dt className="text-gray-500">{t("equipment")}</dt>
                  <dd className="mt-1">
                    {selectedEquipment &&
                      `${selectedEquipment.code} · ${t(`examples.${selectedEquipment.name}`)}`}
                  </dd>
                </div>

                <div>
                  <dt className="text-gray-500">{t("period")}</dt>
                  <dd className="mt-1">
                    {formatBookingDate(selected.startDate)}
                    {" — "}
                    {formatBookingDate(selected.endDate)}
                  </dd>
                </div>
              </dl>

              {selected.status === "maintenance" && (
                <p className="rounded-xl bg-gray-50 p-4 text-sm dark:bg-gray-800">
                  {t("serviceHint")}
                </p>
              )}

              <Button type="button" onClick={() => setSelected(null)}>
                {t("close")}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}