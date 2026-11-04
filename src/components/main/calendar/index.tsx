"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RentalDatePicker from "@/components/ui/rental-date-picker";
import BookingDetails from "@/components/main/bookings/booking-details";
import type { CalendarFilters, CalendarInventory, CalendarRental } from "./calendar-types";
import { addDays, applyCalendarFilters, endOfMonth, formatFullDay, formatMonth, formatShortDate,
  overlaps, shiftMonth, startOfMonth, startOfWeek } from "./calendar-utils";
import CalendarTimeline from "./calendar-timeline";
import { CalendarAgenda, CalendarBoard, CalendarOccupancy } from "./calendar-views";

type Props = { rentals: CalendarRental[]; inventory: CalendarInventory[]; today: string };
type Pane = "calendar" | "board" | "occupancy";
type PeriodMode = "month" | "week" | "day" | "agenda";
const modes: PeriodMode[] = ["month", "week", "day", "agenda"];
const panes: Pane[] = ["calendar", "board", "occupancy"];
const emptyFilters: CalendarFilters = { equipmentId: "", tariff: "", customerId: "", staffId: "", search: "" };
const selectStyle = "h-10 w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 shadow-theme-xs outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";

function periodLabel(anchor: string, pane: Pane, mode: PeriodMode) {
  if (pane === "board" || (pane === "calendar" && (mode === "month" || mode === "agenda")))
    return formatMonth(anchor);
  if (pane === "occupancy" || mode === "week") {
    const first = startOfWeek(anchor);
    return `${formatShortDate(first)} — ${formatShortDate(addDays(first, 6))}`;
  }
  return formatFullDay(anchor);
}
function rentalScope(anchor: string, pane: Pane, mode: PeriodMode) {
  if (pane === "board" || (pane === "calendar" && (mode === "month" || mode === "agenda"))) {
    return [startOfMonth(anchor), endOfMonth(anchor)];
  }
  if (pane === "occupancy" || mode === "week") {
    const first = startOfWeek(anchor);
    return [first, addDays(first, 6)];
  }
  return [anchor, anchor];
}

export default function RentalCalendar({ rentals, inventory, today }: Props) {
  const t = useTranslations("calendarWorkspace");
  const calendarT = useTranslations("calendar");
  const bookT = useTranslations("bookings");
  const router = useRouter();
  const [anchor, setAnchor] = useState(today);
  const [pane, setPane] = useState<Pane>("calendar");
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [filters, setFilters] = useState<CalendarFilters>(emptyFilters);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshing, startTransition] = useTransition();

  const visibleRentals = useMemo(() => applyCalendarFilters(rentals, filters), [rentals, filters]);
  const visibleInventory = useMemo(() => inventory.filter((item) =>
    (!filters.equipmentId || item.id === filters.equipmentId) &&
    (!filters.tariff || item.tariff === filters.tariff) &&
    (!filters.search || `${item.name} ${item.code} ${item.size}`.toLocaleLowerCase("ru").includes(filters.search.toLocaleLowerCase("ru")) ||
      visibleRentals.some((rental) => rental.equipmentIds.includes(item.id)))
  ), [inventory, filters, visibleRentals]);
  const tariffs = useMemo(() => [...new Set(inventory.map((item) => item.tariff))].sort((a, b) => a.localeCompare(b, "ru")), [inventory]);
  const customers = useMemo(() => [...new Map(rentals.map((r) => [r.customerId, r.customerName])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1], "ru")), [rentals]);
  const staff = useMemo(() => [...new Map(rentals.map((r) => [r.createdById, r.createdByName])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1], "ru")), [rentals]);
  const selected = rentals.find((rental) => rental.id === selectedId);
  const [scopeStart, scopeEnd] = rentalScope(anchor, pane, periodMode);
  const count = visibleRentals.filter((rental) => overlaps(rental, scopeStart, scopeEnd)).length;
  const filtered = Object.values(filters).some(Boolean);

  function setFilter(key: keyof CalendarFilters, value: string) {
    setFilters((previous) => ({ ...previous, [key]: value }));
  }
  function move(direction: number) {
    if (pane === "board" || (pane === "calendar" && (periodMode === "month" || periodMode === "agenda"))) {
      setAnchor((current) => shiftMonth(current, direction));
    } else if (pane === "occupancy" || periodMode === "week") {
      setAnchor((current) => addDays(current, direction * 7));
    } else {
      setAnchor((current) => addDays(current, direction));
    }
  }
  function showDay(day: string) {
    setAnchor(day);
    setPane("calendar");
    setPeriodMode("day");
  }

  return (
    <div className="space-y-5 text-gray-900 dark:text-gray-100">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">TOP RIDE / CALENDAR</p>
          <h1 className="text-3xl font-extrabold tracking-tight">{calendarT("title")}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("subtitle")}</p>
        </div>
        <div role="group" aria-label={t("displayType")} className="flex max-w-full flex-wrap gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-[#1b1e21]">
          {panes.map((value) => (
            <button type="button" key={value} aria-pressed={pane === value} onClick={() => setPane(value)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand-500 sm:text-sm ${pane === value
                ? "bg-brand-700 text-white dark:bg-brand-400 dark:text-gray-950"
                : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"}`}>
              {t(`panes.${value}`)}
            </button>
          ))}
        </div>
      </header>

      <section aria-label={t("filters")} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-[#1b1e21]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="min-w-0 text-xs font-semibold text-gray-500 dark:text-gray-400">
            <span className="mb-1.5 block">{t("inventory")}</span>
            <select value={filters.equipmentId} onChange={(e) => setFilter("equipmentId", e.target.value)} className={selectStyle}>
              <option value="">{t("allEquipment")}</option>
              {inventory.map((item) => <option value={item.id} key={item.id}>{item.code} · {item.name} ({item.size})</option>)}
            </select>
          </label>
          <label className="min-w-0 text-xs font-semibold text-gray-500 dark:text-gray-400">
            <span className="mb-1.5 block">{t("tariff")}</span>
            <select value={filters.tariff} onChange={(e) => setFilter("tariff", e.target.value)} className={selectStyle}>
              <option value="">{t("allTariffs")}</option>
              {tariffs.map((tariff) => <option value={tariff} key={tariff}>{tariff}</option>)}
            </select>
          </label>
          <label className="min-w-0 text-xs font-semibold text-gray-500 dark:text-gray-400">
            <span className="mb-1.5 block">{t("client")}</span>
            <select value={filters.customerId} onChange={(e) => setFilter("customerId", e.target.value)} className={selectStyle}>
              <option value="">{t("allClients")}</option>
              {customers.map(([id, name]) => <option value={id} key={id}>{name}</option>)}
            </select>
          </label>
          <label className="min-w-0 text-xs font-semibold text-gray-500 dark:text-gray-400">
            <span className="mb-1.5 block">{t("staff")}</span>
            <select value={filters.staffId} onChange={(e) => setFilter("staffId", e.target.value)} className={selectStyle}>
              <option value="">{t("allStaff")}</option>
              {staff.map(([id, name]) => <option value={id} key={id}>{name}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="min-w-[220px] flex-1">
            <Input value={filters.search} onChange={(e) => setFilter("search", e.target.value)}
              placeholder={t("search")} aria-label={t("search")} />
          </div>
          {filtered && <Button type="button" size="sm" variant="outline" onClick={() => setFilters(emptyFilters)}>{t("clear")}</Button>}
          <span className="text-xs text-gray-500 dark:text-gray-400">{t("totalCount", { count })}</span>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-[#1b1e21]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="icon-sm" aria-label={t("previous")}
              onClick={() => move(-1)}>←</Button>
            <Button type="button" variant="outline" size="icon-sm" aria-label={t("next")}
              onClick={() => move(1)}>→</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setAnchor(today)}>{t("today")}</Button>
            <div className="w-38">
              <RentalDatePicker label={t("jump")} value={anchor} clearable={false} onChange={(value) => { if (value) setAnchor(value); }} />
            </div>
          </div>
          <h2 aria-live="polite" className="min-w-0 text-center text-base font-extrabold capitalize tracking-tight sm:text-lg">{periodLabel(anchor, pane, periodMode)}</h2>
          <div className="flex flex-wrap items-center gap-2">
            {pane === "calendar" && (
              <div role="group" aria-label={t("periodModes")} className="flex flex-wrap rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800">
                {modes.map((mode) => <button key={mode} type="button" aria-pressed={periodMode === mode}
                  onClick={() => setPeriodMode(mode)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-brand-500 ${periodMode === mode
                    ? "bg-brand-700 text-white shadow-xs dark:bg-brand-400 dark:text-gray-950"
                    : "text-gray-600 hover:text-brand-700 dark:text-gray-300 dark:hover:text-brand-300"}`}>{t(`modes.${mode}`)}</button>)}
              </div>
            )}
            <Button type="button" variant="ghost" size="icon-sm" aria-label={t("refresh")}
              title={t("refresh")} disabled={refreshing} onClick={() => startTransition(() => router.refresh())}>
              ↻
            </Button>
            <Link href="/bookings" className={buttonVariants({ variant: "outline", size: "sm" })}>{t("rentals")}</Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-brand-500" />{bookT("statuses.RESERVED")}</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-sky-500" />{bookT("statuses.ISSUED")}</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-gray-400" />{bookT("statuses.RETURNED")}</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-red-500" />{t("late")}</span>
        </div>
        {pane === "calendar" && (periodMode === "month" || periodMode === "week") && (
          <CalendarTimeline anchor={anchor} today={today} rentals={visibleRentals} mode={periodMode}
            onRental={setSelectedId} onDay={showDay} />
        )}
        {pane === "calendar" && (periodMode === "day" || periodMode === "agenda") && (
          <CalendarAgenda anchor={anchor} today={today} mode={periodMode} rentals={visibleRentals} onRental={setSelectedId} />
        )}
        {pane === "board" && (
          <CalendarBoard anchor={anchor} today={today} rentals={visibleRentals} onRental={setSelectedId} />
        )}
        {pane === "occupancy" && (
          <CalendarOccupancy anchor={anchor} today={today} rentals={visibleRentals}
            inventory={visibleInventory} onRental={setSelectedId} />
        )}
        <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">{t("dateNote")}</p>
      </section>

      {selected && <BookingDetails key={selected.id} booking={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
