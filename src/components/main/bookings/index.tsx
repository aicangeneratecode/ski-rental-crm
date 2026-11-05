"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import RentalDatePicker from "@/components/ui/rental-date-picker";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BookingCustomer, BookingEquipment } from "@/lib/bookings/types";
import BookingDetails from "./booking-details";
import BookingForm from "./booking-form";
import BookingRentalCard from "./booking-rental-card";
import {
  filterRentals, matchesRentalView, type RentalFilters, type RentalRow,
  type RentalSort, type RentalView,
} from "./booking-list-utils";

type Props = { rows: RentalRow[]; customers: BookingCustomer[]; equipment: BookingEquipment[]; today: string; prefillCustomerId?:string; repeatBookingId?:string };
const views: RentalView[] = ["all", "pickup", "return", "active", "attention", "balance", "reserved", "returned", "cancelled", "archived"];
const highlights: RentalView[] = ["pickup", "return", "active", "attention"];
const sortOptions: RentalSort[] = ["priority", "newest", "startAsc", "startDesc", "endAsc", "endDesc", "nameAsc", "amountDesc", "balanceDesc"];
const defaultFilters: RentalFilters = { view: "all", query: "", from: "", to: "", balanceOnly: false, sort: "priority" };
const selectClasses = "h-10 min-w-0 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";

export default function Bookings({ rows, customers, equipment, today, prefillCustomerId, repeatBookingId }: Props) {
  const t = useTranslations("bookings");
  const w = useTranslations("bookings.workspace");
  const calendarT = useTranslations("calendar");
  const router = useRouter();

  const [filters, setFilters] = useState<RentalFilters>(defaultFilters);
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [compact, setCompact] = useState(false);
  const [open, setOpen] = useState(Boolean(prefillCustomerId&&customers.some(c=>c.id===prefillCustomerId)));
  const [saved, setSaved] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; mode: "edit" | "extend" } | null>(null);
  const [refreshing, startTransition] = useTransition();

  const invalidDates = Boolean(filters.from && filters.to && filters.from > filters.to);
  const filtered = useMemo(() => filterRentals(rows, filters, today), [rows, filters, today]);
  const counts = useMemo(() => Object.fromEntries(views.map((view) =>
    [view, rows.filter((row) => matchesRentalView(row, view, today)).length])) as Record<RentalView, number>,
    [rows, today]);
  const maxPage = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, maxPage);
  const shown = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selected = rows.find((row) => row.id === selectedId);
  const editingBooking = rows.find((row) => row.id === editing?.id);
  const canCreate = equipment.some((item) => item.status === "READY" || item.status === undefined);
  const repeatFrom = rows.find(row=>row.id===repeatBookingId&&row.customerId===prefillCustomerId);

  function openEdit(id: string, mode: "edit" | "extend") {
    setSelectedId(null);
    setSaved(false);
    setEditing({ id, mode });
  }

  function setFilter<K extends keyof RentalFilters>(key: K, value: RentalFilters[K]) {
    setFilters((previous) => ({ ...previous, [key]: value }));
    setPage(1);
  }
  function reset() {
    setFilters(defaultFilters);
    setPage(1);
  }
  function refresh() {
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100">
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">TOP RIDE / RENTALS</p>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{w("title")}</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{w("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={refreshing} onClick={refresh}>{w(refreshing ? "refreshing" : "refresh")}</Button>
          <Link href="/calendar" className={buttonVariants({ variant: "outline", size: "sm" })}>{calendarT("title")}</Link>
          <Button type="button" size="sm" disabled={!canCreate} onClick={() => { setSaved(false); setOpen(true); }}>+ {t("add")}</Button>
        </div>
      </header>

      {!canCreate && <p role="note" className="text-sm text-amber-700 dark:text-amber-400">{t("setupHint")}</p>}
      {saved && <p role="status" className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{t("saved")}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <button type="button" aria-pressed={filters.view === "all"} onClick={() => setFilter("view", "all")}
          className={`rounded-2xl border p-4 text-start shadow-theme-xs transition-colors hover:border-brand-300 dark:hover:border-brand-700 ${filters.view === "all" ? "border-brand-400 bg-brand-50 dark:border-brand-700 dark:bg-brand-500/10" : "border-gray-200 bg-white dark:border-gray-800 dark:bg-[#1b1e21]"}`}>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{w("metrics.all")}</span>
          <strong className="mt-2 block text-2xl font-bold tabular-nums">{counts.all}</strong>
        </button>
        {highlights.map((view) => (
          <button key={view} type="button" aria-pressed={filters.view === view} onClick={() => setFilter("view", view)}
            className={`rounded-2xl border p-4 text-start shadow-theme-xs transition-colors hover:border-brand-300 dark:hover:border-brand-700 ${filters.view === view ? "border-brand-400 bg-brand-50 dark:border-brand-700 dark:bg-brand-500/10" : "border-gray-200 bg-white dark:border-gray-800 dark:bg-[#1b1e21]"}`}>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{w(`metrics.${view}`)}</span>
            <strong className={`mt-2 block text-2xl font-bold tabular-nums ${view === "attention" && counts[view] > 0 ? "text-red-600 dark:text-red-400" : ""}`}>{counts[view]}</strong>
          </button>
        ))}
      </div>

      <section aria-label={w("controls")} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-[#1b1e21]">
        <div className="flex gap-1 overflow-x-auto border-b border-gray-100 p-3 dark:border-gray-800">
          {views.map((view) => (
            <button key={view} type="button" aria-pressed={filters.view === view}
              onClick={() => setFilter("view", view)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors sm:text-sm ${filters.view === view ? "bg-brand-700 text-white shadow-theme-xs dark:bg-brand-400 dark:text-gray-950" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"}`}>
              {w(`views.${view}`)}
              <span className={`rounded-md px-1.5 py-0.5 text-[10px] tabular-nums ${filters.view === view ? "bg-white/20 text-white dark:bg-black/10 dark:text-gray-950" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300"}`}>{counts[view]}</span>
            </button>
          ))}
        </div>

        <div className="grid gap-3 p-4 md:grid-cols-[minmax(240px,1fr)_minmax(190px,230px)_auto] md:items-end">
          <div>
            <label htmlFor="rental-search" className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">{w("searchLabel")}</label>
            <Input id="rental-search" value={filters.query} onChange={(event) => setFilter("query", event.target.value)}
              placeholder={t("layout.search")} autoComplete="off" />
          </div>
          <div>
            <label htmlFor="rental-sort" className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">{w("sortLabel")}</label>
            <select id="rental-sort" value={filters.sort} onChange={(event) => setFilter("sort", event.target.value as RentalSort)}
              className={`${selectClasses} w-full`}>
              {sortOptions.map((option) => <option key={option} value={option}>{w(`sort.${option}`)}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-start gap-2">
            <button type="button" aria-pressed={!compact} onClick={() => setCompact(false)}
              className={`${selectClasses} px-3 ${!compact ? "border-brand-400 text-brand-700 dark:text-brand-400" : ""}`}>{w("comfortable")}</button>
            <button type="button" aria-pressed={compact} onClick={() => setCompact(true)}
              className={`${selectClasses} px-3 ${compact ? "border-brand-400 text-brand-700 dark:text-brand-400" : ""}`}>{w("compact")}</button>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 border-t border-gray-100 px-4 py-3 dark:border-gray-800">
          <div className="min-w-[145px] flex-1 sm:max-w-56">
            <label htmlFor="rental-from" className="mb-1.5 block text-xs text-gray-500">{t("layout.from")}</label>
            <RentalDatePicker id="rental-from" label={t("layout.from")} value={filters.from} invalid={invalidDates} onChange={(value) => setFilter("from", value)} />
          </div>
          <div className="min-w-[145px] flex-1 sm:max-w-56">
            <label htmlFor="rental-to" className="mb-1.5 block text-xs text-gray-500">{t("layout.to")}</label>
            <RentalDatePicker id="rental-to" label={t("layout.to")} value={filters.to} min={filters.from || undefined} invalid={invalidDates} onChange={(value) => setFilter("to", value)} />
          </div>
          <label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={filters.balanceOnly} onChange={(event) => setFilter("balanceOnly", event.target.checked)}
              className="size-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 dark:border-gray-600" />
            {w("balanceOnly")}
          </label>
          <Button type="button" size="sm" variant="ghost" onClick={reset}>{t("layout.reset")}</Button>
        </div>
        {invalidDates && <p role="alert" className="px-4 pb-3 text-sm text-red-600">{t("layout.invalidDates")}</p>}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p role="status" className="text-sm font-semibold text-gray-800 dark:text-gray-200">{w("found", { found: filtered.length, total: rows.length })}</p>
          <p className="mt-1 text-xs text-gray-500">{w("dateNotice")}</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-500">
          {w("perPage")}
          <select aria-label={w("perPage")} className={selectClasses} value={pageSize}
            onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
            {[20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-14 text-center dark:border-gray-700 dark:bg-[#1b1e21]">
          <h2 className="font-semibold">{rows.length === 0 ? t("empty") : t("layout.empty")}</h2>
          <p className="mt-2 text-sm text-gray-500">{t("layout.emptyHint")}</p>
          {rows.length > 0 && <Button type="button" variant="outline" className="mt-5" onClick={reset}>{t("layout.reset")}</Button>}
        </div>
      ) : (
        <div className={compact ? "space-y-2" : "space-y-3"}>
          {shown.map((row) => <BookingRentalCard key={row.id} row={row} today={today} compact={compact} onOpen={setSelectedId} onEdit={openEdit} />)}
        </div>
      )}

      {filtered.length > pageSize && (
        <nav aria-label={w("pages")} className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-5 dark:border-gray-800">
          <p className="text-sm text-gray-500">
            {w("pagination", { start: (currentPage - 1) * pageSize + 1, end: Math.min(currentPage * pageSize, filtered.length), total: filtered.length })}
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>{w("previous")}</Button>
            <span className="px-2 text-xs font-semibold text-gray-600 dark:text-gray-300">{w("pageOf", { page: currentPage, total: maxPage })}</span>
            <Button type="button" size="sm" variant="outline" disabled={currentPage >= maxPage} onClick={() => setPage((value) => Math.min(maxPage, value + 1))}>{w("next")}</Button>
          </div>
        </nav>
      )}

      {selected && <BookingDetails key={selected.id} booking={selected} onEdit={openEdit} onClose={() => setSelectedId(null)} />}
      {editingBooking && <BookingForm key={`${editingBooking.id}-${editingBooking.version}-${editing?.mode}`} booking={editingBooking} editMode={editing?.mode} customers={customers} equipment={equipment} onClose={() => setEditing(null)} onSaved={() => setSaved(true)} />}
      {open && <BookingForm customers={customers} equipment={equipment} initialCustomerId={prefillCustomerId} repeatFrom={repeatFrom} onClose={() => setOpen(false)} onSaved={() => setSaved(true)} />}
    </div>
  );
}
