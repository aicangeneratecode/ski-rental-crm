"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categories } from "@/lib/equipment/tariffs";
import type { TariffRateRow } from "@/lib/equipment/tariff-settings";
import type { WorkspaceSnapshot } from "@/lib/settings/workspace";
import TariffEditor from "./tariff-editor";
import WorkspaceForm from "./workspace-form";

const tabs = ["tariffs", "benefits", "rental", "contacts"] as const;
const surface = "topride-surface rounded-2xl border p-4 sm:p-5";

export default function SettingsPanel({
  rates, settings,
}: { rates: TariffRateRow[]; settings: WorkspaceSnapshot }) {
  const t = useTranslations("settingsPanel");
  const inventory = useTranslations("inventory");
  const [tab, setTab] = useState<(typeof tabs)[number]>("tariffs");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [message, setMessage] = useState("");
  const search = query.trim().toLocaleLowerCase("ru");
  const visible = rates.filter(row =>
    (category === "all" || row.category === category) &&
    inventory(`tariffs.${row.code}`).toLocaleLowerCase("ru").includes(search));

  const rules = [
    { label: t("language"), value: t("russian") },
    { label: t("currency"), value: t("dinar") },
    { label: t("timezone"), value: "Europe/Belgrade" },
    { label: t("dayRule"), value: t("inclusive") },
    { label: t("rounding"), value: t("wholeDinar") },
  ];

  return (
    <main className="space-y-5 text-gray-900 dark:text-gray-100">
      <header>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">TOP RIDE / SETTINGS</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t("description")}</p>
      </header>
      <nav aria-label={t("title")} className="flex flex-wrap gap-2">
        {tabs.map(value => (
          <Button key={value} type="button" size="sm"
            variant={tab === value ? "default" : "outline"}
            aria-pressed={tab === value}
            onClick={() => { setTab(value); setMessage(""); }}>
            {t(value)}
          </Button>
        ))}
      </nav>
      {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">{message}</p>}

      {tab === "tariffs" && (
        <section className="space-y-4">
          <div className={surface}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">{t("tariffs")}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">{t("realTariffHint")}</p>
              </div>
              <Link href="/equipment" className={buttonVariants({variant:"outline",size:"sm"})}>{t("equipmentLink")}</Link>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Input value={query} onChange={event=>setQuery(event.target.value)}
                aria-label={t("search")} placeholder={t("search")}/>
              <select value={category} onChange={event=>setCategory(event.target.value)}
                aria-label={t("category")} className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800">
                <option value="all">{t("allCategories")}</option>
                {categories.map(value=><option key={value} value={value}>{inventory(`categories.${value}`)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {visible.map(row => (
              <TariffEditor key={row.code+"-"+row.version} row={row}
                onSaved={count=>setMessage(count>0?t("rateSavedWithItems",{count}):t("rateSaved"))}/>
            ))}
          </div>
          {visible.length===0 && <p className="p-6 text-center text-sm text-gray-500">{t("noResults")}</p>}
          <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">{t("tariffHistoryHint")}</p>
        </section>
      )}

      {tab === "benefits" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className={surface}>
            <h2 className="text-lg font-bold">{t("manualTitle")}</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">{t("manualHint")}</p>
            <p className="mt-3 text-sm leading-6 text-gray-500">{t("durationHint")}</p>
          </section>
          <section className={surface}>
            <h2 className="text-lg font-bold">{t("travelTitle")}</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">{t("travelBody")}</p>
          </section>
          <section className={surface}>
            <h2 className="text-lg font-bold">{t("bundleTitle")}</h2>
            <ul className="mt-3 list-disc space-y-2 ps-5 text-sm leading-6 text-gray-600 dark:text-gray-300">
              <li>{t("poles")}</li><li>{t("bindings")}</li><li>{t("cases")}</li>
            </ul>
          </section>
          <section className={surface}>
            <h2 className="text-lg font-bold">{t("discountPolicyTitle")}</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">{t("discountPolicyBody")}</p>
          </section>
        </div>
      )}

      {tab === "rental" && (
        <section className={surface}>
          <h2 className="text-lg font-bold">{t("rental")}</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t("fixedPolicyHint")}</p>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            {rules.map(item=>(
              <div key={item.label} className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                <dt className="text-xs text-gray-500">{item.label}</dt>
                <dd className="mt-2 text-sm font-semibold">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {tab === "contacts" && (
        <WorkspaceForm key={settings.version} settings={settings} onSaved={()=>setMessage(t("contactsSaved"))}/>
      )}
    </main>
  );
}
