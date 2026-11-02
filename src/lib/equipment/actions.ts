"use server";

import { revalidatePath } from "next/cache";

import { getStaffSession } from "@/lib/require-staff";
import { saveEquipmentRecord } from "./repository";
import type { SaveResult } from "./types";

export async function saveEquipment(
  input: unknown,
): Promise<SaveResult> {
  const session = await getStaffSession();

  if (!session) {
    return {
      ok: false,
      error: "authRequired",
    };
  }

  const result = await saveEquipmentRecord(input);

  if (result.ok) {
    revalidatePath("/equipment");
  }

  return result;
}