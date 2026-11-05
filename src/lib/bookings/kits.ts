import { getTariff } from "@/lib/equipment/tariffs";

export const rentalKits = {
  ski: ["skis", "boots", "helmet"],
  snowboard: ["boards", "boots", "helmet"],
  skiBasic: ["skis", "boots", "poles"],
} as const;

export type RentalKitId = keyof typeof rentalKits;
export type KitPart = (typeof rentalKits)[RentalKitId][number];

export function matchesKitPart(tariff: string, part: KitPart): boolean {
  if (part === "skis" || part === "boards") {
    return getTariff(tariff)?.category === part;
  }
  return tariff === part;
}

export function kitPartCategory(part: KitPart) {
  if (part === "skis" || part === "boards") return part;
  if (part === "helmet") return "protection";
  return "equipment";
}

export function kitProgress(id: RentalKitId, selectedTariffs: string[]) {
  return rentalKits[id].map((part) => ({
    part,
    selected: selectedTariffs.some((tariff) => matchesKitPart(tariff, part)),
  }));
}
