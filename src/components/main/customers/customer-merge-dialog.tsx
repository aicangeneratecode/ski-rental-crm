"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,
} from "@/components/ui/dialog";
import { mergeCustomers } from "@/lib/customers/merge-actions";
import type { CustomerListRow } from "@/lib/customers/list-utils";

export default function CustomerMergeDialog({source,customers,onClose,onMerged}:{
  source:CustomerListRow;customers:CustomerListRow[];
  onClose:()=>void;onMerged:()=>void;
}) {
  const t=useTranslations("customerMerge");
  const router=useRouter();
  const [query,setQuery]=useState("");
  const [targetId,setTargetId]=useState("");
  const [confirm,setConfirm]=useState(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const candidates=useMemo(()=>{
    const q=query.trim().toLocaleLowerCase("ru");
    const digits=q.replace(/\D/g,"");
    return customers.filter(x=>x.id!==source.id&&!x.aliases?.some(a=>a.id===source.id)&&(
      !q||x.name.toLocaleLowerCase("ru").includes(q)||
      x.phone.toLocaleLowerCase("ru").includes(q)||
      digits.length>=4&&x.phone.replace(/\D/g,"").includes(digits)
    )).slice(0,12);
  },[customers,query,source.id]);
  const target=customers.find(c=>c.id===targetId);

  async function perform(){
    if(!target||saving)return;
    setSaving(true);setError("");
    try{
      const result=await mergeCustomers({
        sourceId:source.id,sourceVersion:source.version,
        targetId:target.id,targetVersion:target.version,
      });
      if(!result.ok){setError(result.error);return}
      onMerged();router.refresh();
      onClose();
    }catch{setError("database")}
    finally{setSaving(false)}
  }

  return <Dialog open onOpenChange={open=>{if(!open&&!saving)onClose()}}>
    <DialogContent showCloseButton={!saving} className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{t("title")}</DialogTitle>
        <DialogDescription>{t("description")}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <p className="rounded-xl bg-gray-50 p-3 text-sm dark:bg-gray-800">
          <strong>{t("source")}:</strong> {source.name}
          {source.phone&&<span className="block text-xs text-gray-500">{source.phone}</span>}
          <span className="mt-1 block text-xs text-gray-500">{t("rentalCount",{count:source.rentals.length})}</span>
        </p>
        {!confirm?<>
          <label className="block space-y-2 text-sm font-medium">
            {t("chooseTarget")}
            <Input value={query} onChange={e=>{setQuery(e.target.value);setTargetId("")}}
              placeholder={t("search")} autoFocus/>
          </label>
          <div className="max-h-60 space-y-1 overflow-y-auto" role="radiogroup" aria-label={t("chooseTarget")}>
            {candidates.map(c=><label key={c.id} className={"flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm "+
              (targetId===c.id?"border-brand-500 bg-brand-50 dark:bg-brand-500/10":"border-gray-200 dark:border-gray-700")}>
              <input type="radio" name="merge-target" checked={targetId===c.id} onChange={()=>setTargetId(c.id)}/>
              <span><strong className="block">{c.name}</strong><span className="text-xs text-gray-500">{c.phone||c.id.slice(0,8)}</span></span>
            </label>)}
            {!candidates.length&&<p className="text-sm text-gray-500">{t("notFound")}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>{t("cancel")}</Button>
            <Button type="button" disabled={!target} onClick={()=>{setError("");setConfirm(true)}}>{t("next")}</Button>
          </div>
        </>:<>
          <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            <p className="font-bold">{t("confirmTitle")}</p>
            <p>{t("confirmQuestion",{source:source.name,target:target?.name||""})}</p>
            <p>{t("confirmHint",{count:source.rentals.length})}</p>
            <p className="text-xs">{t("aliasHint")}</p>
          </div>
          {error&&<p role="alert" className="text-sm text-red-600 dark:text-red-400">{t("errors."+error as "errors.invalid")}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={()=>setConfirm(false)}>{t("back")}</Button>
            <Button type="button" disabled={saving||!target} onClick={perform}>{t(saving?"saving":"merge")}</Button>
          </div>
        </>}
      </div>
    </DialogContent>
  </Dialog>;
}
