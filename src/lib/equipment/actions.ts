"use server";
import { revalidatePath } from "next/cache";
import { saveEquipmentRecord } from "./repository";
import type { SaveResult } from "./types";
export async function saveEquipment(input: unknown): Promise<SaveResult> {
  // This milestone is local development only. Replace this guard with staff
  // session/role checks before enabling writes in a deployed application.
  if (process.env.NODE_ENV !== "development")
    return { ok: false, error: "authRequired" };
  const result = await saveEquipmentRecord(input);
  if (result.ok) revalidatePath("/equipment");
  return result;
}
