"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { readBookingHistory } from "@/lib/bookings/history";

type Props = { bookingId: string; version: number };
type Result = Awaited<ReturnType<typeof readBookingHistory>>;

export default function BookingHistory({ bookingId, version }: Props) {
  const t = useTranslations("bookingHistory");
  const [result, setResult] = useState<Result | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    readBookingHistory(bookingId)
      .then((value) => {
        if (active) setResult(value);
      })
      .catch(() => {
        if (active) setResult({ ok: false, error: "database" });
      });
    return () => {
      active = false;
    };
  }, [bookingId, version, revision]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">{t("title")}</h3>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setResult(null);
            setRevision((value) => value + 1);
          }}
        >
          {t("refresh")}
        </Button>
      </div>
      {!result ? (
        <p role="status">{t("loading")}</p>
      ) : !result.ok ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {t(`errors.${result.error}`)}
        </p>
      ) : (
        <>
          {result.legacy && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("legacy")}
            </p>
          )}
          <ol className="space-y-3">
            {result.events.map((event) => (
              <li
                key={event.id}
                className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
              >
                <p className="font-medium">{t(`events.${event.kind}`)}</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {event.actor}
                </p>
                <time
                  dateTime={event.createdAt}
                  className="mt-1 block text-xs text-gray-500 dark:text-gray-400"
                >
                  {new Intl.DateTimeFormat("ru-RU", {
                    timeZone: "Europe/Belgrade",
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(event.createdAt))}
                </time>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
