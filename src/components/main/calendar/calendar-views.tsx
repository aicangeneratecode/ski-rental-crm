"use client";

import { useTranslations } from "next-intl";
import type { CalendarInventory, CalendarRental } from "./calendar-types";
import { activeOn, addDays, endOfMonth, formatShortDate, overlaps, startOfMonth, startOfWeek } from "./calendar-utils";

type EventProps = {
  rental: CalendarRental;
  onRental: (id: string) => void;
  today: string;
};
function RentalAgendaItem({ rental, onRental, today }: EventProps) {
  const t = useTranslations("bookings");
  const w = useTranslations("calendarWorkspace");
  const late = rental.status === "ISSUED" && rental.endDate < today;
  const tone = late ? "text-red-600 dark:text-red-400"
    : rental.status === "RETURNED" ? "text-gray-500"
    : rental.status === "ISSUED" ? "text-sky-600 dark:text-sky-400"
    : "text-brand-700 dark:text-brand-400";
  return (
    <button type="button" onClick={() => onRental(rental.id)}
      className="flex w-full min-w-0 flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-start transition-colors hover:border-brand-300 hover:bg-brand-50/30 focus-visible:outline-2 focus-visible:outline-brand-500 dark:border-gray-800 dark:bg-[#1b1e21] dark:hover:border-brand-800 dark:hover:bg-brand-500/5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-gray-900 dark:text-white">{rental.customerName}</span>
          <span className={`text-xs font-semibold ${tone}`}>{late ? w("late") : t(`statuses.${rental.status}`)}</span>
          <span className="text-xs text-gray-400">#{rental.id.slice(0, 8)}</span>
        </div>
        <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
          {rental.items.map((item) => item.name).join(" · ")}
        </p>
      </div>
      <div className="text-end text-xs font-semibold tabular-nums text-gray-600 dark:text-gray-300">
        {formatShortDate(rental.startDate)} — {formatShortDate(rental.endDate)}
        <span className="mt-1 block text-[11px] font-normal text-gray-400">{w("openRental")}</span>
      </div>
    </button>
  );
}
type ListProps = { rentals: CalendarRental[]; anchor: string; today: string; mode: "day" | "agenda"; onRental: (id: string) => void };
export function CalendarAgenda({ rentals, anchor, today, mode, onRental }: ListProps) {
  const w = useTranslations("calendarWorkspace");
  const from = mode === "day" ? anchor : startOfMonth(anchor);
  const to = mode === "day" ? anchor : endOfMonth(anchor);
  const visible = rentals.filter((rental) => overlaps(rental, from, to))
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.customerName.localeCompare(b.customerName, "ru"));
  return (
    <section className="space-y-3">
      <p className="text-sm text-gray-500 dark:text-gray-400">{w("periodBookings", { count: visible.length })}</p>
      {visible.length === 0 ? (
        <p role="status" className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-[#1b1e21]">{w("noEvents")}</p>
      ) : (
        visible.map((rental) => <RentalAgendaItem key={rental.id} rental={rental} onRental={onRental} today={today} />)
      )}
    </section>
  );
}

type BoardProps = { rentals: CalendarRental[]; anchor: string; today: string; onRental: (id: string) => void };
export function CalendarBoard({ rentals, anchor, today, onRental }: BoardProps) {
  const t = useTranslations("bookings");
  const w = useTranslations("calendarWorkspace");
  const from = startOfMonth(anchor), to = endOfMonth(anchor);
  const visible = rentals.filter((rental) => overlaps(rental, from, to));
  const statuses = ["RESERVED", "ISSUED", "RETURNED"] as const;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {statuses.map((status) => {
        const items = visible.filter((rental) => rental.status === status);
        return (
          <section key={status} className="min-w-0 rounded-2xl border border-gray-200 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-[#181b1e]">
            <h2 className="flex items-center justify-between px-2 py-2 text-sm font-bold text-gray-900 dark:text-gray-100">
              {t(`statuses.${status}`)}
              <span className="rounded-lg bg-gray-200 px-2 py-1 text-xs tabular-nums text-gray-700 dark:bg-gray-700 dark:text-gray-200">{items.length}</span>
            </h2>
            <div className="mt-2 space-y-2">
              {items.map((rental) => <RentalAgendaItem key={rental.id} rental={rental} onRental={onRental} today={today} />)}
              {items.length === 0 && <p className="p-6 text-center text-xs text-gray-400">{w("noEvents")}</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}

type OccupancyProps = {
  rentals: CalendarRental[];
  inventory: CalendarInventory[];
  anchor: string;
  today: string;
  onRental: (id: string) => void;
};
export function CalendarOccupancy({ rentals, inventory, anchor, today, onRental }: OccupancyProps) {
  const w = useTranslations("calendarWorkspace");
  const weekStart = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  return (
    <section className="space-y-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">{w("occupancyHint")}</p>
      <div role="region" tabIndex={0} aria-label={w("occupancy")} className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-[#1b1e21]">
        <div className="min-w-[1050px]">
          <div className="grid grid-cols-[230px_repeat(7,minmax(110px,1fr))] border-b border-gray-200 bg-gray-50 text-xs font-bold dark:border-gray-800 dark:bg-[#202427]">
            <div className="border-e border-gray-200 px-4 py-3 dark:border-gray-800">{w("inventory")}</div>
            {days.map((day) => <div key={day} className={`border-e border-gray-100 px-2 py-3 text-center last:border-0 dark:border-gray-800 ${day === today ? "text-brand-700 dark:text-brand-400" : "text-gray-600 dark:text-gray-300"}`}>{formatShortDate(day)}</div>)}
          </div>
          {inventory.length === 0 && <p className="p-9 text-center text-sm text-gray-500">{w("noInventory")}</p>}
          {inventory.map((item) => (
            <div key={item.id} className="grid grid-cols-[230px_repeat(7,minmax(110px,1fr))] border-b border-gray-100 last:border-b-0 dark:border-gray-800">
              <div className="min-w-0 border-e border-gray-100 px-4 py-3 dark:border-gray-800">
                <p className="truncate text-xs font-bold text-gray-900 dark:text-white" title={item.name}>{item.name}</p>
                <p className="mt-1 text-[11px] text-gray-500">{item.code} · {item.size}</p>
                {item.status !== "READY" && <p className="mt-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">{w(item.status === "MAINTENANCE" ? "maintenance" : "archived")}</p>}
              </div>
              {days.map((day) => {
                const events = rentals.filter((rental) => rental.equipmentIds.includes(item.id) && rental.status !== "RETURNED"
                  && (activeOn(rental, day) || (rental.status === "ISSUED" && rental.endDate < today && day >= rental.endDate)));
                const booking = events[0];
                return (
                  <div key={day} className={`min-w-0 border-e border-gray-100 px-1.5 py-3 last:border-0 dark:border-gray-800 ${day === today ? "bg-brand-50/35 dark:bg-brand-500/5" : ""}`}>
                    {booking ? (
                      <button type="button" onClick={() => onRental(booking.id)}
                        title={events.map((e) => e.customerName).join(", ")}
                        className={`w-full truncate rounded-lg border px-2 py-2 text-start text-[11px] font-semibold hover:brightness-95 focus-visible:outline-2 focus-visible:outline-brand-500 ${booking.status === "ISSUED" && booking.endDate < today
                          ? "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
                          : booking.status === "ISSUED"
                            ? "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300"
                            : "border-brand-300 bg-brand-50 text-brand-800 dark:border-brand-800 dark:bg-brand-500/15 dark:text-brand-200"}`}>
                        {booking.customerName}{events.length > 1 ? ` +${events.length - 1}` : ""}
                      </button>
                    ) : (
                      <span className="block py-2 text-center text-xs text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
