"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import CustomerDetails from "./customer-details";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusIcon } from "@/icons";
import type { CustomerRow } from "@/lib/customers/schema";
import CustomerForm from "./customer-form";

interface CustomersProps {
  rows: CustomerRow[];
}

export default function Customers({ rows }: CustomersProps) {
  const t = useTranslations("customers");
  const profileT = useTranslations("customerProfile");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedCustomer = rows.find((row) => row.id === selectedId);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<CustomerRow | "new" | null>(null);
  const [saved, setSaved] = useState(false);

  const textQuery = query.trim().toLocaleLowerCase("ru");
  const phoneQuery = query.replace(/\D/g, "");

  const visible = rows.filter((row) => {
    if (!textQuery) return true;

    const text = `${row.name} ${row.email} ${row.phone}`
      .toLocaleLowerCase("ru");

    return (
      text.includes(textQuery) ||
      (phoneQuery.length > 0 &&
        row.phone.replace(/\D/g, "").includes(phoneQuery))
    );
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-2xl text-sm text-gray-500 dark:text-gray-400">
          {t("description")}
        </p>

        <Button
          onClick={() => {
            setSaved(false);
            setEditing("new");
          }}
        >
          <PlusIcon />
          {t("add")}
        </Button>
      </div>

      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("search")}
        aria-label={t("search")}
      />

      {saved && (
        <p role="status" className="text-sm text-brand-600 dark:text-brand-300">
          {t("saved")}
        </p>
      )}

      {visible.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((row) => (
            <article
              key={row.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between gap-4">
                <h2 className="min-w-0 break-words font-semibold text-gray-900 dark:text-white">
                  {row.name}
                </h2>

                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`${t("edit")}: ${row.name}`}
                  onClick={() => {
                    setSaved(false);
                    setEditing(row);
                  }}
                >
                  {t("edit")}
                </Button>
              </div>

              <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                {row.phone}
              </p>

              {row.email && (
                <p className="mt-1 break-all text-sm text-gray-500 dark:text-gray-400">
                  {row.email}
                </p>
              )}

              {row.notes && (
                <p className="mt-4 whitespace-pre-wrap break-words border-t border-gray-100 pt-3 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-400">
                  {row.notes}
                </p>
              )}
              <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => setSelectedId(row.id)}
            >
            {profileT("open")}
            </Button>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-gray-900">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {t(rows.length ? "noMatches" : "empty")}
          </h2>

          {rows.length ? (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setQuery("")}
            >
              {t("reset")}
            </Button>
          ) : (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t("emptyHint")}
            </p>
          )}
        </div>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t("shown", { count: visible.length, total: rows.length })}
      </p>

      {selectedCustomer && (
        <CustomerDetails
            key={selectedCustomer.id}
            customer={selectedCustomer}
            onClose={() => setSelectedId(null)}
            onEdit={() => {
            setSaved(false);
            setEditing(selectedCustomer);
            setSelectedId(null);
            }}
        />
        )}

      {editing && (
        <CustomerForm
          key={editing === "new" ? "new" : `${editing.id}-${editing.version}`}
          item={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => setSaved(true)}
        />
      )}
    </div>
  );
}