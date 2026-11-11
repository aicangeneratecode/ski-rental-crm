"use client";

import { useTranslations } from "next-intl";
import DeleteRecordButton from "@/components/common/delete-record-button";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { VerticalDotsIcon } from "@/icons";
import { formatBookingMoney } from "@/lib/bookings/types";
import type { CustomerListRow } from "@/lib/customers/list-utils";

interface CustomerListItemProps {
  customer: CustomerListRow;
  onOpen: () => void;
  onEdit: () => void;
}

const avatarTones = [
  "bg-brand-100 text-brand-800 dark:bg-brand-500/20 dark:text-brand-300",
  "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300",
  "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300",
  "bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-300",
  "bg-stone-200 text-stone-800 dark:bg-stone-500/20 dark:text-stone-300",
];

function getInitials(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => part[0]).join("").toLocaleUpperCase("ru") || "TR";
}

function avatarTone(id: string): string {
  let hash = 0;
  for (let index = 0; index < id.length; index++) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return avatarTones[hash % avatarTones.length];
}

export default function CustomerListItem({ customer, onOpen, onEdit }: CustomerListItemProps) {
  const t = useTranslations("customers");
  const w = useTranslations("customersWorkspace");

  return (
    <article className="grid min-w-0 gap-0 overflow-visible rounded-2xl border border-gray-200 bg-white shadow-theme-xs transition-colors hover:border-brand-200 dark:border-gray-800 dark:bg-[#1b1e21] dark:hover:border-brand-800 lg:grid-cols-[minmax(230px,1.5fr)_minmax(180px,1.1fr)_minmax(150px,0.85fr)_100px]">
      <button type="button" onClick={onOpen} aria-label={w("openCustomer", { name: customer.name })}
        className="flex min-w-0 items-center gap-3 px-4 py-3 text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500">
        <span aria-hidden="true" className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold tracking-tight ${avatarTone(customer.id)}`}>
          {getInitials(customer.name)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-gray-900 dark:text-gray-100" title={customer.name}>{customer.name}</span>
          <span className="mt-1 block truncate text-[11px] text-gray-500 dark:text-gray-400">
            {w("customerRef", { id: customer.id.slice(0, 8).toUpperCase() })}
            {" · "}
            {w("rentalsCount", { count: customer.rentalCount })}
          </span>
        </span>
      </button>

      <div className="flex min-w-0 items-center border-t border-gray-100 px-4 py-3 lg:border-s lg:border-t-0 dark:border-gray-800">
        <div className="min-w-0">
          {customer.phone ? (
            <a href={`tel:${customer.phone}`}
              className="block truncate text-sm font-medium text-gray-700 hover:text-brand-700 hover:underline dark:text-gray-300 dark:hover:text-brand-400"
              title={customer.phone}>
              <span aria-hidden="true" className="me-1 text-gray-400">☎</span>
              {customer.phone}
            </a>
          ) : (
            <span className="text-xs text-gray-400">{w("noContacts")}</span>
          )}
          {customer.email && (
            <a href={`mailto:${customer.email}`}
              className="mt-1 block truncate text-xs text-gray-500 hover:text-brand-700 hover:underline dark:text-gray-400 dark:hover:text-brand-400"
              title={customer.email}>
              {customer.email}
            </a>
          )}
        </div>
      </div>

      <div className="flex min-w-0 items-center border-t border-gray-100 px-4 py-3 lg:border-s lg:border-t-0 dark:border-gray-800">
        {customer.balance > 0 ? (
          <div className="min-w-0">
            <p className={`truncate text-sm font-bold tabular-nums ${customer.dueBalance > 0
              ? "text-red-600 dark:text-red-400"
              : "text-amber-700 dark:text-amber-400"}`}>
              {customer.dueBalance > 0 ? w("debt") : w("balance")}: {formatBookingMoney(customer.dueBalance > 0 ? customer.dueBalance : customer.balance)}
            </p>
            {customer.dueBalance > 0 && customer.dueBalance < customer.balance && (
              <p className="mt-1 truncate text-[11px] text-gray-500 dark:text-gray-400">
                {w("overallBalance", { amount: formatBookingMoney(customer.balance) })}
              </p>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-400">{w("paidUp")}</span>
        )}
      </div>

      <div className="relative flex items-center justify-end border-t border-gray-100 px-3 py-2 lg:border-s lg:border-t-0 dark:border-gray-800">
        <DeleteRecordButton kind="customer" id={customer.id} version={customer.version} label={customer.name} />
        <Popover>
          <PopoverTrigger
            type="button"
            aria-label={w("actionsFor", { name: customer.name })}
            className="flex size-9 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white">
            <VerticalDotsIcon className="size-5" />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-52 border border-gray-200 p-1.5 dark:border-gray-700 dark:bg-[#232629]">
            <PopoverClose type="button" onClick={onOpen}
              className="block w-full rounded-lg px-3 py-2.5 text-start text-sm text-gray-800 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-500 dark:text-gray-100 dark:hover:bg-brand-500/10">
              {w("viewProfile")}
            </PopoverClose>
            <PopoverClose type="button" onClick={onEdit}
              className="block w-full rounded-lg px-3 py-2.5 text-start text-sm text-gray-800 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-500 dark:text-gray-100 dark:hover:bg-brand-500/10">
              {t("edit")}
            </PopoverClose>
            <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
            <a href={`tel:${customer.phone}`}
              className="block rounded-lg px-3 py-2.5 text-sm text-gray-800 hover:bg-brand-50 dark:text-gray-100 dark:hover:bg-brand-500/10">
              {w("call")}
            </a>
          </PopoverContent>
        </Popover>
      </div>
    </article>
  );
}
