"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import ArchiveBookingButton from "./archive-booking-button";
import { getTodayKind } from "@/lib/bookings/today";
import { formatBookingDate, formatBookingMoney } from "@/lib/bookings/types";
import BookingActions from "./booking-actions";
import { rentalBalance, type RentalRow } from "./booking-list-utils";

type Props = { row: RentalRow; today: string; compact: boolean; onOpen: (id: string) => void; onEdit: (id: string, mode: "edit" | "extend") => void };

const statusTone: Record<RentalRow["status"], string> = {
  RESERVED: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  ISSUED: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  RETURNED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  CANCELLED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((part) => part.charAt(0)).join("").toLocaleUpperCase("ru") || "TR";
}

function lateDays(endDate: string, today: string) {
  return Math.max(0, Math.round((Date.parse(today + "T00:00:00Z") - Date.parse(endDate + "T00:00:00Z")) / 86_400_000));
}

export default function BookingRentalCard({ row, today, compact, onOpen, onEdit }: Props) {
  const t = useTranslations("bookings");
  const paymentT = useTranslations("bookingPaymentList");
  const kind = getTodayKind(row, today);
  const due = rentalBalance(row);
  const isCancelled = row.status === "CANCELLED";
  const isArchived = Boolean(row.archivedAt);
  const paidPercent = row.total > 0 ? Math.max(0, Math.min(100, (row.netPaid / row.total) * 100)) : 100;
  const tags = compact ? row.items.slice(0, 2) : row.items.slice(0, 4);
  const extra = row.items.length - tags.length;
  return (
    <article className="overflow-hidden rounded-2xl border border-[#e9e6e1] bg-white shadow-theme-xs transition-colors hover:border-brand-200 dark:border-[#313337] dark:bg-[#1b1e21] dark:hover:border-brand-800">
      <div className="grid lg:grid-cols-[minmax(130px,0.85fr)_minmax(165px,1.1fr)_minmax(250px,3fr)_minmax(175px,1.2fr)]">
        <div className={`flex flex-col items-start gap-2 border-b border-gray-100 lg:border-e lg:border-b-0 dark:border-gray-800 ${compact ? "p-3" : "p-4"}`}>
          <span className="text-sm font-extrabold tracking-tight text-gray-900 dark:text-white">#{row.id.slice(0, 8).toUpperCase()}</span>
          <span className={`inline-flex max-w-full rounded-md px-2.5 py-1 text-[11px] font-semibold ${statusTone[row.status]}`}>
            {t(`statuses.${row.status}`)}
          </span>
          {isArchived && <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t("workspace.views.archived")}</span>}
          {(kind === "overdue" || kind === "missed") && (
            <span className="text-xs font-semibold text-red-600 dark:text-red-400">
              {kind === "overdue"
                ? t("workspace.lateDays", { count: lateDays(row.endDate, today) })
                : t("workspace.missed")}
            </span>
          )}
          {(kind === "pickup" || kind === "return") && (
            <span className="text-xs font-semibold text-brand-700 dark:text-brand-400">
              {t(`workspace.situations.${kind}`)}
            </span>
          )}
        </div>

        <div className={`flex flex-col justify-center border-b border-gray-100 bg-gray-50/55 lg:border-e lg:border-b-0 dark:border-gray-800 dark:bg-white/2 ${compact ? "p-3" : "p-4"}`}>
          <p className="text-[10px] font-bold uppercase tracking-[0.11em] text-gray-400">{t("layout.period")}</p>
          <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{formatBookingDate(row.startDate)}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{formatBookingDate(row.endDate)}</p>
          {!compact && <p className="mt-2 text-[11px] text-gray-400">{t("paidDays", { count: row.paidDays })}</p>}
        </div>

        <div className={`min-w-0 border-b border-gray-100 lg:border-e lg:border-b-0 dark:border-gray-800 ${compact ? "p-3" : "p-4"}`}>
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xs font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
              {initials(row.customerName)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-gray-900 dark:text-gray-100" title={row.customerName}>{row.customerName}</p>
              <a href={`tel:${row.customerPhone}`} className="mt-0.5 inline-block text-xs text-gray-500 hover:text-brand-600 hover:underline dark:text-gray-400 dark:hover:text-brand-400">
                {row.customerPhone}
              </a>
            </div>
          </div>
          <div className={`flex flex-wrap gap-1.5 ${compact ? "mt-2" : "mt-3"}`}>
            {tags.map((item) => (
              <span key={item.id} title={item.name}
                className="max-w-full truncate rounded-md bg-gray-100 px-2.5 py-1.5 text-[11px] font-medium text-gray-700 dark:bg-white/7 dark:text-gray-300">
                {item.name}
              </span>
            ))}
            {extra > 0 && (
              <span className="rounded-md border border-gray-200 px-2 py-1.5 text-[11px] text-gray-500 dark:border-gray-700 dark:text-gray-400">+{extra}</span>
            )}
          </div>
        </div>

        <div className={`flex flex-col justify-center ${compact ? "p-3" : "p-4"}`}>
          <p className="text-[10px] font-bold uppercase tracking-[0.11em] text-gray-400">{t("total")}</p>
          <p className="mt-1 text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">{formatBookingMoney(row.total)}</p>
          <div role="meter" aria-label={t("workspace.paymentProgress")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(paidPercent)} className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
            <div className={`h-full rounded-full ${due > 0 ? "bg-brand-500" : "bg-emerald-500"}`} style={{ width: `${paidPercent}%` }} />
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{paymentT("paid", { amount: formatBookingMoney(row.netPaid) })}</p>
          {isCancelled ? (
            <p className="mt-1 text-xs text-gray-400">{paymentT("cancelled")}</p>
          ) : due === 0 ? (
            <p className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">{paymentT("settled")}</p>
          ) : (
            <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">{paymentT("remaining", { amount: formatBookingMoney(due) })}</p>
          )}
        </div>
      </div>
      <div className={`flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/45 px-4 dark:border-gray-800 dark:bg-white/2 ${compact ? "py-1.5" : "py-2.5"}`}>
        <BookingActions key={`${row.id}-${row.version}`} booking={row} compact />
        <div className="flex flex-wrap items-center gap-2">
          {!isArchived && (row.status === "RESERVED" || row.status === "ISSUED") && (
            <>
              {row.status === "RESERVED" && <Button type="button" size="sm" variant="ghost" onClick={() => onEdit(row.id, "edit")}>{t("editBooking")}</Button>}
              <Button type="button" size="sm" variant="outline" onClick={() => onEdit(row.id, "extend")}>{t("extendBooking")}</Button>
            </>
          )}
          {(row.status === "RETURNED" || row.status === "CANCELLED") && (
            <ArchiveBookingButton id={row.id} version={row.version} archived={isArchived} label={t("reference", { id: row.id.slice(0, 8).toUpperCase() })} />
          )}
          <Button type="button" size="sm" variant="outline" onClick={() => onOpen(row.id)}>{t("workspace.openDetails")}</Button>
        </div>
      </div>
    </article>
  );
}
