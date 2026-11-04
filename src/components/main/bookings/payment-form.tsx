"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { savePayment } from "@/lib/payments/actions";
import {
  paymentSchema,
  type PaymentInput,
} from "@/lib/payments/schema";

type Props = {
  bookingId: string;
  version: number;
  kind: PaymentInput["kind"];
  maximum: number;
  onSaved: () => void;
  onCancel: () => void;
};

type Fields = {
  amount: number;
  method: PaymentInput["method"];
  note: string;
};

export default function PaymentForm({
  bookingId,
  version,
  kind,
  maximum,
  onSaved,
  onCancel,
}: Props) {
  const t = useTranslations("payments");
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PaymentInput | null>(null);

  const { register, handleSubmit } = useForm<Fields>({
    defaultValues: {
      amount: maximum,
      method: "CASH",
      note: "",
    },
  });

  async function send(input: PaymentInput) {
    if (lock.current) return;

    lock.current = true;
    setBusy(true);
    setError(null);
    setPending(input);

    try {
      const result = await savePayment(input);

      if (result.ok) {
        setPending(null);
        onSaved();
        return;
      }

      setError(result.error);

      // При неизвестном результате сохраняем исходный запрос.
      if (
        result.error !== "database" &&
        result.error !== "conflict"
      ) {
        setPending(null);
      }
    } catch {
      setError("network");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  const submit = handleSubmit(async (fields) => {
    const parsed = paymentSchema.safeParse({
      ...fields,
      bookingId,
      version,
      kind,
      requestId: crypto.randomUUID(),
    });

    if (!parsed.success || parsed.data.amount > maximum) {
      setError("invalid");
      return;
    }

    await send(parsed.data);
  });

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-xl border border-gray-200 p-4 dark:border-gray-700"
    >
      <h3 className="font-semibold">{t(`kinds.${kind}`)}</h3>

      <fieldset disabled={busy || pending !== null} className="space-y-4">
        <div>
          <label htmlFor="payment-amount" className="mb-2 block text-sm">
            {t("amount")}
          </label>
          <Input
            id="payment-amount"
            type="number"
            min={1}
            max={maximum}
            step={1}
            required
            {...register("amount", { valueAsNumber: true })}
          />
        </div>

        <div>
          <label htmlFor="payment-method" className="mb-2 block text-sm">
            {t("method")}
          </label>
          <select
            id="payment-method"
            className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm dark:border-gray-700 dark:bg-gray-900"
            {...register("method")}
          >
            {(["CASH", "CARD", "TRANSFER"] as const).map((method) => (
              <option key={method} value={method}>
                {t(`methods.${method}`)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="payment-note" className="mb-2 block text-sm">
            {t("note")}
          </label>
          <Input
            id="payment-note"
            maxLength={1000}
            {...register("note")}
          />
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {t(`errors.${error}`)}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {pending ? (
          <Button
            type="button"
            disabled={busy}
            onClick={() => void send(pending)}
          >
            {busy ? t("saving") : t("retry")}
          </Button>
        ) : (
          <Button type="submit" disabled={busy}>
            {t("save")}
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={onCancel}
        >
          {pending ? t("checkHistory") : t("cancel")}
        </Button>
      </div>
    </form>
  );
}