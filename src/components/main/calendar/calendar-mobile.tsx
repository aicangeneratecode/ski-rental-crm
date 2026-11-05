"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { CalendarRental } from "./calendar-types";
import {
  addDays, formatFullDay, getMonthWeeks, overlaps, startOfWeek,
} from "./calendar-utils";

type Props = {
  anchor: string;
  today: string;
  rentals: CalendarRental[];
  mode: "month" | "week" | "day" | "agenda";
  onDay: (date: string) => void;
  onCreate: (date: string) => void;
  onRental: (id: string) => void;
  onMove: (id: string, date: string) => void;
};

const weekNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default function CalendarMobile({
  anchor, today, rentals, mode, onDay, onCreate, onRental, onMove,
}: Props) {
  const t = useTranslations("calendarWorkspace");
  const b = useTranslations("bookings");
  const days = (mode === "week" || mode === "day")
    ? [Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i))]
    : getMonthWeeks(anchor);
  const visible = rentals.filter(rental => overlaps(rental, anchor, anchor))
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.customerName.localeCompare(b.customerName, "ru"));

  return (
    <section className="space-y-4 md:hidden" aria-label={t("mobileCalendar")}>
      <div className="rounded-2xl border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-[#1b1e21]">
        <div className="grid grid-cols-7 gap-1 pb-1">
          {weekNames.map(day => <span key={day} className="py-1 text-center text-[10px] font-semibold text-gray-400">{day}</span>)}
        </div>
        {days.map((week) => (
          <div key={week[0]} className="grid grid-cols-7 gap-1">
            {week.map(day => {
              const count = rentals.filter(r => overlaps(r, day, day)).length;
              const outside = day.slice(0, 7) !== anchor.slice(0, 7);
              const selected = day === anchor;
              return (
                <button key={day} type="button" onClick={() => onDay(day)}
                  aria-pressed={selected}
                  aria-label={t("mobileDayLabel", { date: day, count })}
                  className={"flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-sm font-bold focus-visible:outline-2 focus-visible:outline-brand-500 " +
                    (selected ? "bg-brand-700 text-white dark:bg-brand-400 dark:text-gray-950" :
                      day === today ? "bg-brand-50 text-brand-800 dark:bg-brand-500/15 dark:text-brand-300" :
                      outside ? "text-gray-400 dark:text-gray-600" :
                        "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800")}>
                  {Number(day.slice(8, 10))}
                  <span className={"inline-flex min-h-1 min-w-1 rounded-full " +
                    (count ? selected ? "bg-white dark:bg-gray-900" : "bg-brand-500" : "bg-transparent")}
                    aria-hidden="true" />
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="min-w-0 text-sm font-bold capitalize">{formatFullDay(anchor)}</h3>
        <Button type="button" size="sm" onClick={() => onCreate(anchor)}>{t("createOnDay")}</Button>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{t("mobileHint")}</p>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 p-7 text-center text-sm text-gray-500 dark:border-gray-700">
          {t("noEvents")}
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map(rental => (
            <article key={rental.id} className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
              <button type="button" className="w-full text-start" onClick={() => onRental(rental.id)}>
                <p className="font-bold text-gray-900 dark:text-white">{rental.customerName}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {b(("statuses." + rental.status) as "statuses.RESERVED")}
                  {" · "}{rental.startDate} — {rental.endDate}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-gray-600 dark:text-gray-300">
                  {rental.items.map(item => item.name).join(" · ")}
                </p>
              </button>
              <div className="mt-3 flex items-center justify-end gap-2 border-t border-gray-100 pt-2 dark:border-gray-800">
                <Button type="button" size="sm" variant="outline" onClick={() => onRental(rental.id)}>
                  {t("openRental")}
                </Button>
                {rental.status === "RESERVED" && (
                  <Button type="button" size="sm" variant="outline" onClick={() => onMove(rental.id, addDays(rental.startDate, 1))}>
                    {t("moveBooking")}
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
