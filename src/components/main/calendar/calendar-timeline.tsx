"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { CalendarRental } from "./calendar-types";
import { formatShortDate, getMonthWeeks, hiddenByDay, layoutWeek, startOfWeek, addDays } from "./calendar-utils";

type Props = {
  anchor: string;
  today: string;
  rentals: CalendarRental[];
  mode: "month" | "week";
  onRental: (id: string) => void;
  onDay: (date: string) => void;
  onCreate: (date: string) => void;
  onMove: (id: string, startDate: string) => void;
};

const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function eventColor(rental: CalendarRental, today: string) {
  if (rental.status === "ISSUED" && rental.endDate < today)
    return "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/70 dark:text-red-300";
  if (rental.status === "ISSUED")
    return "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-200";
  if (rental.status === "RETURNED")
    return "border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";
  return "border-brand-300 bg-brand-50 text-brand-900 dark:border-brand-800 dark:bg-brand-500/15 dark:text-brand-200";
}

export default function CalendarTimeline({ anchor, today, rentals, mode, onRental, onDay, onCreate, onMove }: Props) {
  const t = useTranslations("calendarWorkspace");
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const weeks = mode === "month"
    ? getMonthWeeks(anchor)
    : [Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(anchor), index))];
  const visibleLanes = mode === "month" ? 3 : 5;

  return (
    <div role="region" aria-label={t("timeline")} tabIndex={0}
      className="hidden overflow-x-auto md:block rounded-2xl border border-gray-200 bg-white focus-visible:outline-2 focus-visible:outline-brand-500 dark:border-gray-800 dark:bg-[#1b1e21]">
      <div className="min-w-[840px]">
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/70 dark:border-gray-800 dark:bg-[#202427]">
          {weekdays.map((day, index) => (
            <div key={day}
              className={`border-e border-gray-100 px-3 py-3 text-center text-xs font-bold uppercase tracking-[0.08em] last:border-e-0 dark:border-gray-800 ${index > 4 ? "text-gray-400" : "text-gray-600 dark:text-gray-300"}`}>
              {day}
            </div>
          ))}
        </div>

        {weeks.map((days) => {
          const segments = layoutWeek(rentals, days[0]);
          const hidden = hiddenByDay(segments, visibleLanes);
          const baseHeight = mode === "month" ? "min-h-[166px]" : "min-h-[224px]";

          return (
            <div key={days[0]} className={`relative ${baseHeight} border-b border-gray-200 last:border-b-0 dark:border-gray-800`}
              onDragOver={(event) => {
                if (!event.dataTransfer.types.includes("text/plain")) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                const rect = event.currentTarget.getBoundingClientRect();
                const index = Math.max(0, Math.min(6, Math.floor((event.clientX - rect.left) / rect.width * 7)));
                setDropTarget(days[index]);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDropTarget(null);
                const id = event.dataTransfer.getData("text/plain");
                const rect = event.currentTarget.getBoundingClientRect();
                const index = Math.max(0, Math.min(6, Math.floor((event.clientX - rect.left) / rect.width * 7)));
                if (rentals.some(r => r.id === id && r.status === "RESERVED")) onMove(id, days[index]);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropTarget(null);
              }}>
              <div className="absolute inset-0 grid grid-cols-7" aria-hidden="false">
                {days.map((day, dayIndex) => {
                  const outside = mode === "month" && day.slice(0, 7) !== anchor.slice(0, 7);
                  const isToday = day === today;
                  return (
                    <div key={day} className={`relative border-e border-gray-100 last:border-e-0 dark:border-gray-800
                      ${outside ? "bg-gray-50/70 dark:bg-white/2" : dayIndex >= 5 ? "bg-gray-50/30 dark:bg-white/1" : ""}
                      ${isToday ? "bg-brand-50/50 dark:bg-brand-500/5" : ""}
                      ${dropTarget === day ? "bg-brand-100 ring-2 ring-inset ring-brand-500 dark:bg-brand-500/20" : ""}`}>
                      <button type="button" onClick={() => onCreate(day)} aria-label={t("createOnDate", { date: formatShortDate(day) })}
                        className={`absolute end-2 top-1.5 z-10 flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-colors hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-brand-500 dark:hover:bg-brand-500/20
                        ${isToday ? "bg-brand-700 text-white dark:bg-brand-400 dark:text-gray-950" : outside ? "text-gray-400" : "text-gray-700 dark:text-gray-300"}`}>
                        {Number(day.slice(8, 10))}
                      </button>
                      {hidden[dayIndex] > 0 && (
                        <button type="button" onClick={() => onDay(day)}
                          aria-label={t("moreForDay", { count: hidden[dayIndex], date: formatShortDate(day) })}
                          className="absolute inset-x-1 bottom-2 z-20 truncate rounded-md bg-gray-100 px-1 py-1 text-center text-[11px] font-semibold text-gray-600 hover:bg-brand-100 hover:text-brand-800 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-brand-500/20">
                          {t("more", { count: hidden[dayIndex] })}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="pointer-events-none absolute inset-x-0 top-[40px] grid grid-cols-7 gap-y-1"
                style={{ gridTemplateRows: `repeat(${visibleLanes}, 23px)` }}>
                {segments.filter((segment) => segment.lane < visibleLanes).map(({ rental, start, end, lane }) => (
                  <button key={rental.id} type="button"
                    draggable={rental.status === "RESERVED"}
                    onDragStart={(event) => {
                      if (rental.status !== "RESERVED") { event.preventDefault(); return; }
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", rental.id);
                    }}
                    onDragEnd={() => setDropTarget(null)}
                    onClick={() => onRental(rental.id)}
                    title={`${rental.customerName} · ${rental.startDate} — ${rental.endDate} · ${rental.items.map((item) => item.name).join(", ")}`}
                    aria-label={t("eventLabel", { name: rental.customerName, start: rental.startDate, end: rental.endDate })}
                    style={{ gridColumn: `${start + 1} / ${end + 2}`, gridRow: lane + 1 }}
                    className={`pointer-events-auto mx-0.5 flex h-[22px] ${rental.status === "RESERVED" ? "cursor-grab active:cursor-grabbing" : ""} min-w-0 items-center overflow-hidden rounded-md border px-2 text-start text-[11px] font-semibold shadow-xs transition-colors hover:brightness-95 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500 ${eventColor(rental, today)}`}>
                    <span className="min-w-0 truncate">
                      <span className="font-extrabold">{rental.customerName}</span>
                      {" · "}
                      {rental.items.map((item) => item.name).join(", ")}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
