"use server";

import { revalidatePath } from "next/cache";
import { getStaffSession } from "@/lib/require-staff";
import { classifyDatabaseError, logDatabaseError } from "@/lib/db-errors";
import { rateInputSchema, updateTariffRate, TariffUpdateError } from "@/lib/equipment/tariff-settings";
import { workspaceInput, writeWorkspaceSettings, WorkspaceError } from "./workspace";

type SettingsError = "authRequired" | "invalid" | "conflict" | "schemaOutdated" | "databaseUnavailable" | "database";
export type SettingsResult =
  | { ok: true; affected?: number }
  | { ok: false; error: SettingsError };

export async function saveTariffSetting(input: unknown): Promise<SettingsResult> {
  const staff = await getStaffSession();
  if (!staff) return { ok: false, error: "authRequired" };
  const parsed = rateInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  try {
    const affected = await updateTariffRate(parsed.data, staff.user.id);
    for (const path of ["/settings", "/equipment", "/bookings", "/reports"]) revalidatePath(path);
    return { ok: true, affected };
  } catch (error) {
    if (error instanceof TariffUpdateError) return { ok: false, error: error.code };
    logDatabaseError("saveTariffSetting", error);
    return { ok: false, error: classifyDatabaseError(error) };
  }
}

export async function saveWorkspaceSettings(input: unknown): Promise<SettingsResult> {
  const staff = await getStaffSession();
  if (!staff) return { ok: false, error: "authRequired" };
  const parsed = workspaceInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  try {
    await writeWorkspaceSettings(parsed.data, staff.user.id);
    revalidatePath("/settings");
    return { ok: true };
  } catch (error) {
    if (error instanceof WorkspaceError) return { ok: false, error: error.code };
    logDatabaseError("saveWorkspaceSettings", error);
    return { ok: false, error: classifyDatabaseError(error) };
  }
}
