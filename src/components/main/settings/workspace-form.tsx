"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveWorkspaceSettings } from "@/lib/settings/actions";
import type { WorkspaceSnapshot } from "@/lib/settings/workspace";

export default function WorkspaceForm({
  settings, onSaved,
}: { settings: WorkspaceSnapshot; onSaved: () => void }) {
  const t = useTranslations("settingsPanel");
  const router = useRouter();
  const [values, setValues] = useState(settings);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const changed = (["businessName","contactPhone","contactAddress","customerNote"] as const)
    .some(key => values[key].trim() !== settings[key]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !changed) return;
    setBusy(true); setError("");
    try {
      const result = await saveWorkspaceSettings(values);
      if (!result.ok) { setError(result.error); return; }
      onSaved();
      router.refresh();
    } catch {
      setError("database");
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-[#1b1e21]">
      <div>
        <h2 className="text-lg font-bold">{t("businessTitle")}</h2>
        <p className="mt-1 text-sm leading-6 text-gray-500">{t("businessHint")}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {([
          { field: "businessName", max: 120, required: true },
          { field: "contactPhone", max: 40 },
          { field: "contactAddress", max: 250 },
        ] as const).map(({ field, max, ...rest }) => (
          <label key={field} className="space-y-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
            {t(field)}
            <Input value={values[field]} required={"required" in rest && rest.required}
              maxLength={max} disabled={busy} onChange={event => setValues(v => ({ ...v, [field]:event.target.value }))}/>
          </label>
        ))}
      </div>
      <label className="block space-y-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
        {t("customerNote")}
        <Textarea rows={4} maxLength={1000} disabled={busy}
          value={values.customerNote} onChange={event => setValues(v=>({...v,customerNote:event.target.value}))}/>
      </label>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        {t(("settingErrors."+error) as "settingErrors.invalid")}
      </p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={busy || !changed || values.businessName.trim().length < 2}>
          {t(busy ? "savingRate" : "saveContacts")}
        </Button>
      </div>
    </form>
  );
}
