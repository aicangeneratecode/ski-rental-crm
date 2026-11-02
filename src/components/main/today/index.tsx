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
import { formatBookingMoney } from "@/lib/bookings/types";

type OperationKind = "pickup" | "return" | "overdue";
type Filter = "all" | OperationKind;

type DemoOperation = {
  id: string;
  customer: string;
  phone: string;
  kind: OperationKind;
  time: string;
  period: string;
  equipment: "skiSet" | "boardSet" | "familySet";
  note: "skiNote" | "boardNote" | "familyNote" | "lateNote";
  total: number;
  paid: number;
};

const operations: DemoOperation[] = [
  {
    id: "BR-0104",
    customer: "Александр Петров",
    phone: "+381 6X XXX XXXX",
    kind: "overdue",
    time: "15.01",
    period: "12.01.2027 — 15.01.2027",
    equipment: "skiSet",
    note: "lateNote",
    total: 9500,
    paid: 9500,
  },
  {
    id: "BR-0108",
    customer: "Мария Иванова",
    phone: "+381 6X XXX XXXX",
    kind: "pickup",
    time: "10:00",
    period: "16.01.2027 — 18.01.2027",
    equipment: "skiSet",
    note: "skiNote",
    total: 7500,
    paid: 2500,
  },
  {
    id: "BR-0109",
    customer: "Никола Јовановић",
    phone: "+381 6X XXX XXXX",
    kind: "pickup",
    time: "13:30",
    period: "16.01.2027 — 19.01.2027",
    equipment: "boardSet",
    note: "boardNote",
    total: 10500,
    paid: 0,
  },
  {
    id: "BR-0102",
    customer: "Елена Смирнова",
    phone: "+381 6X XXX XXXX",
    kind: "return",
    time: "17:00",
    period: "14.01.2027 — 16.01.2027",
    equipment: "familySet",
    note: "familyNote",
    total: 18000,
    paid: 18000,
  },
];

const statusStyles: Record<OperationKind, string> = {
  pickup:
    "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  return:
    "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  overdue:
    "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
};

const panel =
  "rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900";

export default function TodayDashboard() {
  const t = useTranslations("dashboard");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DemoOperation | null>(null);

  const count = (kind: OperationKind) =>
    operations.filter((item) => item.kind === kind).length;

  const balance = operations.reduce(
    (sum, item) => sum + Math.max(0, item.total - item.paid),
    0,
  );

  const metrics = [
    { key: "pickups", value: count("pickup"), accent: "text-blue-600" },
    { key: "returns", value: count("return"), accent: "text-amber-600" },
    { key: "overdue", value: count("overdue"), accent: "text-red-600" },
    {
      key: "balance",
      value: formatBookingMoney(balance),
      accent: "text-gray-900 dark:text-white",
    },
  ] as const;

  const search = query.trim().toLowerCase();

  const visible = operations.filter((item) => {
    const matchesFilter = filter === "all" || item.kind === filter;
    const text =
      `${item.id} ${item.customer} ${t(`examples.${item.equipment}`)}`;
    return matchesFilter && text.toLowerCase().includes(search);
  });

  const links = [
    { href: "/equipment", title: "inventory", hint: "inventoryHint" },
    { href: "/customers", title: "customers", hint: "customersHint" },
    { href: "/settings", title: "settings", hint: "settingsHint" },
  ] as const;

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          {t("demo")}
        </p>
        <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
          {t("demoHint")}
        </p>
      </div>

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("date")}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t("subtitle")}
          </p>
        </div>

        <Link href="/bookings" className={buttonVariants()}>
          {t("bookings")}
        </Link>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <section key={metric.key} className={`${panel} p-5`}>
            <h2 className="text-sm text-gray-500 dark:text-gray-400">
              {t(`metrics.${metric.key}`)}
            </h2>
            <p className={`mt-3 text-3xl font-semibold ${metric.accent}`}>
              {metric.value}
            </p>
          </section>
        ))}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-3">
        <section className={`${panel} overflow-hidden xl:col-span-2`}>
          <div className="space-y-4 border-b border-gray-100 p-5 dark:border-gray-800">
            <div>
              <h2 className="text-lg font-semibold">{t("operations")}</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t("operationsHint")}
              </p>
            </div>

            <div className="flex flex-wrap gap-2" aria-label={t("operations")}>
              {(["all", "pickup", "return", "overdue"] as const).map(
                (value) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={filter === value ? "default" : "outline"}
                    aria-pressed={filter === value}
                    onClick={() => setFilter(value)}
                  >
                    {t(`filters.${value}`)}
                    <span className="opacity-70">
                      {value === "all" ? operations.length : count(value)}
                    </span>
                  </Button>
                ),
              )}
            </div>

            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("search")}
              aria-label={t("search")}
            />
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {visible.map((item) => (
              <article key={item.id} className="p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="min-w-16 rounded-xl bg-gray-50 px-3 py-3 text-center text-sm font-semibold dark:bg-gray-800">
                    {item.time}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{item.customer}</h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[item.kind]}`}
                      >
                        {t(`statuses.${item.kind}`)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {item.id} · {item.period}
                    </p>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      {t(`examples.${item.equipment}`)}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelected(item)}
                  >
                    {t("details")}
                  </Button>
                </div>
              </article>
            ))}

            {visible.length === 0 && (
              <p className="p-10 text-center text-sm text-gray-500">
                {t("empty")}
              </p>
            )}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/20">
            <h2 className="font-semibold text-red-800 dark:text-red-300">
              {t("attention")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-red-700 dark:text-red-400">
              {t("attentionBody")}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => {
                setFilter("overdue");
                setQuery("");
              }}
            >
              {t("showOverdue")}
            </Button>
          </section>

          <section className={`${panel} p-5`}>
            <h2 className="font-semibold">{t("quickLinks")}</h2>
            <div className="mt-3 space-y-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-xl p-3 transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-gray-800"
                >
                  <span className="block text-sm font-medium">
                    {t(link.title)} →
                  </span>
                  <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                    {t(link.hint)}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className={`${panel} p-5`}>
            <h2 className="font-semibold">{t("workflow")}</h2>
            <ol className="mt-3 list-decimal space-y-3 ps-5 text-sm leading-6 text-gray-600 dark:text-gray-400">
              <li>{t("step1")}</li>
              <li>{t("step2")}</li>
              <li>{t("step3")}</li>
            </ol>
          </section>
        </aside>
      </div>

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
                <DialogTitle>
                  {selected.id} · {selected.customer}
                </DialogTitle>
                <DialogDescription>{t("detailHint")}</DialogDescription>
              </DialogHeader>

              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-gray-500">{t("customer")}</dt>
                  <dd className="mt-1 font-medium">
                    {selected.customer} · {selected.phone}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">{t("period")}</dt>
                  <dd className="mt-1">{selected.period}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">{t("equipment")}</dt>
                  <dd className="mt-1">
                    {t(`examples.${selected.equipment}`)}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">{t("note")}</dt>
                  <dd className="mt-1">{t(`examples.${selected.note}`)}</dd>
                </div>
              </dl>

              <div className="space-y-3 rounded-xl bg-gray-50 p-4 text-sm dark:bg-gray-800">
                <div className="flex justify-between gap-3">
                  <span>{t("total")}</span>
                  <span>{formatBookingMoney(selected.total)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>{t("paid")}</span>
                  <span>{formatBookingMoney(selected.paid)}</span>
                </div>
                <div className="flex justify-between gap-3 border-t border-gray-200 pt-3 font-semibold dark:border-gray-700">
                  <span>{t("balance")}</span>
                  <span>
                    {formatBookingMoney(selected.total - selected.paid)}
                  </span>
                </div>
              </div>

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