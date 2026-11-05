"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ArchiveIcon } from "@/icons";
import { useRouter } from "@/i18n/navigation";
import { changeBookingArchive, type ArchiveBookingResult } from "@/lib/bookings/archive-actions";

type Failure = Extract<ArchiveBookingResult, { ok: false }>["error"];
const errorKey: Record<Failure, string> = {
  authRequired: "errors.authRequired",
  invalid: "errors.invalid",
  notFound: "errors.notFound",
  conflict: "errors.conflict",
  activeBooking: "errors.activeBooking",
  schemaOutdated: "errors.schemaOutdated",
  databaseUnavailable: "errors.databaseUnavailable",
  database: "errors.database",
};

export default function ArchiveBookingButton({
  id, version, label, archived,
}: { id: string; version: number; label: string; archived: boolean }) {
  const t = useTranslations("bookingArchive");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<Failure | null>(null);
  const [refreshing, startTransition] = useTransition();
  const busy = saving || refreshing;

  async function confirm() {
    if (busy || finished) return;
    setSaving(true);
    setError(null);
    try {
      const response = await changeBookingArchive({
        id, version, operation: archived ? "restore" : "archive",
      });
      if (!response.ok) {
        setError(response.error);
        return;
      }
      setFinished(true);
      setOpen(false);
      startTransition(() => router.refresh());
    } catch {
      setError("database");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        type="button" size="sm" variant="ghost"
        disabled={busy || finished}
        onClick={() => { setError(null); setOpen(true); }}
        title={t(archived ? "restore" : "archive")}
        aria-label={t(archived ? "restoreLabel" : "archiveLabel", { name: label })}
        className="gap-1.5"
      >
        <ArchiveIcon className="size-4" />
        <span className="hidden sm:inline">{t(archived ? "restore" : "archive")}</span>
      </Button>

      <Dialog open={open} onOpenChange={(value) => { if (!busy) setOpen(value); }}>
        <DialogContent role="alertdialog" showCloseButton={false} className="sm:max-w-md dark:bg-[#1b1e21]">
          <DialogHeader>
            <DialogTitle>{t(archived ? "restoreTitle" : "archiveTitle")}</DialogTitle>
            <DialogDescription>{t(archived ? "restoreQuestion" : "archiveQuestion", { name: label })}</DialogDescription>
          </DialogHeader>
          <p className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300">
            {t(archived ? "restoreHint" : "archiveHint")}
          </p>
          {error && <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">{t(errorKey[error] as "errors.invalid")}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>{t("no")}</Button>
            <Button type="button" disabled={busy} onClick={confirm}>
              {t(saving ? "saving" : archived ? "yesRestore" : "yesArchive")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
