import { z } from "zod";
import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { requireStaff } from "@/lib/require-staff";

export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{id:string}>}) {
  await requireStaff();
  const {id}=await params;
  if(!z.uuid().safeParse(id).success)notFound();
  redirect({href:"/equipment?i="+id,locale:"ru"});
}
