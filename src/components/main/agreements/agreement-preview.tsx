"use client";
import { useState } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import RentalDatePicker from "@/components/ui/rental-date-picker";
import { checkAgreementVersion } from "@/lib/agreements/check";
import {
  agreementNumber,
  type AgreementBooking,
  type AgreementFields,
} from "@/lib/agreements/types";
import AgreementDocument from "./agreement-document";

const schema = z.object({
  number: z.string().trim().min(1).max(80),
  date: z.iso.date(),
  fullName: z.string().trim().min(1).max(200),
  passportNumber: z.string().trim().max(80),
  passportIssuer: z.string().trim().max(250),
  passportDate: z.union([z.literal(""), z.iso.date()]),
});
interface Props {
  booking: AgreementBooking;
  today: string;
}
export default function AgreementPreview({ booking, today }: Props) {
  const t = useTranslations("agreement");
  const [error, setError] = useState("");
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AgreementFields>({
    resolver: zodResolver(schema),
    defaultValues: {
      number: agreementNumber(booking.id),
      date: today,
      fullName: booking.customerName,
      passportNumber: "",
      passportIssuer: "",
      passportDate: "",
    },
  });
  const fields = useWatch({ control }) as AgreementFields;
  const cancelled = booking.status === "CANCELLED";
  async function print(values: AgreementFields) {
    setError("");
    if (values.passportDate && values.passportDate > today) {
      setError(t("invalidDate"));
      return;
    }
    try {
      if (
        !(await checkAgreementVersion({
          id: booking.id,
          version: booking.version,
        }))
      ) {
        setError(t("stale"));
        return;
      }
      await document.fonts.ready;
      window.print();
    } catch {
      setError(t("failed"));
    }
  }
  return (
    <main className="agreement-workspace">
      <form
        className="agreement-toolbar rounded-xl border border-gray-200 bg-white p-5 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        onSubmit={handleSubmit(print)}
        autoComplete="off"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <Link
            className={buttonVariants({ variant: "outline" })}
            href="/bookings"
          >
            {t("back")}
          </Link>
        </div>
        <p className="mt-3 text-sm">{t("hint")}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(
            ["number", "fullName", "passportNumber", "passportIssuer"] as const
          ).map((name) => (
            <Field key={name}>
              <FieldLabel htmlFor={name}>{t(name)}</FieldLabel>
              <Input
                id={name}
                {...register(name)}
                maxLength={
                  name === "passportIssuer"
                    ? 250
                    : name === "fullName"
                      ? 200
                      : 80
                }
                aria-invalid={!!errors[name]}
              />
              {errors[name] && <p role="alert">{t("invalid")}</p>}
            </Field>
          ))}
          <Field>
            <FieldLabel htmlFor="agreement-date">{t("date")}</FieldLabel>
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <RentalDatePicker
                  id="agreement-date"
                  label={t("date")}
                  value={field.value}
                  onChange={field.onChange}
                  clearable={false}
                  invalid={!!errors.date}
                />
              )}
            />
            {errors.date && <p role="alert">{t("invalidDate")}</p>}
          </Field>
          <Field>
            <FieldLabel htmlFor="passport-date">{t("passportDate")}</FieldLabel>
            <Controller
              name="passportDate"
              control={control}
              render={({ field }) => (
                <RentalDatePicker
                  id="passport-date"
                  label={t("passportDate")}
                  value={field.value}
                  onChange={field.onChange}
                  min="1900-01-01"
                  max={today}
                  invalid={!!errors.passportDate}
                />
              )}
            />
            {errors.passportDate && <p role="alert">{t("invalidDate")}</p>}
          </Field>
        </div>
        <p className="mt-4 text-sm">{t("privacy")}</p>
        <p className="mt-2 text-sm">{t("printHint")}</p>
        {cancelled && (
          <p className="mt-3" role="alert">
            {t("cancelled")}
          </p>
        )}
        {error && (
          <p className="mt-3" role="alert">
            {error}
          </p>
        )}
        <Button
          className="mt-4"
          type="submit"
          disabled={cancelled || isSubmitting}
        >
          {isSubmitting ? t("checking") : t("print")}
        </Button>
      </form>
      {!cancelled && <AgreementDocument booking={booking} fields={fields} />}
    </main>
  );
}
