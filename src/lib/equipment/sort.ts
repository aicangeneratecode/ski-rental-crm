import type { EquipmentRow } from "./types";

export type EquipmentSortKey = "name" | "tariff" | "size" | "dailyRate" | "status";
export type EquipmentSort = { key: EquipmentSortKey; direction: "asc" | "desc" } | null;

type SortableEquipment = Pick<EquipmentRow,
  "id" | "code" | "name" | "tariff" | "size" | "dailyRate" | "status">;

export function toggleEquipmentSort(current: EquipmentSort, key: EquipmentSortKey): EquipmentSort {
  return {
    key,
    direction: current?.key === key && current.direction === "asc" ? "desc" : "asc",
  };
}

/** Sorts only the currently filtered rows. Labels match the text visible in the table. */
export function sortEquipmentRows<T extends SortableEquipment>(
  rows: readonly T[],
  sort: EquipmentSort,
  labels: {
    tariff: (value: T["tariff"]) => string;
    status: (value: T["status"]) => string;
  },
): T[] {
  if (!sort) return [...rows];

  const collator = new Intl.Collator("ru", { numeric: true, sensitivity: "base" });
  const direction = sort.direction === "asc" ? 1 : -1;

  const displayedValue = (row: T): string => {
    if (sort.key === "tariff") return labels.tariff(row.tariff);
    if (sort.key === "status") return labels.status(row.status);
    return row[sort.key];
  };

  // Array.sort is stable. Equal values keep their existing relative order.
  return [...rows].sort((a, b) => {
    const difference = sort.key === "dailyRate"
      ? a.dailyRate - b.dailyRate
      : collator.compare(displayedValue(a).trim(), displayedValue(b).trim());
    return difference * direction;
  });
}
