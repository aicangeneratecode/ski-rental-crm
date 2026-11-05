"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import RentalDatePicker from "@/components/ui/rental-date-picker";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "@/i18n/navigation";
import { rescheduleBooking } from "@/lib/bookings/reschedule-actions";
import type { BookingErrorCode } from "@/lib/bookings/schema";
import type { CalendarRental } from "./calendar-types";
import { addDays, dayStamp, formatShortDate } from "./calendar-utils";

export default function CalendarMoveDialog({
  rental, initialStart, onClose, onSaved,
}: {
  rental: CalendarRental;
  initialStart: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("calendarWorkspace");
  const errors = useTranslations("bookings");
  const router = useRouter();
  const [startDate, setStartDate] = useState(initialStart);
  const [error, setError] = useState<BookingErrorCode | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const days = Math.round((dayStamp(rental.endDate) - dayStamp(rental.startDate)) / 86_400_000);
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(startDate) && Number.isFinite(dayStamp(startDate));
  const endDate = valid ? addDays(startDate, days) : "";
  const disabled = saving || refreshing;

  async function confirm() {
    if (!valid || disabled || startDate === rental.startDate) return;
    setError(null);
    setSaving(true);
    try {
      const result = await rescheduleBooking({
        id: rental.id, version: rental.version, startDate,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved();
      startTransition(() => router.refresh());
      onClose();
    } catch {
      setError("database");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !disabled) onClose(); }}>
      <DialogContent role="alertdialog" showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("moveBookingTitle")}</DialogTitle>
          <DialogDescription>
            {t("moveBookingQuestion", { name: rental.customerName })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <p className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
            {t("originalDates", {
              from: formatShortDate(rental.startDate), to: formatShortDate(rental.endDate),
            })}
          </p>
          <label className="block space-y-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
            {t("newStart")}
            <RentalDatePicker label={t("newStart")} value={startDate}
              clearable={false} onChange={setStartDate} />
          </label>
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm font-semibold text-brand-900 dark:border-brand-800 dark:bg-brand-500/10 dark:text-brand-100">
            {valid ? t("newDates", { from: formatShortDate(startDate), to: formatShortDate(endDate) }) : t("invalidMoveDate")}
          </div>
          <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">{t("moveWarning")}</p>
          {error && (
            <p role="alert" className="text-sm font-semibold text-red-600 dark:text-red-400">
              {errors(("errors." + error) as "errors.invalid")}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={disabled} onClick={onClose}>{t("cancelMove")}</Button>
          <Button type="button" disabled={disabled || !valid || startDate === rental.startDate} onClick={confirm}>
            {t(saving ? "moving" : "confirmMove")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
