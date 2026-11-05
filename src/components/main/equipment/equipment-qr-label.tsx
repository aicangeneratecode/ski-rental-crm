"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { qrMatrix } from "@/lib/equipment/qr-code";

export default function EquipmentQrLabel({id,code,name,size}:{
  id:string;code:string;name:string;size:string;
}) {
  const t=useTranslations("equipmentQr");
  const [origin,setOrigin]=useState("");
  useEffect(()=>{setOrigin(window.location.origin)},[]);
  const url=origin?origin+"/q/"+id:"";
  const result=useMemo(()=>{
    if(!url)return null;
    try {
      const matrix=qrMatrix(url);
      const path=matrix.flatMap((row,y)=>row.flatMap((dark,x)=>
        dark?["M"+(x+4)+" "+(y+4)+"h1v1h-1z"]:[]
      )).join("");
      return {path};
    }catch{return null}
  },[url]);

  return <div className="space-y-3">
    <div id="topride-print-label" className="mx-auto w-full max-w-[310px] rounded-2xl border border-gray-300 bg-white p-5 text-center text-gray-950">
      <p className="text-sm font-black tracking-[0.18em]">TOP RIDE</p>
      <p className="mt-1 text-xs text-gray-500">BELGRADE · RENTAL</p>
      <p className="mt-3 text-base font-bold break-words">{name}</p>
      <p className="text-xs text-gray-600">{size} · {code}</p>
      {result?<svg role="img" aria-label={t("codeLabel")} viewBox="0 0 45 45" shapeRendering="crispEdges"
        className="mx-auto mt-3 size-52 max-w-full">
        <rect width="45" height="45" fill="#ffffff"/>
        <path fill="#000000" d={result.path}/>
      </svg>:<p role="alert" className="mt-5 text-sm text-red-600">{origin?t("urlTooLong"):t("loading")}</p>}
      <p className="mt-2 text-xs text-gray-500">{t("scanHint")}</p>
    </div>
    {url&&<p className="break-all text-center text-xs text-gray-500">{url}</p>}
    <button type="button" disabled={!result} onClick={()=>window.print()}
      className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40">
      {t("print")}
    </button>
    <style>{`@media print {
      body * {visibility:hidden!important}
      #topride-print-label, #topride-print-label * {visibility:visible!important}
      #topride-print-label {position:fixed;left:10mm;top:10mm;width:65mm!important;padding:4mm!important;box-shadow:none!important;border:1px solid #ddd!important}
      @page {size:auto;margin:0}
    }`}</style>
  </div>;
}
