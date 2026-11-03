"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  tariffs,
  categories,
  formatRsd,
} from "@/lib/equipment/tariffs";

const tabs = ["tariffs", "benefits", "rental", "staff"] as const;

const discounts = [
  { days: 4, percent: 5 },
  { days: 6, percent: 10 },
  { days: 8, percent: 15 },
  { days: 10, percent: 20 },
];

const panel =
  "rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900";

export default function SettingsPanel() {
  const t = useTranslations("settingsPanel");
  const inventory = useTranslations("inventory");

  const [tab, setTab] = useState<(typeof tabs)[number]>("tariffs");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const search = query.trim().toLocaleLowerCase("ru");

  const visible = tariffs.filter((tariff) => {
    const matchesCategory =
      category === "all" || tariff.category === category;
    const matchesSearch = inventory(`tariffs.${tariff.code}`)
      .toLocaleLowerCase("ru")
      .includes(search);

    return matchesCategory && matchesSearch;
  });

  const rentalSettings = [
    { label: "name", value: "Ski Rental CRM" },
    { label: "language", value: t("russian") },
    { label: "currency", value: t("dinar") },
    { label: "timezone", value: "Europe/Belgrade" },
    { label: "dayRule", value: t("inclusive") },
    { label: "rounding", value: t("wholeDinar") },
  ] as const;

  return (
    <div className="space-y-5 text-gray-900 dark:text-gray-100">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t("description")}
      </p>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          {t("preview")}
        </p>
        <p className="mt-1 text-sm leading-6 text-amber-700 dark:text-amber-400">
          {t("previewHint")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((value) => (
          <Button
            key={value}
            type="button"
            variant={tab === value ? "default" : "outline"}
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
          >
            {t(value)}
          </Button>
        ))}
      </div>

      {tab === "tariffs" && (
        <section className={panel}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <h2 className="text-lg font-semibold">{t("tariffs")}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                {t("tariffHint")}
              </p>
            </div>
            <Link
              href="/equipment"
              className={buttonVariants({ variant: "outline" })}
            >
              {t("equipmentLink")}
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("search")}
              aria-label={t("search")}
            />

            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              aria-label={t("category")}
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value="all">{t("allCategories")}</option>
              {categories.map((value) => (
                <option key={value} value={value}>
                  {inventory(`categories.${value}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[460px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th scope="col" className="py-3 pe-4 text-start font-medium">
                    {inventory("fields.tariff")}
                  </th>
                  <th scope="col" className="py-3 text-end font-medium">
                    {inventory("rateColumn")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((tariff) => (
                  <tr
                    key={tariff.code}
                    className="border-b border-gray-100 last:border-0 dark:border-gray-800"
                  >
                    <td className="py-4 pe-4">
                      <p className="font-medium">
                        {inventory(`tariffs.${tariff.code}`)}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {inventory(`categories.${tariff.category}`)}
                      </p>
                    </td>
                    <td className="py-4 text-end whitespace-nowrap">
                      {tariff.rate === null
                        ? inventory("manual")
                        : formatRsd(tariff.rate)}
                    </td>
                  </tr>
                ))}

                {visible.length === 0 && (
                  <tr>
                    <td colSpan={2} className="py-10 text-center text-gray-500">
                      {t("noResults")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "benefits" && (
        <div className="space-y-5">
          <section className={panel}>
            <h2 className="text-lg font-semibold">{t("manualTitle")}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              {t("manualHint")}
            </p>
          </section>

          <section className={panel}>
            <h2 className="font-semibold">{t("durationTitle")}</h2>
            <p className="mt-2 text-sm text-gray-500">{t("durationHint")}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {discounts.map((discount) => (
                <div
                  key={discount.days}
                  className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800"
                >
                  <p className="text-2xl font-semibold text-brand-600 dark:text-brand-400">
                    {discount.percent}%
                  </p>
                  <p className="mt-2 text-sm">
                    {t("days", { count: discount.days })}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    {t("manualBadge")}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className={panel}>
              <h2 className="font-semibold">{t("travelTitle")}</h2>
              <p className="mt-3 text-sm leading-6 text-gray-500">
                {t("travelBody")}
              </p>
            </section>

            <section className={panel}>
              <h2 className="font-semibold">{t("bundleTitle")}</h2>
              <ul className="mt-3 list-disc space-y-3 ps-5 text-sm leading-6 text-gray-500">
                <li>{t("poles")}</li>
                <li>{t("bindings")}</li>
                <li>{t("cases")}</li>
              </ul>
            </section>
          </div>
        </div>
      )}

      {tab === "rental" && (
        <section className={panel}>
          <h2 className="text-lg font-semibold">{t("rental")}</h2>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            {t("rentalHint")}
          </p>

          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            {rentalSettings.map((setting) => (
              <div
                key={setting.label}
                className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800"
              >
                <dt className="text-xs text-gray-500">
                  {t(setting.label)}
                </dt>
                <dd className="mt-2 text-sm font-medium">
                  {setting.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {tab === "staff" && (
        <section className={panel}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <h2 className="text-lg font-semibold">{t("staffTitle")}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                {t("staffHint")}
              </p>
            </div>

            <Button type="button" disabled>
              {t("addStaff")}
            </Button>
          </div>

          <div className="mt-5 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {(["staffName", "staffRole", "staffStatus"] as const).map(
                    (key) => (
                      <th
                        key={key}
                        scope="col"
                        className="px-4 py-3 text-start font-medium"
                      >
                        {t(key)}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    colSpan={3}
                    className="px-5 py-10 text-center text-gray-500"
                  >
                    {t("staffEmpty")}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs leading-5 text-gray-500">
            {t("accessHint")}
          </p>
        </section>
      )}
    </div>
  );
}