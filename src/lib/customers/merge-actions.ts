"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getStaffSession } from "@/lib/require-staff";
import { classifyDatabaseError, logDatabaseError } from "@/lib/db-errors";
import { CustomerMergeError, mergeCustomerRecords } from "./merge-repository";

const mergeSchema = z.object({
  sourceId:z.uuid(),sourceVersion:z.number().int().positive(),
  targetId:z.uuid(),targetVersion:z.number().int().positive(),
});

export type MergeResult =
  | {ok:true;moved:number}
  | {ok:false;error:"authRequired"|"invalid"|"missing"|"conflict"|"same"|"alreadyMerged"|"schemaOutdated"|"databaseUnavailable"|"database"};

export async function mergeCustomers(input:unknown):Promise<MergeResult> {
  const session = await getStaffSession();
  if(!session) return {ok:false,error:"authRequired"};
  const parsed = mergeSchema.safeParse(input);
  if(!parsed.success) return {ok:false,error:"invalid"};
  try {
    const moved = await mergeCustomerRecords(parsed.data,session.user.id);
    for(const path of ["/customers","/bookings","/calendar","/"])revalidatePath(path);
    return {ok:true,moved};
  } catch(error) {
    if(error instanceof CustomerMergeError) return {ok:false,error:error.code};
    logDatabaseError("mergeCustomers",error);
    return {ok:false,error:classifyDatabaseError(error)};
  }
}
