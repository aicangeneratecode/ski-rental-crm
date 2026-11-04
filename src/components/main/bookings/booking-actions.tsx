"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { changeBookingStatus } from "@/lib/bookings/status-actions";
import type {
  BookingAction,
  StatusError,
} from "@/lib/bookings/status-schema";
import type { BookingRow } from "@/lib/bookings/types";

const confirmationKeys = {
  issue: "confirmIssue",
  return: "confirmReturn",
  cancel: "confirmCancel",
} as const;

export default function BookingActions({
  booking,
  compact = false,
}: {
  booking: BookingRow;
  compact?: boolean;
}) {
  const t = useTranslations("bookings.operations");
  const router = useRouter();

  const [selected, setSelected] = useState<BookingAction | null>(null);
  const [error, setError] = useState<StatusError | null>(null);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [refreshing, startTransition] = useTransition();

  const busy = saving || refreshing || completed;

  const actions: BookingAction[] =
    booking.status === "RESERVED"
      ? ["issue", "cancel"]
      : booking.status === "ISSUED"
        ? ["return"]
        : [];

  async function confirm() {
    if (!selected || busy) return;

    setSaving(true);
    setError(null);

    try {
      const result = await changeBookingStatus({
        id: booking.id,
        version: booking.version,
        action: selected,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setCompleted(true);
      setSelected(null);

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError("database");
    } finally {
      setSaving(false);
    }
  }

  if (actions.length === 0) return null;

  return (
    <div className={compact ? "space-y-2" : "space-y-3 border-t border-gray-100 pt-3 dark:border-gray-800"}>
      {completed ? (
        <p role="status" className="text-sm text-green-600">
          {t("saved")}
        </p>
      ) : selected ? (
        <div className="space-y-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
          <p className="text-sm">
            {t(confirmationKeys[selected])}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy}
              onClick={confirm}
            >
              {t(saving ? "pending" : "confirm")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setSelected(null);
                setError(null);
              }}
            >
              {t("back")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button
              key={action}
              type="button"
              variant={action === "cancel" ? "outline" : "default"}
              disabled={busy}
              onClick={() => {
                setSelected(action);
                setError(null);
              }}
            >
              {t(action)}
            </Button>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {t(`errors.${error}`)}
        </p>
      )}
    </div>
  );
}