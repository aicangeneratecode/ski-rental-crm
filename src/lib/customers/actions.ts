"use server";

import { revalidatePath } from "next/cache";

import { getDb } from "@/lib/db";
import { getStaffSession } from "@/lib/require-staff";
import {
  saveCustomerSchema,
  type CustomerSaveResult,
} from "./schema";

export async function saveCustomer(
  input: unknown,
): Promise<CustomerSaveResult> {
  const session = await getStaffSession();

  if (!session) {
    return { ok: false, error: "authRequired" };
  }

  const parsed = saveCustomerSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: "invalid" };
  }

  const { id, version, values } = parsed.data;

  try {
    const db = getDb();

    if (id) {
      const result = await db.customer.updateMany({
        where: { id, version },
        data: {
          ...values,
          version: { increment: 1 },
        },
      });

      if (result.count === 0) {
        return { ok: false, error: "conflict" };
      }
    } else {
      await db.customer.create({
        data: values,
      });
    }
  } catch {
    return { ok: false, error: "database" };
  }

  revalidatePath("/customers");

  return { ok: true };
}