"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getStaffSession } from "@/lib/require-staff";
import { getDb } from "@/lib/db";
import { classifyDatabaseError, logDatabaseError } from "@/lib/db-errors";
import { MaintenanceError, recordEquipmentInspection } from "./maintenance-repository";

const schema = z.object({
  equipmentId: z.uuid(),
  version: z.number().int().positive(),
  kind: z.enum(["INSPECTION","SERVICE","DAMAGE"]),
  condition: z.enum(["OK","NEEDS_SERVICE","DAMAGED"]),
  note: z.string().trim().max(1500),
}).refine(v => v.kind !== "DAMAGE" || v.condition === "DAMAGED");

const idSchema = z.uuid();

export type MaintenanceResult =
 | { ok:true }
 | { ok:false; error:"authRequired" | "invalid" | "missing" | "conflict" | "issued" | "archived" | "schemaOutdated" | "databaseUnavailable" | "database" };

export async function saveMaintenance(input: unknown):Promise<MaintenanceResult> {
  const session = await getStaffSession();
  if(!session) return {ok:false,error:"authRequired"};
  const parsed = schema.safeParse(input);
  if(!parsed.success) return {ok:false,error:"invalid"};
  try {
    await recordEquipmentInspection(parsed.data,session.user.id);
  } catch(error) {
    if(error instanceof MaintenanceError) return {ok:false,error:error.code};
    logDatabaseError("saveMaintenance",error);
    return {ok:false,error:classifyDatabaseError(error)};
  }
  for(const p of ["/equipment","/bookings","/calendar","/"]) revalidatePath(p);
  return {ok:true};
}

export async function readMaintenance(input:unknown) {
  const session = await getStaffSession();
  if(!session) return {ok:false,error:"authRequired"} as const;
  const parsed = idSchema.safeParse(input);
  if(!parsed.success) return {ok:false,error:"invalid"} as const;
  try {
    const records = await getDb().equipmentMaintenance.findMany({
      where:{equipmentId:parsed.data},
      orderBy:[{createdAt:"desc"},{id:"desc"}],
      take:100,
      select:{
        id:true, kind:true,condition:true,note:true,createdAt:true,bookingId:true,
        actor:{select:{name:true}},
      },
    });
    return {ok:true,rows:records.map(x=>({
      id:x.id,kind:x.kind,condition:x.condition,note:x.note,createdAt:x.createdAt.toISOString(),
      bookingId:x.bookingId,actor:x.actor.name,
    }))} as const;
  } catch(error) {
    logDatabaseError("readMaintenance",error);
    return {ok:false,error:classifyDatabaseError(error)} as const;
  }
}
