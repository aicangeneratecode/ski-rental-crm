"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusIcon } from "@/icons";
import {
  filterAndSortCustomers,
  type CustomerBalanceFilter,
  type CustomerDirection,
  type CustomerListRow,
  type CustomerSort,
} from "@/lib/customers/list-utils";
import CustomerDetails from "./customer-details";
import CustomerForm from "./customer-form";
import CustomerListItem from "./customer-list-item";
import CustomerMergeDialog from "./customer-merge-dialog";

interface CustomersProps {
  rows: CustomerListRow[];
}

const sortFields: CustomerSort[] = ["createdAt", "name", "balance", "rentalCount"];
const directions: CustomerDirection[] = ["desc", "asc"];
const balanceFilters: CustomerBalanceFilter[] = ["all", "withBalance", "settled"];
const selectClass = "h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 shadow-theme-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";

export default function Customers({ rows }: CustomersProps) {
  const t = useTranslations("customers");
  const w = useTranslations("customersWorkspace");
  const router = useRouter();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<CustomerListRow | "new" | null>(null);
  const [merging, setMerging] = useState<CustomerListRow | null>(null);
  const [saved, setSaved] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<CustomerSort>("createdAt");
  const [direction, setDirection] = useState<CustomerDirection>("desc");
  const [balanceFilter, setBalanceFilter] = useState<CustomerBalanceFilter>("all");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);

  const selectedCustomer = rows.find((row) => row.id === selectedId);
  const visible = useMemo(
    () => filterAndSortCustomers(rows, { query, sort, direction, balanceFilter }),
    [rows, query, sort, direction, balanceFilter],
  );
  const maxPage = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, maxPage);
  const pageRows = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const withBalanceCount = rows.filter((row) => row.balance > 0).length;

  function resetFilters() {
    setQuery("");
    setSort("createdAt");
    setDirection("desc");
    setBalanceFilter("all");
    setPage(1);
  }
  function startEdit(value: CustomerListRow | "new") {
    setSaved(false);
    setEditing(value);
  }
  function refresh() {
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-5 text-gray-900 dark:text-gray-100">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.19em] text-brand-600 dark:text-brand-400">TOP RIDE / CUSTOMERS</p>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t("title")}</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{w("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" disabled={refreshing} onClick={refresh}>
            {w(refreshing ? "refreshing" : "refresh")}
          </Button>
          <Button type="button" size="sm" onClick={() => startEdit("new")}>
            <PlusIcon className="size-4" />{t("add")}
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-medium text-gray-500 shadow-theme-xs dark:border-gray-800 dark:bg-[#1b1e21] dark:text-gray-400">
          {w("totalClients")} <strong className="text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">{rows.length}</strong>
        </span>
        <button type="button" aria-pressed={balanceFilter === "withBalance"}
          onClick={() => { setBalanceFilter((value) => value === "withBalance" ? "all" : "withBalance"); setPage(1); }}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold shadow-theme-xs transition-colors focus-visible:outline-2 focus-visible:outline-brand-500 ${balanceFilter === "withBalance"
            ? "border-brand-400 bg-brand-50 text-brand-800 dark:border-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
            : "border-gray-200 bg-white text-gray-600 hover:border-brand-300 dark:border-gray-800 dark:bg-[#1b1e21] dark:text-gray-300"}`}>
          {w("withBalance")} <strong className="text-sm font-bold tabular-nums">{withBalanceCount}</strong>
        </button>
      </div>

      <section aria-label={w("filters")} className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-[#1b1e21] md:grid-cols-2 xl:grid-cols-[minmax(220px,1.6fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(170px,1fr)]">
        <label className="min-w-0">
          <span className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">{w("searchLabel")}</span>
          <Input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }}
            placeholder={t("search")} aria-label={t("search")} className="h-10" />
        </label>
        <label className="min-w-0">
          <span className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">{w("sortLabel")}</span>
          <select className={selectClass} value={sort} onChange={(event) => { setSort(event.target.value as CustomerSort); setPage(1); }}>
            {sortFields.map((field) => <option key={field} value={field}>{w(`sort.${field}`)}</option>)}
          </select>
        </label>
        <label className="min-w-0">
          <span className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">{w("directionLabel")}</span>
          <select className={selectClass} value={direction} onChange={(event) => { setDirection(event.target.value as CustomerDirection); setPage(1); }}>
            {directions.map((value) => <option key={value} value={value}>{w(`direction.${value}`)}</option>)}
          </select>
        </label>
        <label className="min-w-0">
          <span className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">{w("balanceLabel")}</span>
          <select className={selectClass} value={balanceFilter} onChange={(event) => { setBalanceFilter(event.target.value as CustomerBalanceFilter); setPage(1); }}>
            {balanceFilters.map((value) => <option key={value} value={value}>{w(`balanceFilter.${value}`)}</option>)}
          </select>
        </label>
      </section>

      {saved && <p role="status" className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{t("saved")}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("shown", { count: visible.length, total: rows.length })}</p>
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>{t("reset")}</Button>
          <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            {w("perPage")}
            <select className={selectClass} aria-label={w("perPage")} value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
              {[20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
        </div>
      </div>

      {visible.length > 0 ? (
        <section aria-label={w("listLabel")}>
          <div className="mb-2 hidden grid-cols-[minmax(230px,1.5fr)_minmax(180px,1.1fr)_minmax(150px,0.85fr)_100px] px-4 text-[11px] font-bold uppercase tracking-[0.11em] text-gray-400 lg:grid">
            <span>{w("columns.client")}</span>
            <span className="ps-4">{w("columns.contacts")}</span>
            <span className="ps-4">{w("columns.balance")}</span>
            <span />
          </div>
          <div className="space-y-2.5">
            {pageRows.map((row) => (
              <CustomerListItem key={row.id} customer={row}
                onOpen={() => setSelectedId(row.id)}
                onEdit={() => startEdit(row)} />
            ))}
          </div>
        </section>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center dark:border-gray-700 dark:bg-[#1b1e21]">
          <h2 className="font-semibold">{t(rows.length ? "noMatches" : "empty")}</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t(rows.length ? "search" : "emptyHint")}</p>
          {rows.length > 0 && <Button variant="outline" className="mt-5" onClick={resetFilters}>{t("reset")}</Button>}
        </div>
      )}

      {visible.length > pageSize && (
        <nav aria-label={w("paginationNav")} className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {w("pagination", { start: (currentPage - 1) * pageSize + 1, end: Math.min(currentPage * pageSize, visible.length), total: visible.length })}
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>{w("previous")}</Button>
            <span className="px-2 text-xs font-semibold tabular-nums">{w("pageOf", { page: currentPage, total: maxPage })}</span>
            <Button type="button" variant="outline" size="sm" disabled={currentPage >= maxPage} onClick={() => setPage((value) => Math.min(maxPage, value + 1))}>{w("next")}</Button>
          </div>
        </nav>
      )}
      <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">{w("balanceHint")}</p>

      {selectedCustomer && (
        <CustomerDetails key={selectedCustomer.id} customer={selectedCustomer} onClose={() => setSelectedId(null)}
          onEdit={() => { startEdit(selectedCustomer); setSelectedId(null); }}
          onMerge={() => { setMerging(selectedCustomer); setSelectedId(null); }} />
      )}
      {merging && <CustomerMergeDialog key={merging.id} source={merging} customers={rows}
        onClose={() => setMerging(null)} onMerged={() => setSaved(true)} />}
      {editing && (
        <CustomerForm key={editing === "new" ? "new" : `${editing.id}-${editing.version}`}
          item={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)} onSaved={() => setSaved(true)} />
      )}
    </div>
  );
}
