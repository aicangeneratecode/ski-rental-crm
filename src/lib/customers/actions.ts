"use server";

import { revalidatePath } from "next/cache";

import { getDb } from "@/lib/db";
import { classifyDatabaseError, logDatabaseError } from "@/lib/db-errors";
import { getStaffSession } from "@/lib/require-staff";
import {
  saveCustomerSchema,
  customerSchema,
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
  } catch (error) {
    logDatabaseError("saveCustomer", error);
    return { ok: false, error: classifyDatabaseError(error) };
  }

  revalidatePath("/customers");

  return { ok: true };
}
/** Create a customer from an open booking without leaving the booking form. */
export async function createCustomerFromBooking(input: unknown): Promise<
  | { ok: true; customer: { id: string; name: string; phone: string } }
  | { ok: false; error: "invalid" | "authRequired" | "schemaOutdated" | "databaseUnavailable" | "database" }
> {
  const session = await getStaffSession();
  if (!session) return { ok: false, error: "authRequired" };

  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  try {
    const customer = await getDb().customer.create({
      data: parsed.data,
      select: { id: true, name: true, phone: true },
    });
    revalidatePath("/customers");
    revalidatePath("/bookings");
    return { ok: true, customer };
  } catch (error) {
    logDatabaseError("createCustomerFromBooking", error);
    return { ok: false, error: classifyDatabaseError(error) };
  }
}
