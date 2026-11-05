import type { Metadata } from "next";
import { z } from "zod";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/require-staff";
import { getDb } from "@/lib/db";
import EquipmentQrLabel from "@/components/main/equipment/equipment-qr-label";

export const metadata: Metadata = { title: "QR-наклейка | TOP RIDE" };
export const dynamic = "force-dynamic";

export default async function Page({params}:{
  params:Promise<{id:string}>;
}) {
  await requireStaff();
  const {id}=await params;
  if(!z.uuid().safeParse(id).success)notFound();
  const item=await getDb().equipment.findUnique({
    where:{id},select:{id:true,code:true,name:true,size:true},
  });
  if(!item)notFound();
  return <main className="mx-auto max-w-lg space-y-4 px-4 py-10">
    <h1 className="text-2xl font-bold">QR-наклейка оборудования</h1>
    <p className="text-sm text-gray-500">Распечатайте и приклейте на этот экземпляр оборудования.</p>
    <EquipmentQrLabel {...item}/>
  </main>;
}
