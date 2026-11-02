export const tariffs = [
  { code: "ski-premium", category: "skis", rate: 2000 },
  { code: "ski-extreme", category: "skis", rate: 2500 },
  { code: "board-premium", category: "boards", rate: 2000 },
  { code: "board-extreme", category: "boards", rate: 2500 },
  { code: "boots", category: "equipment", rate: 500 },
  { code: "goggles", category: "equipment", rate: 300 },
  { code: "goggles-premium", category: "equipment", rate: 500 },
  { code: "poles", category: "equipment", rate: 250 },
  { code: "bindings", category: "equipment", rate: 250 },
  { code: "case", category: "equipment", rate: null },
  { code: "jacket-comfort", category: "clothes", rate: 500 },
  { code: "jacket-premium", category: "clothes", rate: 1000 },
  { code: "pants-comfort", category: "clothes", rate: 500 },
  { code: "pants-premium", category: "clothes", rate: 1000 },
  { code: "gloves", category: "clothes", rate: 300 },
  { code: "helmet", category: "protection", rate: 500 },
  { code: "protection-top", category: "protection", rate: 500 },
  { code: "protection-bottom", category: "protection", rate: 300 },
  { code: "kneepads", category: "protection", rate: 300 },
] as const;
export const categories = [
  "skis",
  "boards",
  "equipment",
  "clothes",
  "protection",
] as const;
export const statuses = ["READY", "MAINTENANCE", "ARCHIVED"] as const;
export type TariffCode = (typeof tariffs)[number]["code"];
export function getTariff(code: string) {
  return tariffs.find((tariff) => tariff.code === code);
}
export function formatRsd(value: number) {
  return (
    new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value) +
    " RSD"
  );
}
