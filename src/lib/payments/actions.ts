"use server";

import { revalidatePath } from "next/cache";

import { classifyDatabaseError, logDatabaseError } from "@/lib/db-errors";
import { getStaffSession } from "@/lib/require-staff";
import { PaymentOperationError, savePaymentRecord } from "./repository";
import { paymentSchema, type PaymentResult } from "./schema";

export async function savePayment(input: unknown): Promise<PaymentResult> {
  const session = await getStaffSession();
  if (!session) return { ok: false, error: "authRequired" };
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  let paymentId: string;
  try {
    paymentId = await savePaymentRecord(parsed.data, session.user.id);
  } catch (error) {
    if (error instanceof PaymentOperationError) {
      return { ok: false, error: error.code };
    }
    logDatabaseError("savePayment", error);
    return { ok: false, error: classifyDatabaseError(error) };
  }

  for (const path of ["/bookings", "/calendar", "/customers", "/"]) {
    revalidatePath(path);
  }
  return { ok: true, id: paymentId };
}
