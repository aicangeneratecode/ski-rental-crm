import type { EquipmentInput } from "./schema";
export interface EquipmentRow extends EquipmentInput {
  id: string;
  version: number;
}
export type SaveResult =
  | { ok: true }
  | {
      ok: false;
      error: "invalid" | "duplicate" | "conflict" | "database" | "authRequired";
    };
