"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CustomerRow } from "@/lib/customers/schema";

type Props = {
  customer: CustomerRow;
  onClose: () => void;
  onEdit: () => void;
};

const tabs = ["overview", "history", "notes"] as const;

export default function CustomerDetails({
  customer,
  onClose,
  onEdit,
}: Props) {
  const t = useTranslations("customerProfile");
  const [tab, setTab] = useState<(typeof tabs)[number]>("overview");

  const initials = customer.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("ru");

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("open")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
          <div
            aria-hidden="true"
            className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-lg font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300"
          >
            {initials}
          </div>
          <div className="min-w-0">
            <h2 className="break-words text-lg font-semibold">
              {customer.name}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {customer.phone}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={tab === value ? "default" : "outline"}
              aria-pressed={tab === value}
              onClick={() => setTab(value)}
            >
              {t(value)}
            </Button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              {(["rentals", "active", "total"] as const).map((key) => (
                <section
                  key={key}
                  className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
                >
                  <h3 className="text-sm text-gray-500">{t(key)}</h3>
                  <p className="mt-3 font-semibold">{t("unknown")}</p>
                </section>
              ))}
            </div>

            <p className="text-xs leading-5 text-gray-500">
              {t("summaryHint")}
            </p>

            <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <h3 className="font-semibold">{t("contacts")}</h3>

              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-gray-500">{t("phone")}</dt>
                  <dd className="mt-1 text-sm">
                    <a
                      href={`tel:${customer.phone}`}
                      className="text-brand-600 hover:underline dark:text-brand-400"
                    >
                      {customer.phone}
                    </a>
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-gray-500">{t("email")}</dt>
                  <dd className="mt-1 break-all text-sm">
                    {customer.email ? (
                      <a
                        href={`mailto:${customer.email}`}
                        className="text-brand-600 hover:underline dark:text-brand-400"
                      >
                        {customer.email}
                      </a>
                    ) : (
                      t("notSpecified")
                    )}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        )}

        {tab === "history" && (
          <section className="space-y-3">
            <h3 className="font-semibold">{t("historyTitle")}</h3>
            <p className="text-sm text-gray-500">{t("historyHint")}</p>

            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full min-w-[480px] text-start text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    {(["booking", "dates", "status", "amount"] as const).map(
                      (key) => (
                        <th
                          key={key}
                          scope="col"
                          className="px-4 py-3 text-start font-medium"
                        >
                          {t(key)}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-10 text-center text-gray-500"
                    >
                      {t("historyPlaceholder")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "notes" && (
          <section className="space-y-3">
            <h3 className="font-semibold">{t("notes")}</h3>
            <p className="text-xs text-gray-500">{t("notesHint")}</p>
            <div className="whitespace-pre-wrap break-words rounded-xl bg-gray-50 p-4 text-sm leading-6 dark:bg-gray-800">
              {customer.notes || t("noNotes")}
            </div>
          </section>
        )}

        <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("close")}
          </Button>
          <Button type="button" onClick={onEdit}>
            {t("edit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}