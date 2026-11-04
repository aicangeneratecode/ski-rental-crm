"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { formatBookingMoney } from "@/lib/bookings/types";
import { readBookingPayments } from "@/lib/payments/read";
import type { PaymentInput } from "@/lib/payments/schema";

import PaymentForm from "./payment-form";

type Props = {
  bookingId: string;
};

type Result = Awaited<ReturnType<typeof readBookingPayments>>;
type Snapshot = Extract<Result, { ok: true }>["data"];

export default function BookingPayments({ bookingId }: Props) {
  const t = useTranslations("payments");
  const router = useRouter();

  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [saved, setSaved] = useState(false);
  const [kind, setKind] = useState<PaymentInput["kind"] | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result = await readBookingPayments(bookingId);

        if (!active) return;

        if (result.ok) {
          setData(result.data);
          setError(null);
        } else {
          setError(result.error);
        }
      } catch {
        if (active) setError("network");
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [bookingId, revision]);

  function refresh() {
    setKind(null);
    setData(null);
    setError(null);
    setRevision((value) => value + 1);
  }

  if (error) {
    return (
      <section className="space-y-3">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {t(`errors.${error}`)}
        </p>
        <Button type="button" variant="outline" onClick={refresh}>
          {t("refresh")}
        </Button>
      </section>
    );
  }

  if (!data) {
    return <p role="status">{t("loading")}</p>;
  }

  const summary = [
    ["total", data.total],
    ["received", data.received],
    ["refunded", data.refunded],
    ["netPaid", data.netPaid],
    ["balance", data.balance],
  ] as const;

  return (
    <section className="space-y-5">
      {saved && (
        <p role="status" className="text-sm text-green-700 dark:text-green-400">
          {t("saved")}
        </p>
      )}

      <dl className="space-y-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
        {summary.map(([label, amount]) => (
          <div key={label} className="flex justify-between gap-4 text-sm">
            <dt>{t(label)}</dt>
            <dd className="font-semibold">
              {formatBookingMoney(amount)}
            </dd>
          </div>
        ))}
      </dl>

      {data.status === "CANCELLED" && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t("cancelledHint")}
        </p>
      )}

      {kind ? (
        <PaymentForm
          key={`${data.id}-${data.version}-${kind}`}
          bookingId={data.id}
          version={data.version}
          kind={kind}
          maximum={kind === "PAYMENT" ? data.balance : data.netPaid}
          onCancel={refresh}
          onSaved={() => {
            setSaved(true);
            refresh();
            router.refresh();
          }}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={data.balance <= 0 || data.status === "CANCELLED"}
            onClick={() => {
              setSaved(false);
              setKind("PAYMENT");
            }}
          >
            {t("accept")}
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={data.netPaid <= 0}
            onClick={() => {
              setSaved(false);
              setKind("REFUND");
            }}
          >
            {t("refund")}
          </Button>

          <Button type="button" variant="ghost" onClick={refresh}>
            {t("refresh")}
          </Button>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="font-semibold">{t("history")}</h3>

        {data.payments.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("empty")}
          </p>
        )}

        {data.payments.map((payment) => (
          <article
            key={payment.id}
            className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
          >
            <div className="flex flex-wrap justify-between gap-2">
              <p className="font-medium">
                {t(`kinds.${payment.kind}`)}
              </p>
              <p className="font-semibold">
                {payment.kind === "REFUND" ? "−" : "+"}
                {formatBookingMoney(payment.amount)}
              </p>
            </div>

            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {t(`methods.${payment.method}`)}
              {" · "}
              {new Intl.DateTimeFormat("ru-RU", {
                timeZone: "Europe/Belgrade",
                dateStyle: "short",
                timeStyle: "short",
              }).format(new Date(payment.createdAt))}
            </p>

            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {payment.employee}
            </p>

            {payment.note && (
              <p className="mt-2 text-sm break-words whitespace-pre-wrap">
                {payment.note}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}