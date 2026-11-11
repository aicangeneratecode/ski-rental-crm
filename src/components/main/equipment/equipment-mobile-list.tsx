"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import DeleteRecordButton from "@/components/common/delete-record-button";
import { formatRsd } from "@/lib/equipment/tariffs";
import type { EquipmentRow } from "@/lib/equipment/types";
import type { EquipmentSort, EquipmentSortKey } from "@/lib/equipment/sort";
interface Props {
  rows: EquipmentRow[];
  onEdit: (item: EquipmentRow) => void;
  onView: (item: EquipmentRow) => void;
  readOnly: boolean;
  sort: EquipmentSort;
  onSort: (key: EquipmentSortKey) => void;
}
const sortKeys = ["name", "tariff", "size", "dailyRate", "status"] as const;
export default function EquipmentMobileList({
  rows,
  onEdit,
  onView,
  readOnly,
  sort,
  onSort,
}: Props) {
  const t = useTranslations("inventory");
  const profileT = useTranslations("equipmentProfile");
  return (
    <div className="space-y-3 p-3 md:hidden">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {sortKeys.map((key) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={sort?.key === key ? "default" : "outline"}
            className="shrink-0"
            aria-label={t("sortByColumn", {
              column:
                key === "dailyRate" ? t("rateColumn") : t(`fields.${key}`),
            })}
            onClick={() => onSort(key)}
          >
            {key === "dailyRate" ? t("rateColumn") : t(`fields.${key}`)}{" "}
            {sort?.key === key ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}
          </Button>
        ))}
      </div>
      {rows.map((item) => (
        <article
          key={item.id}
          className="rounded-xl border border-gray-200 p-3 dark:border-gray-700"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              #{item.code}
            </span>
            <span className="text-xs font-semibold text-brand-700 dark:text-brand-300">
              {t(`statuses.${item.status}`)}
            </span>
          </div>
          <h3 className="mt-2 font-semibold break-words text-gray-900 dark:text-white">
            {item.name}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t(`tariffs.${item.tariff}`)}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">
                {t("fields.size")}
              </dt>
              <dd className="mt-1 font-semibold break-words">
                {item.size || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">
                {t("rateColumn")}
              </dt>
              <dd className="mt-1 font-semibold">
                {formatRsd(item.dailyRate)}
              </dd>
            </div>
          </dl>
          <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onView(item)}
            >
              {profileT("open")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              disabled={readOnly}
              onClick={() => onEdit(item)}
            >
              {t("edit")}
            </Button>
            <DeleteRecordButton
              kind="equipment"
              id={item.id}
              version={item.version}
              label={`${item.code} · ${item.name}`}
              disabled={readOnly}
            />
          </div>
        </article>
      ))}
    </div>
  );
}
