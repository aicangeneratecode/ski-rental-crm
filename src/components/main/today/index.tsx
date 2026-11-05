"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Link, useRouter } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BookingActions from "@/components/main/bookings/booking-actions";
import BookingDetails from "@/components/main/bookings/booking-details";

import {
  getTodayKind,
  type TodayKind,
} from "@/lib/bookings/today";
import {
  formatBookingDate,
  formatBookingMoney,
  type BookingRow,
} from "@/lib/bookings/types";

type Props = {
  rows: BookingRow[];
  today: string;
};

const kinds: TodayKind[] = ["pickup", "return", "overdue", "missed"];

const priority: Record<TodayKind, number> = {
  overdue: 0,
  missed: 1,
  pickup: 2,
  return: 3,
};

const colors: Record<TodayKind, string> = {
  pickup:
    "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  return:
    "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  overdue:
    "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  missed:
    "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
};

export default function TodayDashboard({ rows, today }: Props) {
  const t = useTranslations("todayLive");
  const bookingsT = useTranslations("bookings");
  const router = useRouter();

  const [filter, setFilter] = useState<TodayKind | "all">("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshing, startTransition] = useTransition();

  const selected = rows.find((row) => row.id === selectedId);

  const tasks = rows
    .flatMap((row) => {
      const kind = getTodayKind(row, today);
      return kind ? [{ row, kind }] : [];
    })
    .sort(
      (a, b) =>
        priority[a.kind] - priority[b.kind] ||
        a.row.endDate.localeCompare(b.row.endDate),
    );

  const search = query.trim().toLocaleLowerCase("ru");

  const visible = tasks.filter(({ row, kind }) => {
    if (filter !== "all" && filter !== kind) return false;

    const text = [
      row.id,
      row.customerName,
      row.customerPhone,
      ...row.items.map((item) => `${item.code} ${item.name}`),
    ]
      .join(" ")
      .toLocaleLowerCase("ru");

    return text.includes(search);
  });

  function refresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="space-y-7 text-gray-900 dark:text-gray-100">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">
            {formatBookingDate(today)} · Europe/Belgrade
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{t("title")}</h1>
          <p className="mt-2 text-sm text-gray-500">
            {t("description")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={refreshing}
            onClick={refresh}
          >
            {t(refreshing ? "refreshing" : "refresh")}
          </Button>
          <Link href="/bookings" className={buttonVariants()}>
            {t("bookings")}
          </Link>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kinds.map((kind) => (
          <button
            key={kind}
            type="button"
            aria-pressed={filter === kind}
            onClick={() => setFilter(kind)}
            className={`topride-kpi rounded-2xl border bg-white p-4 text-start transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 dark:bg-[#1b1e21] sm:p-5 ${
              filter === kind
                ? "border-brand-500 bg-brand-50/40 ring-1 ring-brand-500 dark:bg-brand-500/10"
                : "border-[#e9e6e1] dark:border-[#313337]"
            }`}
          >
            <span className="block text-sm text-gray-500">
              {t(kind)}
            </span>
            <span className="mt-3 block text-3xl font-extrabold tracking-tight tabular-nums">
              {tasks.filter((task) => task.kind === kind).length}
            </span>
          </button>
        ))}
      </div>

      <p className="text-xs leading-5 text-gray-500">
        {t("refreshHint")}
      </p>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant={filter === "all" ? "default" : "outline"}
          aria-pressed={filter === "all"}
          onClick={() => setFilter("all")}
        >
          {t("all")} · {tasks.length}
        </Button>

        <div className="min-w-0 flex-1 basis-64">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("search")}
            aria-label={t("search")}
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <p
          role="status"
          className="topride-surface rounded-2xl border border-dashed p-8 text-center text-sm text-gray-500 dark:border-gray-700 sm:p-10"
        >
          {t(tasks.length === 0 ? "empty" : "noMatches")}
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map(({ row, kind }) => (
            <article
              key={row.id}
              className="topride-surface rounded-2xl border p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${colors[kind]}`}
                    >
                      {t(kind)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {bookingsT("reference", { id: row.id.slice(0, 8) })}
                    </span>
                  </div>

                  <h2 className="mt-3 break-words font-semibold">
                    {row.customerName}
                  </h2>
                  <a
                    href={`tel:${row.customerPhone}`}
                    className="mt-1 inline-block text-sm text-brand-600 hover:underline dark:text-brand-400"
                  >
                    {row.customerPhone}
                  </a>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedId(row.id)}
                >
                  {t("details")}
                </Button>
              </div>

              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-gray-500">{t("period")}</p>
                  <p className="mt-1">
                    {formatBookingDate(row.startDate)}
                    {" — "}
                    {formatBookingDate(row.endDate)}
                  </p>
                </div>
                <div className="sm:text-end">
                  <p className="text-xs text-gray-500">{t("total")}</p>
                  <p className="mt-1 font-semibold">
                    {formatBookingMoney(row.total)}
                  </p>
                </div>
              </div>

              <p className="mt-3 break-words text-sm text-gray-500">
                {row.items.map((item) => `${item.code} · ${item.name}`).join(", ")}
              </p>

              {kind === "missed" && (
                <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  {t("missedHint")}
                </p>
              )}

              <div className="mt-4">
                <BookingActions
                  key={`${row.id}-${row.version}`}
                  booking={row}
                />
              </div>
            </article>
          ))}
        </div>
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