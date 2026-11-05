"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusIcon, BoxIcon } from "@/icons";
import { categories, statuses, getTariff } from "@/lib/equipment/tariffs";
import type { EquipmentRow } from "@/lib/equipment/types";
import EquipmentForm from "./equipment-form";
import EquipmentTable from "./equipment-table";
import EquipmentDetails from "./equipment-details";
import SelectField from "./select-field";
interface EquipmentCatalogProps {
  rows: EquipmentRow[];
  readOnly: boolean;
  initialSelectedId?: string;
  tariffRates: Record<string, number | null>;
}
export default function EquipmentCatalog({
  rows,
  readOnly,
  initialSelectedId,
  tariffRates,
}: EquipmentCatalogProps) {
  const t = useTranslations("inventory");
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId && rows.some(r=>r.id===initialSelectedId)?initialSelectedId:null);
const selectedItem = rows.find((row) => row.id === selectedId);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("active");
  const [editing, setEditing] = useState<EquipmentRow | "new" | null>(null);
  const [saved, setSaved] = useState(false);
  const visible = rows.filter((row) => {
    const matchesStatus =
      status === "all" ||
      (status === "active" ? row.status !== "ARCHIVED" : row.status === status);
    const matchesCategory =
      category === "all" || getTariff(row.tariff)?.category === category;
    const text = [row.code, row.name, row.size, t(`tariffs.${row.tariff}`)]
      .join(" ")
      .toLocaleLowerCase("ru");
    return (
      matchesStatus &&
      matchesCategory &&
      text.includes(query.trim().toLocaleLowerCase("ru"))
    );
  });
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-2xl text-sm text-gray-500 dark:text-gray-400">
          {t("description")}
        </p>
        <Button
          disabled={readOnly}
          onClick={() => {
            setSaved(false);
            setEditing("new");
          }}
        >
          <PlusIcon />
          {t("add")}
        </Button>
      </div>
      {readOnly && (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {t("readOnly")}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        {statuses.map((value) => (
          <div
            key={value}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t(`statuses.${value}`)}
            </p>
            <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
              {rows.filter((row) => row.status === value).length}
            </p>
          </div>
        ))}
      </div>
      {saved && (
        <p role="status" className="text-sm text-brand-600 dark:text-brand-300">
          {t("saved")}
        </p>
      )}
      <section className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="grid gap-3 border-b border-gray-200 p-5 md:grid-cols-3 dark:border-gray-800">
          <Input
            aria-label={t("search")}
            placeholder={t("search")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <SelectField
            label={t("categoryFilter")}
            value={category}
            onChange={setCategory}
            options={[
              { value: "all", label: t("allCategories") },
              ...categories.map((value) => ({
                value,
                label: t(`categories.${value}`),
              })),
            ]}
          />
          <SelectField
            label={t("statusFilter")}
            value={status}
            onChange={setStatus}
            options={[
              { value: "active", label: t("activeOnly") },
              { value: "all", label: t("allStatuses") },
              ...statuses.map((value) => ({
                value,
                label: t(`statuses.${value}`),
              })),
            ]}
          />
        </div>
        {visible.length ? (
          <EquipmentTable
          rows={visible}
          onView={(item) => setSelectedId(item.id)}
          onEdit={(item) => {
            setSaved(false);
            setEditing(item);
          }}
          readOnly={readOnly}
        />
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <BoxIcon className="size-10 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              {t(rows.length ? "noMatches" : "empty")}
            </h2>
            <p className="max-w-lg text-sm text-gray-500 dark:text-gray-400">
              {t(rows.length ? "filterHint" : "emptyHint")}
            </p>
            {!!rows.length && (
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setCategory("all");
                  setStatus("all");
                }}
              >
                {t("reset")}
              </Button>
            )}
          </div>
        )}
        <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
          {t("shown", { count: visible.length, total: rows.length })}
        </p>
      </section>
      {selectedItem && (
        <EquipmentDetails
          key={selectedItem.id}
          item={selectedItem}
          readOnly={readOnly}
          onClose={() => setSelectedId(null)}
          onEdit={() => {
            if (readOnly) return;
            setSaved(false);
            setEditing(selectedItem);
            setSelectedId(null);
          }}
        />
      )}
      {editing && (
        <EquipmentForm
          key={editing === "new" ? "new" : `${editing.id}-${editing.version}`}
          item={editing === "new" ? undefined : editing}
          tariffRates={tariffRates}
          onClose={() => setEditing(null)}
          onSaved={() => setSaved(true)}
        />
      )}
    </div>
  );
}
