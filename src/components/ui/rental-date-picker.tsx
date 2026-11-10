"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getBelgradeDate } from "@/lib/bookings/today";

type Props = {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  invalid?: boolean;
  clearable?: boolean;
};

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

const months = Array.from({ length: 12 }, (_, month) =>
  new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2024, month, 1))),
);

const weekdays = Array.from({ length: 7 }, (_, day) =>
  new Intl.DateTimeFormat("ru-RU", {
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2024, 0, 1 + day))),
);

const selectClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-white px-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white";

export default function RentalDatePicker({
  id,
  label,
  value,
  onChange,
  min,
  max,
  disabled = false,
  invalid = false,
  clearable = true,
}: Props) {
  const t = useTranslations("datePicker");
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(0);
  const [day, setDay] = useState("");

  const lower = min && validDate(min) ? min : "2000-01-01";
  const upper = max && validDate(max) ? max : "2100-12-31";
  const firstYear = Number(lower.slice(0, 4));
  const lastYear = Number(upper.slice(0, 4));
  const firstMonth = lower.slice(0, 7);
  const lastMonth = upper.slice(0, 7);
  const currentMonth = isoDate(year, month, 1).slice(0, 7);

  const allowed = (candidate: string) =>
    validDate(candidate) && candidate >= lower && candidate <= upper;

  function showCalendar() {
    let initial = validDate(value) ? value : getBelgradeDate();
    if (initial < lower) initial = lower;
    if (initial > upper) initial = upper;

    const date = new Date(`${initial}T00:00:00.000Z`);
    setYear(date.getUTCFullYear());
    setMonth(date.getUTCMonth());
    setDay(String(date.getUTCDate()));
    setOpen(true);
  }

  function choose(candidate: string) {
    if (disabled || !allowed(candidate)) return;
    onChange(candidate);
    setOpen(false);
  }

  function moveMonth(delta: number) {
    const next = new Date(Date.UTC(year, month + delta, 1));
    const nextMonth = isoDate(
      next.getUTCFullYear(),
      next.getUTCMonth(),
      1,
    ).slice(0, 7);
    if (nextMonth < firstMonth || nextMonth > lastMonth) return;
    setYear(next.getUTCFullYear());
    setMonth(next.getUTCMonth());
  }

  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const leading = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const candidate = isoDate(year, month, Number(day));
  const canApply = /^\d{1,2}$/.test(day) && allowed(candidate);

  return (
    <>
      <Button
        id={id}
        type="button"
        variant="outline"
        className="w-full justify-between"
        disabled={disabled || lower > upper}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={invalid}
        onClick={showCalendar}
      >
        <span>
          {validDate(value)
            ? value.split("-").reverse().join(".")
            : t("placeholder")}
        </span>
        <span aria-hidden="true">▾</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {label} · {t("title")}
            </DialogTitle>
            <DialogDescription>{t("hint")}</DialogDescription>
          </DialogHeader>

          <fieldset disabled={disabled} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-xs">
                <span>{t("month")}</span>
                <select
                  className={selectClass}
                  value={month}
                  onChange={(event) => setMonth(Number(event.target.value))}
                >
                  {months.map((name, index) => (
                    <option key={name} value={index}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-xs">
                <span>{t("year")}</span>
                <select
                  className={selectClass}
                  value={year}
                  onChange={(event) => setYear(Number(event.target.value))}
                >
                  {Array.from(
                    { length: Math.max(0, lastYear - firstYear + 1) },
                    (_, index) => firstYear + index,
                  ).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                aria-label={t("previous")}
                disabled={currentMonth <= firstMonth}
                onClick={() => moveMonth(-1)}
              >
                ←
              </Button>
              <Button
                type="button"
                variant="outline"
                aria-label={t("next")}
                disabled={currentMonth >= lastMonth}
                onClick={() => moveMonth(1)}
              >
                →
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {weekdays.map((name) => (
                <span
                  key={name}
                  className="py-2 text-center text-xs text-gray-500"
                >
                  {name}
                </span>
              ))}
              {Array.from({ length: leading }, (_, index) => (
                <span key={`empty-${index}`} aria-hidden="true" />
              ))}
              {Array.from({ length: daysInMonth }, (_, index) => {
                const number = index + 1;
                const date = isoDate(year, month, number);
                return (
                  <button
                    key={date}
                    type="button"
                    disabled={!allowed(date)}
                    aria-label={date.split("-").reverse().join(".")}
                    aria-pressed={date === value}
                    onClick={() => choose(date)}
                    className={`h-9 rounded-lg text-sm focus-visible:outline-2 disabled:opacity-25 ${
                      date === value
                        ? "bg-brand-700 text-white dark:bg-brand-400 dark:text-gray-950"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    {number}
                  </button>
                );
              })}
            </div>

            <label className="block space-y-1 text-xs">
              <span>{t("day")}</span>
              <Input
                value={day}
                inputMode="numeric"
                maxLength={2}
                onChange={(event) => setDay(event.target.value)}
                aria-invalid={!canApply}
              />
            </label>

            {!canApply && (
              <p role="status" className="text-xs text-red-600">
                {t("invalid")}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={!canApply}
                onClick={() => choose(candidate)}
              >
                {t("apply")}
              </Button>
              {clearable && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  {t("clear")}
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                {t("cancel")}
              </Button>
            </div>
          </fieldset>
        </DialogContent>
      </Dialog>
    </>
  );
}
