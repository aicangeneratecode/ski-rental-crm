"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { readMaintenance, saveMaintenance } from "@/lib/equipment/maintenance-actions";
import type { EquipmentRow } from "@/lib/equipment/types";

type History = Awaited<ReturnType<typeof readMaintenance>>;
type Kind = "INSPECTION"|"SERVICE"|"DAMAGE";
type Condition = "OK"|"NEEDS_SERVICE"|"DAMAGED";

export default function EquipmentMaintenancePanel({item, readOnly}:{
  item:EquipmentRow;readOnly:boolean;
}) {
  const t=useTranslations("equipmentMaintenance");
  const router=useRouter();
  const [history,setHistory]=useState<History|null>(null);
  const [revision,setRevision]=useState(0);
  const [version,setVersion]=useState(item.version);
  const [kind,setKind]=useState<Kind>("INSPECTION");
  const [condition,setCondition]=useState<Condition>("OK");
  const [note,setNote]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState(false);
  useEffect(()=>{
    let active=true;
    readMaintenance(item.id).then(result=>{if(active)setHistory(result)}).catch(()=>{
      if(active)setHistory({ok:false,error:"database"});
    });
    return ()=>{active=false};
  },[item.id,revision]);

  async function submit() {
    if(busy||readOnly)return;
    setBusy(true);setError("");setSuccess(false);
    try {
      const result=await saveMaintenance({
        equipmentId:item.id,version:Math.max(version,item.version),kind,condition:kind==="DAMAGE"?"DAMAGED":condition,note,
      });
      if(!result.ok){setError(result.error);return}
      setVersion(v=>Math.max(v,item.version)+1);
      setNote("");setSuccess(true);setRevision(v=>v+1);
      router.refresh();
    }catch{setError("database")}
    finally{setBusy(false)}
  }
  return <section className="space-y-4">
    <div>
      <h3 className="font-semibold">{t("title")}</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("hint")}</p>
    </div>
    {!readOnly&&item.status!=="ARCHIVED"&&(
      <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
        {item.bookings.some(b=>b.status==="ISSUED")&&(
          <p role="alert" className="text-sm text-amber-700 dark:text-amber-400">{t("issuedWarning")}</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">
            {t("kind")}
            <select value={kind} onChange={e=>{
              const next=e.target.value as Kind;setKind(next);
              if(next==="DAMAGE")setCondition("DAMAGED");
            }} className="mt-1 block h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-900">
              {(["INSPECTION","SERVICE","DAMAGE"]as const).map(x=><option key={x} value={x}>{t("kinds."+x)}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">
            {t("condition")}
            <select value={kind==="DAMAGE"?"DAMAGED":condition} disabled={kind==="DAMAGE"}
              onChange={e=>setCondition(e.target.value as Condition)}
              className="mt-1 block h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-900">
              {(["OK","NEEDS_SERVICE","DAMAGED"]as const).map(x=><option key={x} value={x}>{t("conditions."+x)}</option>)}
            </select>
          </label>
        </div>
        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">
          {t("note")}
          <Textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={1500} rows={3} className="mt-1" />
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400">{t("statusHint")}</p>
        {error&&<p role="alert" className="text-sm text-red-600 dark:text-red-400">{t("errors."+error as "errors.invalid")}</p>}
        {success&&<p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">{t("saved")}</p>}
        <Button type="button" disabled={busy||item.bookings.some(b=>b.status==="ISSUED")} onClick={submit}>
          {t(busy?"saving":"save")}
        </Button>
      </div>
    )}
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">{t("history")}</h4>
      {!history&&<p role="status" className="text-sm text-gray-500">{t("loading")}</p>}
      {history&&!history.ok&&<p role="alert" className="text-sm text-red-600">{t("errors.database")}</p>}
      {history?.ok&&history.rows.length===0&&<p className="text-sm text-gray-500">{t("empty")}</p>}
      {history?.ok&&<ol className="max-h-72 space-y-2 overflow-y-auto">
        {history.rows.map(row=><li key={row.id} className="rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-700">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <strong>{t("kinds."+row.kind)}</strong>
            <time dateTime={row.createdAt} className="text-xs text-gray-500">
              {new Intl.DateTimeFormat("ru-RU",{timeZone:"Europe/Belgrade",dateStyle:"medium",timeStyle:"short"}).format(new Date(row.createdAt))}
            </time>
          </div>
          <p className="mt-1 text-xs text-gray-500">{row.actor} {row.condition&&"· "+t("conditions."+row.condition as "conditions.OK")}</p>
          {row.note&&<p className="mt-2 whitespace-pre-wrap break-words text-sm">{row.note}</p>}
          {row.bookingId&&<p className="mt-1 text-xs text-gray-500">{t("bookingRef",{id:row.bookingId.slice(0,8).toUpperCase()})}</p>}
        </li>)}
      </ol>}
    </div>
  </section>;
}
