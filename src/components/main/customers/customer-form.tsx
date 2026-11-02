"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Field,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveCustomer } from "@/lib/customers/actions";
import {
  customerSchema,
  type CustomerInput,
  type CustomerRow,
  type CustomerSaveResult,
} from "@/lib/customers/schema";

interface CustomerFormProps {
  item?: CustomerRow;
  onClose: () => void;
  onSaved: () => void;
}

type SaveError = Extract<
  CustomerSaveResult,
  { ok: false }
>["error"];

export default function CustomerForm({
  item,
  onClose,
  onSaved,
}: CustomerFormProps) {
  const t = useTranslations("customers");
  const router = useRouter();
  const [error, setError] = useState<SaveError | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: item?.name ?? "",
      phone: item?.phone ?? "",
      email: item?.email ?? "",
      notes: item?.notes ?? "",
    },
  });

  const submit = handleSubmit(async (values) => {
    setError(null);

    try {
      const result = await saveCustomer({
        id: item?.id,
        version: item?.version,
        values,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.refresh();
      onSaved();
      onClose();
    } catch {
      setError("database");
    }
  });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-h-[90dvh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>
            {t(item ? "editTitle" : "addTitle")}
          </DialogTitle>
          <DialogDescription>{t("formHint")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} noValidate className="space-y-5">
          <fieldset disabled={isSubmitting} className="space-y-4">
            {(["name", "phone", "email"] as const).map((field) => (
              <Field key={field} controlId={`customer-${field}`}>
                <FieldLabel>{t(field)}</FieldLabel>

                <Input
                  {...register(field)}
                  type={
                    field === "phone"
                      ? "tel"
                      : field === "email"
                        ? "email"
                        : "text"
                  }
                  maxLength={
                    field === "name" ? 120 : field === "phone" ? 40 : 254
                  }
                  autoFocus={field === "name"}
                  aria-invalid={!!errors[field]}
                />

                {errors[field] && (
                  <FieldError>{t(`validation.${field}`)}</FieldError>
                )}
              </Field>
            ))}

            <Field controlId="customer-notes">
              <FieldLabel>{t("notes")}</FieldLabel>
              <Textarea
                {...register("notes")}
                maxLength={2000}
                aria-invalid={!!errors.notes}
              />
              {errors.notes && (
                <FieldError>{t("validation.notes")}</FieldError>
              )}
            </Field>
          </fieldset>

          {error && (
            <p
              role="alert"
              className="text-sm text-red-600 dark:text-red-400"
            >
              {t(`errors.${error}`)}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={onClose}
            >
              {t("cancel")}
            </Button>

            <Button type="submit" disabled={isSubmitting}>
              {t(isSubmitting ? "saving" : "save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}