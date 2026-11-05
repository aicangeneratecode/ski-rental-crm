"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRsd } from "@/lib/equipment/tariffs";
import type { CashDay, ReportData } from "@/lib/reports/report-data";

const currency = (value: number) => formatRsd(value);
function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0,10);
}
function prevMonth(today: string) {
  const d = new Date(today.slice(0,7) + "-01T00:00:00Z");
  d.setUTCDate(0);
  return {from:d.toISOString().slice(0,7)+"-01",to:d.toISOString().slice(0,10)};
}
function periodMonth(today: string) {
  const d = new Date(today.slice(0,7) + "-01T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth()+1); d.setUTCDate(0);
  return {from:today.slice(0,7)+"-01",to:d.toISOString().slice(0,10)};
}
function cashBuckets(days: CashDay[]) {
  const group = days.length > 65 ? 7 : 1;
  const out:{from:string;to:string;received:number;refunded:number;net:number}[]=[];
  for(let i=0;i<days.length;i+=group){
    const block=days.slice(i,i+group);
    out.push({
      from:block[0].day,to:block[block.length-1].day,
      received:block.reduce((sum,row)=>sum+row.received,0),
      refunded:block.reduce((sum,row)=>sum+row.refunded,0),
      net:block.reduce((sum,row)=>sum+row.net,0),
    });
  }
  return out;
}
const metric="topride-kpi rounded-2xl border bg-white p-4 dark:bg-[#1b1e21]";
const panel="topride-surface rounded-2xl border p-4 sm:p-5";

export default function ReportsDashboard({data,today}:{data:ReportData;today:string}) {
  const t=useTranslations("reports");
  const inventory=useTranslations("inventory");
  const payments=useTranslations("payments");
  const router=useRouter();
  const [from,setFrom]=useState(data.period.from);
  const [to,setTo]=useState(data.period.to);
  const [pending,startTransition]=useTransition();
  const [view,setView]=useState<"daily"|"category">("daily");
  const valid=/^\d{4}-\d{2}-\d{2}$/.test(from) &&
    /^\d{4}-\d{2}-\d{2}$/.test(to) && from<=to;
  const chart=useMemo(()=>cashBuckets(data.days),[data.days]);
  const maxBar=Math.max(1,...chart.map(row=>Math.max(Math.abs(row.net),row.received)));
  const maxCategory=Math.max(1,...data.categories.map(row=>row.unitDays));
  const rate=(name:string)=>inventory.has("tariffs."+name)
    ? inventory(("tariffs."+name) as "tariffs.ski-premium"):name;
  const go=(p:{from:string;to:string})=>{
    setFrom(p.from);setTo(p.to);
    startTransition(()=>router.push("/reports?from="+p.from+"&to="+p.to));
  };
  const presets=[
    {id:"month",days:periodMonth(today)},
    {id:"previous",days:prevMonth(today)},
    {id:"last30",days:{from:shiftDate(today,-29),to:today}},
    {id:"last90",days:{from:shiftDate(today,-89),to:today}},
    {id:"year",days:{from:today.slice(0,4)+"-01-01",to:today.slice(0,4)+"-12-31"}},
  ] as const;
  const totals=[
    {key:"received",value:data.received,accent:"text-emerald-700 dark:text-emerald-300"},
    {key:"refunded",value:data.refunded,accent:"text-rose-700 dark:text-rose-300"},
    {key:"net",value:data.net,accent:"text-brand-700 dark:text-brand-400"},
    {key:"average",value:data.averagePaidBooking,accent:"text-gray-900 dark:text-white"},
  ] as const;

  return <main className="space-y-6 text-gray-900 dark:text-gray-100">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.19em] text-brand-600 dark:text-brand-400">TOP RIDE / REPORTS</p>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t("title")}</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t("subtitle")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/reports/ledger?from=${data.period.from}&to=${data.period.to}`}
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:border-brand-300 hover:text-brand-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">{t("ledgerLink")}</Link>
      <a href={`/reports/export?from=${data.period.from}&to=${data.period.to}`}
        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:border-brand-300 hover:text-brand-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
        {t("exportCsv")}
      </a>
      </div>
    </header>

    <section className={panel} aria-label={t("filterTitle")}>
      <h2 className="text-sm font-semibold">{t("filterTitle")}</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {presets.map(p=>(
          <Button key={p.id} type="button" size="sm" variant="outline" disabled={pending}
            onClick={()=>go(p.days)}>{t(("presets."+p.id) as "presets.month")}</Button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="min-w-[150px] flex-1 space-y-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
          {t("dateFrom")}
          <Input type="date" value={from} onChange={e=>setFrom(e.target.value)} disabled={pending}/>
        </label>
        <label className="min-w-[150px] flex-1 space-y-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
          {t("dateTo")}
          <Input type="date" min={from} value={to} onChange={e=>setTo(e.target.value)} disabled={pending}/>
        </label>
        <Button type="button" disabled={pending||!valid} onClick={()=>go({from,to})}>
          {t(pending?"loading":"apply")}
        </Button>
      </div>
      <p className="mt-3 text-xs leading-5 text-gray-500 dark:text-gray-400">{t("periodHint")}</p>
    </section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label={t("moneyTitle")}>
      {totals.map(item=>(
        <article key={item.key} className={metric}>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t(("metrics."+item.key) as "metrics.net")}</p>
          <p className={`mt-3 text-2xl font-extrabold tabular-nums tracking-tight ${item.accent}`}>{currency(item.value)}</p>
        </article>
      ))}
    </section>

    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(275px,1fr)]">
      <section className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">{t("cashChart")}</h2>
            <p className="mt-1 text-xs text-gray-500">{t("chartHint")}</p>
          </div>
          <span className="text-xs font-semibold text-gray-500">{data.period.from} — {data.period.to}</span>
        </div>
        <div className="topride-chart-grid mt-5 flex h-44 min-w-0 items-end gap-1.5 overflow-x-auto border-b border-gray-200 pb-1 dark:border-gray-800"
          role="img" aria-label={t("chartAlt")}>
          {chart.map(row=>{
            const positive=row.net>=0;
            const height=Math.max(row.net===0?2:5,Math.round(Math.abs(row.net)/maxBar*145));
            return <div key={row.from} className="group flex min-w-[6px] flex-1 items-end justify-center sm:min-w-[10px]"
              title={t("chartPoint",{from:row.from,to:row.to,received:currency(row.received),refunded:currency(row.refunded),net:currency(row.net)})}>
              <div className={`w-full max-w-[26px] rounded-t-sm transition-opacity group-hover:opacity-70 ${positive?"bg-brand-500":"bg-rose-500"}`}
                style={{height}} />
            </div>;
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
          <span><span aria-hidden="true" className="me-1 inline-block size-2 rounded-sm bg-brand-500"/>{t("positive")}</span>
          <span><span aria-hidden="true" className="me-1 inline-block size-2 rounded-sm bg-rose-500"/>{t("negative")}</span>
          <span>{t(chart.length<data.days.length?"weeklyBuckets":"dailyBuckets")}</span>
        </div>
      </section>

      <section className={panel}>
        <h2 className="text-lg font-bold">{t("methodsTitle")}</h2>
        <p className="mt-1 text-xs text-gray-500">{t("methodsHint")}</p>
        <div className="mt-4 space-y-3">
          {data.methods.map(method=>(
            <article key={method.method} className="rounded-xl border border-gray-100 p-3 dark:border-gray-700">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">{payments(("methods."+method.method) as "methods.CASH")}</h3>
                <strong className="text-sm tabular-nums">{currency(method.net)}</strong>
              </div>
              <p className="mt-2 text-xs text-gray-500">{t("methodDetails",{received:currency(method.received),refunded:currency(method.refunded)})}</p>
            </article>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4 text-sm dark:border-gray-800">
          <div><p className="text-xs text-gray-500">{t("metrics.transactions")}</p><p className="mt-1 font-bold tabular-nums">{data.transactions}</p></div>
          <div><p className="text-xs text-gray-500">{t("metrics.paidBookings")}</p><p className="mt-1 font-bold tabular-nums">{data.paidBookings}</p></div>
        </div>
      </section>
    </div>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label={t("inventoryMetrics")}>
      {([
        ["bookingCount",data.bookingCount],
        ["inventoryUnits",data.inventoryUnits],
        ["unitDays",data.occupiedUnitDays],
        ["utilization",data.utilizationPercent],
      ] as const).map(([key,value])=>(
        <article key={key} className={metric}>
          <p className="text-xs text-gray-500">{t(("metrics."+key) as "metrics.utilization")}</p>
          <p className="mt-2 text-2xl font-extrabold tabular-nums">
            {key==="utilization"?value+"%":new Intl.NumberFormat("ru-RU").format(value)}
          </p>
        </article>
      ))}
    </section>

    <section className={panel}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{t("popularityTitle")}</h2>
          <p className="mt-1 text-xs text-gray-500">{t("popularityHint")}</p>
        </div>
        <div className="inline-flex gap-1 rounded-xl border border-gray-200 p-1 dark:border-gray-700">
          {(["category","daily"] as const).map(key=>(
            <button type="button" key={key} aria-pressed={view===key}
              onClick={()=>setView(key)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${view===key?"bg-brand-100 text-brand-800 dark:bg-brand-500/20 dark:text-brand-300":"text-gray-500"}`}>
              {t(("popularityView."+key) as "popularityView.category")}
            </button>
          ))}
        </div>
      </div>
      {view==="category" ? (
        <div className="mt-5 space-y-3">
          {data.categories.filter(row=>row.unitDays>0).map(row=>(
            <div key={row.tariff} className="space-y-1.5">
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span className="font-semibold">{rate(row.tariff)}</span>
                <span className="tabular-nums text-gray-500">{t("categoryDays",{count:row.unitDays})} · {row.utilization}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div className="h-full rounded-full bg-brand-500" style={{width:Math.min(100,row.unitDays/maxCategory*100)+"%"}}/>
              </div>
            </div>
          ))}
          {!data.categories.some(row=>row.unitDays>0)&&<p className="py-8 text-center text-sm text-gray-500">{t("emptyInventory")}</p>}
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[510px] text-sm">
            <thead><tr className="border-b border-gray-200 text-start text-xs text-gray-500 dark:border-gray-700">
              <th scope="col" className="px-2 py-3 text-start">{t("equipmentName")}</th>
              <th scope="col" className="px-2 py-3 text-end">{t("rentalCount")}</th>
              <th scope="col" className="px-2 py-3 text-end">{t("equipmentDays")}</th>
            </tr></thead>
            <tbody>{data.popular.map(row=>(
              <tr key={row.equipmentId} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                <td className="px-2 py-3"><strong>{row.name} · {row.size}</strong><span className="block text-xs text-gray-500">{row.code}</span></td>
                <td className="px-2 py-3 text-end tabular-nums">{row.bookings}</td>
                <td className="px-2 py-3 text-end font-semibold tabular-nums">{row.unitDays}</td>
              </tr>
            ))}</tbody>
          </table>
          {data.popular.length===0&&<p className="py-8 text-center text-sm text-gray-500">{t("emptyInventory")}</p>}
        </div>
      )}
      <p className="mt-5 border-t border-gray-100 pt-4 text-xs leading-6 text-gray-500 dark:border-gray-800 dark:text-gray-400">{t("utilizationCaveat")}</p>
    </section>

    <p className="text-xs leading-6 text-gray-500 dark:text-gray-400">{t("purgeWarning")}</p>
  </main>;
}
