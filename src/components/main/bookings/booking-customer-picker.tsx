"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { searchBookingCustomers } from "@/lib/bookings/customer-search";
import type { BookingCustomer } from "@/lib/bookings/types";

type Props = {
  customers: BookingCustomer[];
  selectedId: string;
  query: string;
  invalid: boolean;
  onQueryChange: (query: string) => void;
  onSelect: (customer: BookingCustomer) => void;
};

const MAX_SUGGESTIONS = 12;

export default function BookingCustomerPicker({
  customers,
  selectedId,
  query,
  invalid,
  onQueryChange,
  onSelect,
}: Props) {
  const t = useTranslations("bookings");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const matching = searchBookingCustomers(customers, query);
  const suggestions = matching.slice(0, MAX_SUGGESTIONS);
  const selected = customers.find((customer) => customer.id === selectedId);

  function select(customer: BookingCustomer) {
    onSelect(customer);
    setActive(0);
    setOpen(false);
  }

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <Input
        id="booking-customer"
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && suggestions.length ? `${listId}-option-${active}` : undefined}
        aria-invalid={invalid}
        placeholder={t("searchCustomer")}
        value={query}
        onFocus={() => { setOpen(true); setActive(0); }}
        onChange={(event) => {
          onQueryChange(event.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActive((previous) => event.key === "ArrowDown"
              ? Math.min(previous + 1, Math.max(0, suggestions.length - 1))
              : Math.max(0, previous - 1));
            return;
          }
          if (event.key === "Enter" && open && suggestions.length) {
            event.preventDefault();
            select(suggestions[active] ?? suggestions[0]);
          }
        }}
      />

      {open && (
        <div id={listId} role="listbox" aria-label={t("chooseCustomer")}
          className="booking-customer-suggestions absolute inset-x-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-theme-lg dark:border-gray-700 dark:bg-[#232629]">
          {suggestions.map((customer, index) => (
            <button
              id={`${listId}-option-${index}`}
              key={customer.id}
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={customer.id === selectedId}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(customer)}
              className={`flex w-full min-w-0 flex-col gap-1 rounded-lg px-3 py-2.5 text-start transition-colors ${index === active
                ? "bg-brand-50 text-brand-900 dark:bg-brand-500/15 dark:text-brand-100"
                : "text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"}`}
            >
              <span className="truncate text-sm font-semibold">{customer.name}</span>
              <span className="truncate text-xs text-gray-500 dark:text-gray-400">
                {customer.phone || `${t("customerNoPhone")} · ${t("customerShortId", { id: customer.id.slice(0, 8).toUpperCase() })}`}
              </span>
            </button>
          ))}
          {matching.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">{t("customerNoResults")}</p>
          )}
          {matching.length > MAX_SUGGESTIONS && (
            <p className="border-t border-gray-100 px-3 py-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
              {t("customerMoreResults", { shown: MAX_SUGGESTIONS, total: matching.length })}
            </p>
          )}
        </div>
      )}

      {selected ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800 dark:bg-brand-500/10 dark:text-brand-300">
          <span>{t("selectedCustomerLabel")}: <strong>{selected.name}</strong>{selected.phone ? ` · ${selected.phone}` : ""}</span>
          <button type="button" onClick={() => { onQueryChange(""); setActive(0); }}
            className="font-semibold underline underline-offset-2 hover:text-brand-950 dark:hover:text-brand-100">
            {t("changeCustomer")}
          </button>
        </div>
      ) : (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t("customerSearchHint")}</p>
      )}
    </div>
  );
}
