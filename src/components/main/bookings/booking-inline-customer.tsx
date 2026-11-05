"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createCustomerFromBooking } from "@/lib/customers/actions";
import { customerSchema, type CustomerInput } from "@/lib/customers/schema";
import type { BookingCustomer } from "@/lib/bookings/types";

type Props = { onCreated: (customer: BookingCustomer) => void; onCancel: () => void };

export default function BookingInlineCustomer({ onCreated, onCancel }: Props) {
  const t = useTranslations("customers");
  const b = useTranslations("bookings");
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: "", phone: "", email: "", notes: "" },
  });

  const submit = handleSubmit(async (values) => {
    setError(null);
    try {
      const result = await createCustomerFromBooking(values);
      if (!result.ok) { setError(result.error); return; }
      onCreated(result.customer);
    } catch {
      setError("database");
    }
  });

  return (
    <section aria-label={b("newCustomerTitle")}
      className="space-y-3 rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-800 dark:bg-brand-500/5"
      onKeyDown={(event) => { if (event.key === "Enter" && event.target instanceof HTMLInputElement) event.preventDefault(); }}>
      <div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{b("newCustomerTitle")}</h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{b("newCustomerHint")}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["name", "phone", "email"] as const).map((field) => (
          <label key={field} className={field === "name" ? "sm:col-span-2" : ""}>
            <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">{t(field)}</span>
            <Input {...register(field)} type={field === "phone" ? "tel" : field === "email" ? "email" : "text"}
              maxLength={field === "name" ? 120 : field === "phone" ? 40 : 254}
              autoFocus={field === "name"} aria-invalid={!!errors[field]}
              placeholder={field === "phone" ? "+381641234567" : undefined} />
            {errors[field] && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{t(`validation.${field}`)}</p>}
          </label>
        ))}
      </div>
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">{t("notes")}</span>
        <Textarea {...register("notes")} maxLength={2000} aria-invalid={!!errors.notes} rows={2} />
        {errors.notes && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{t("validation.notes")}</p>}
      </label>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{t(`errors.${error}`)}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="sm" disabled={isSubmitting} onClick={onCancel}>{b("cancelNewCustomer")}</Button>
        <Button type="button" size="sm" disabled={isSubmitting} onClick={() => void submit()}>{b(isSubmitting ? "creatingCustomer" : "createAndSelectCustomer")}</Button>
      </div>
    </section>
  );
}
