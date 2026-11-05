import type { BookingEquipment } from "./types";

export type EquipmentFamily = {
  key: string;
  name: string;
  size: string;
  tariff: string;
  dailyRate: number;
  units: BookingEquipment[];
};

/** Group truly identical model/size/tariff/rate units; never combine sizes. */
export function groupEquipmentFamilies(equipment: BookingEquipment[]): EquipmentFamily[] {
  const groups = new Map<string, EquipmentFamily>();
  for (const item of equipment) {
    const key = [
      item.tariff.trim().toLocaleLowerCase("ru"),
      item.name.trim().toLocaleLowerCase("ru"),
      item.size.trim().toLocaleLowerCase("ru"),
      String(item.dailyRate),
    ].join("\u0000");
    let family = groups.get(key);
    if (!family) {
      family = { key, name: item.name, size: item.size, tariff: item.tariff,
        dailyRate: item.dailyRate, units: [] };
      groups.set(key, family);
    }
    family.units.push(item);
  }
  return [...groups.values()].sort((a,b) =>
    a.name.localeCompare(b.name,"ru") || a.size.localeCompare(b.size,"ru") ||
    a.dailyRate-b.dailyRate);
}

/** Chooses a concrete unused unit; the server still checks it when saving. */
export function firstAvailableUnit(
  family: EquipmentFamily,
  selected: ReadonlySet<string>,
  occupied: (equipment: BookingEquipment) => boolean,
): BookingEquipment | undefined {
  return family.units
    .filter(item => (item.status === undefined || item.status === "READY")
      && !selected.has(item.id) && !occupied(item))
    .sort((a,b)=>a.code.localeCompare(b.code))[0];
}
