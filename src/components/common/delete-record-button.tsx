"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TrashBinIcon } from "@/icons";
import {
  deleteRecord,
  type DeleteRecordError,
  type RecordKind,
} from "@/lib/deletion/actions";

interface DeleteRecordButtonProps {
  kind: RecordKind;
  id: string;
  version: number;
  label: string;
  disabled?: boolean;
  onDeleted?: () => void;
}

export default function DeleteRecordButton({
  kind,
  id,
  version,
  label,
  disabled = false,
  onDeleted,
}: DeleteRecordButtonProps) {
  const t = useTranslations("deleteRecord");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<DeleteRecordError | null>(null);
  const busy = pending || refreshing;

  async function confirmDelete() {
    if (busy || finished) return;
    setPending(true);
    setError(null);
    try {
      const result = await deleteRecord({ kind, id, version });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFinished(true);
      setOpen(false);
      onDeleted?.();
      startTransition(() => router.refresh());
    } catch {
      setError("database");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        disabled={disabled || busy || finished}
        onClick={() => { setError(null); setOpen(true); }}
        aria-label={t("open", { name: label })}
        title={t("open", { name: label })}
        className="shrink-0 text-gray-400 hover:bg-red-50 hover:text-red-700 focus-visible:ring-red-500/30 dark:text-gray-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
      >
        <TrashBinIcon className="size-4" />
      </Button>

      <Dialog open={open} onOpenChange={(next) => { if (!busy) setOpen(next); }}>
        <DialogContent role="alertdialog" showCloseButton={false} className="sm:max-w-md dark:bg-[#1b1e21]">
          <DialogHeader>
            <div aria-hidden="true" className="mb-2 flex size-11 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400">
              <TrashBinIcon className="size-5" />
            </div>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("question", { name: label })}</DialogDescription>
          </DialogHeader>

          <p className="rounded-xl border border-red-100 bg-red-50/60 p-3 text-xs leading-5 text-red-800 dark:border-red-900/70 dark:bg-red-950/25 dark:text-red-300">
            {kind === "customer" ? t("customerWarning") : t("equipmentWarning")}
          </p>

          {error && (
            <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
              {t(`errors.${error}`)}
            </p>
          )}

          <DialogFooter className="-mx-6 -mb-6 border-t border-gray-100 dark:border-gray-800">
            <Button type="button" variant="outline" disabled={busy} onClick={() => { setError(null); setOpen(false); }}>
              {t("no")}
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500/30 dark:bg-red-600 dark:text-white dark:hover:bg-red-500"
            >
              {t(pending ? "deleting" : "yes")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
