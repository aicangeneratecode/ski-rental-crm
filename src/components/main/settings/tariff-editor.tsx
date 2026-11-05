"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";
import { saveTariffSetting } from "@/lib/settings/actions";
import type { TariffRateRow } from "@/lib/equipment/tariff-settings";
import { formatRsd } from "@/lib/equipment/tariffs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

export default function TariffEditor({ row, onSaved }: {
  row: TariffRateRow; onSaved: (affected: number) => void;
}) {
  const t = useTranslations("settingsPanel");
  const inventory = useTranslations("inventory");
  const router = useRouter();
  const [value, setValue] = useState(row.rate === null ? "" : String(row.rate));
  const [manual, setManual] = useState(row.rate === null);
  const [applyToReady, setApplyToReady] = useState(false);
  const [confirmApply, setConfirmApply] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const rate = manual ? null : Number(value);
  const valid = manual || (value.trim() !== "" && Number.isInteger(rate) && Number(rate) >= 0 && Number(rate) <= 1_000_000);
  const changed = rate !== row.rate || (applyToReady && !manual);

  async function submit() {
    if (busy || !valid || !changed) return;
    setBusy(true); setError("");
    try {
      const result = await saveTariffSetting({
        code: row.code, version: row.version,
        rate, applyToReady: applyToReady && !manual,
      });
      if (!result.ok) {
        setError(result.error);
        setConfirmApply(false);
        return;
      }
      setConfirmApply(false);
      onSaved(result.affected ?? 0);
      router.refresh();
    } catch {
      setError("database");
      setConfirmApply(false);
    } finally { setBusy(false); }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-[#1b1e21]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            {inventory(`tariffs.${row.code}`)}
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {inventory(`categories.${row.category}`)}
            {" · "}
            {row.custom ? t("customTariff") : t("defaultTariff")}
          </p>
        </div>
        <span className="text-xs font-semibold tabular-nums text-gray-500">
          {row.rate === null ? inventory("manual") : formatRsd(row.rate)}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="min-w-32 flex-1 space-y-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
          {t("newRate")}
          <Input type="number" min="0" max="1000000" step="1"
            value={value} disabled={busy || manual}
            onChange={event => setValue(event.target.value)}
            aria-invalid={!valid} />
        </label>
        <Button type="button" disabled={busy || !valid || !changed}
          onClick={() => applyToReady && !manual ? setConfirmApply(true) : void submit()}>
          {t(busy ? "savingRate" : "saveRate")}
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
          <input type="checkbox" checked={manual} disabled={busy} onChange={event => {
            setManual(event.target.checked); if (event.target.checked) setApplyToReady(false);
          }} />
          {t("manualRate")}
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
          <input type="checkbox" checked={applyToReady} disabled={busy || manual}
            onChange={event => setApplyToReady(event.target.checked)} />
          {t("syncReady")}
        </label>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
        {t(("settingErrors." + error) as "settingErrors.invalid")}
      </p>}

      <Dialog open={confirmApply} onOpenChange={open => { if (!busy) setConfirmApply(open); }}>
        <DialogContent showCloseButton={false} role="alertdialog" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("syncConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("syncConfirmBody", {
              name: inventory(`tariffs.${row.code}`),
              amount: rate === null ? inventory("manual") : formatRsd(rate),
            })}</DialogDescription>
          </DialogHeader>
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            {t("syncConfirmWarning")}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmApply(false)}>{t("cancelRate")}</Button>
            <Button type="button" disabled={busy} onClick={() => void submit()}>{t("syncConfirmYes")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
