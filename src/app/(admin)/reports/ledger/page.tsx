import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireStaff } from "@/lib/require-staff";
import { getBelgradeDate } from "@/lib/bookings/today";
import { parseReportPeriod } from "@/lib/reports/report-data";
import { loadLedgerPage, normalizeLedgerFilters } from "@/lib/reports/ledger";
import { formatRsd } from "@/lib/equipment/tariffs";
import ComponentCard from "@/components/common/component-card";

export const metadata:Metadata={title:"Журнал операций | TOP RIDE"};
export const dynamic="force-dynamic";
const surface="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-[#1b1e21]";

export default async function Page({searchParams}:{
  searchParams:Promise<{
    from?:string;to?:string;kind?:string;method?:string;query?:string;cursor?:string;
  }>;
}) {
  await requireStaff();
  setRequestLocale("ru");
  const t=await getTranslations("reportsLedger");
  const payments=await getTranslations("payments");
  const params=await searchParams;
  const period=parseReportPeriod(params,getBelgradeDate());
  if(!period)return (
    <ComponentCard title={t("invalidPeriod")}>
      <Link href="/reports/ledger" className="mt-3 text-brand-700 underline dark:text-brand-300">{t("reset")}</Link>
    </ComponentCard>
  );
  const filters=normalizeLedgerFilters(params);
  const result=await loadLedgerPage(period,filters).catch(err=>{
    console.error("[TOP RIDE ledger] Query failed",err);
    return null;
  });
  if(!result)return (
    <ComponentCard title={t("offlineTitle")}>
      <p className="text-sm text-gray-500">{t("offlineHint")}</p>
    </ComponentCard>
  );

  const querystring = (cursor?:string) => {
    const q=new URLSearchParams();
    q.set("from",period.from);q.set("to",period.to);
    if(filters.kind)q.set("kind",filters.kind);
    if(filters.method)q.set("method",filters.method);
    if(filters.query)q.set("query",filters.query);
    if(cursor)q.set("cursor",cursor);
    return "/reports/ledger?"+q.toString();
  };
  return (
    <main className="space-y-5 text-gray-900 dark:text-white">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">TOP RIDE / PAYMENTS</p>
          <h1 className="text-3xl font-extrabold tracking-tight">{t("title")}</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t("subtitle")}</p>
        </div>
        <Link href={`/reports?from=${period.from}&to=${period.to}`}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold hover:border-brand-300 dark:border-gray-700">
          {t("back")}
        </Link>
      </header>
      <section className={surface}>
        <form action="/reports/ledger" method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <label className="space-y-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
            {t("from")}
            <input type="date" name="from" defaultValue={period.from}
              className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"/>
          </label>
          <label className="space-y-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
            {t("to")}
            <input type="date" name="to" defaultValue={period.to}
              className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"/>
          </label>
          <label className="space-y-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
            {t("kind")}
            <select name="kind" defaultValue={filters.kind}
              className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900">
              <option value="">{t("all")}</option>
              <option value="PAYMENT">{payments("kinds.PAYMENT")}</option>
              <option value="REFUND">{payments("kinds.REFUND")}</option>
            </select>
          </label>
          <label className="space-y-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
            {t("method")}
            <select name="method" defaultValue={filters.method}
              className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900">
              <option value="">{t("all")}</option>
              {(["CASH","CARD","TRANSFER"] as const).map(code=>(
                <option value={code} key={code}>{payments(`methods.${code}`)}</option>
              ))}
            </select>
          </label>
          <div className="flex min-w-0 gap-2">
            <input name="query" type="search" defaultValue={filters.query}
              maxLength={100} placeholder={t("search")}
              aria-label={t("search")}
              className="h-10 min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"/>
            <button type="submit" className="shrink-0 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white">{t("apply")}</button>
          </div>
        </form>
      </section>
      <section className={surface}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">{t("records")}</h2>
          <p className="text-xs text-gray-500">{t("pageInfo",{count:result.rows.length})}</p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="mobile-report-table w-full min-w-[780px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs text-gray-500 dark:border-gray-700">
                {(["date","customer","reference","kind","method","amount","employee"] as const).map(key=>(
                  <th scope="col" key={key} className={"px-3 py-3 font-semibold "+(key==="amount"?"text-end":"text-start")}>{t(key)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map(row=>(
                <tr key={row.id} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                  <td data-label={t("date")} className="px-3 py-4 whitespace-nowrap text-xs text-gray-500">
                    {new Intl.DateTimeFormat("ru-RU",{timeZone:"Europe/Belgrade",dateStyle:"short",timeStyle:"short"}).format(new Date(row.createdAt))}
                  </td>
                  <td data-label={t("customer")} className="px-3 py-4">
                    <p className="font-semibold">{row.customerName}</p>
                    <span className="text-xs text-gray-500">{row.customerPhone}</span>
                  </td>
                  <td data-label={t("reference")} className="px-3 py-4">
                    <Link href={`/bookings?bookingId=${row.bookingId}`} className="font-semibold text-brand-700 hover:underline dark:text-brand-400">
                      #{row.bookingId.slice(0,8).toUpperCase()}
                    </Link>
                  </td>
                  <td data-label={t("kind")} className="px-3 py-4">{payments(`kinds.${row.kind}`)}</td>
                  <td data-label={t("method")} className="px-3 py-4">{payments(`methods.${row.method}`)}</td>
                  <td data-label={t("amount")} className={`px-3 py-4 text-end font-bold tabular-nums ${row.kind==="REFUND"?"text-rose-700 dark:text-rose-300":"text-emerald-700 dark:text-emerald-300"}`}>
                    {row.kind==="REFUND"?"−":"+"}{formatRsd(row.amount)}
                  </td>
                  <td data-label={t("employee")} className="px-3 py-4 text-xs">{row.employeeName}{row.note&&<span className="mt-1 block max-w-36 truncate text-gray-500" title={row.note}>{row.note}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {result.rows.length===0 && <p className="py-10 text-center text-sm text-gray-500">{t("empty")}</p>}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
          <Link href={querystring()} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold hover:border-brand-300 dark:border-gray-700">{t("first")}</Link>
          {result.hasMore&&result.nextCursor ? (
            <Link href={querystring(result.nextCursor)} className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white">{t("next")}</Link>
          ) : <span className="text-xs text-gray-500">{t("last")}</span>}
        </div>
      </section>
      <p className="text-xs text-gray-500">{t("purgeWarning")}</p>
    </main>
  );
}
