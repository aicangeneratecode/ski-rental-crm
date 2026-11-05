"use client";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { equipmentSchema, type EquipmentInput } from "@/lib/equipment/schema";
import { tariffs, statuses, getTariff } from "@/lib/equipment/tariffs";
import { saveEquipment } from "@/lib/equipment/actions";
import type { EquipmentRow, SaveResult } from "@/lib/equipment/types";
import SelectField from "./select-field";
interface EquipmentFormProps {
  item?: EquipmentRow;
  tariffRates: Record<string, number | null>;
  onClose: () => void;
  onSaved: () => void;
}
export default function EquipmentForm({
  item,
  tariffRates,
  onClose,
  onSaved,
}: EquipmentFormProps) {
  const t = useTranslations("inventory");
  const router = useRouter();
  const [error, setError] = useState<
    Extract<SaveResult, { ok: false }>["error"] | null
  >(null);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EquipmentInput>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: item ?? {
      code: "",
      name: "",
      tariff: "ski-premium",
      size: "",
      dailyRate: tariffRates["ski-premium"] ?? 2000,
      status: "READY",
      notes: "",
    },
  });
  const submit = handleSubmit(async (values) => {
    setError(null);
    try {
      const result = await saveEquipment({
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
        className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle>{t(item ? "editTitle" : "addTitle")}</DialogTitle>
          <DialogDescription>{t("formHint")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-5">
          <fieldset
            disabled={isSubmitting}
            className="grid gap-4 sm:grid-cols-2"
          >
            {(["code", "name", "size"] as const).map((name) => (
              <Field key={name} controlId={`equipment-${name}`}>
                <FieldLabel>{t(`fields.${name}`)}</FieldLabel>
                <Input
                  {...register(name)}
                  maxLength={name === "name" ? 120 : 40}
                  autoFocus={name === "code"}
                  aria-invalid={!!errors[name]}
                />
                {errors[name] && (
                  <FieldError>{t(`validation.${name}`)}</FieldError>
                )}
              </Field>
            ))}
            <Field controlId="equipment-tariff">
              <FieldLabel>{t("fields.tariff")}</FieldLabel>
              <Controller
                control={control}
                name="tariff"
                render={({ field }) => (
                  <SelectField
                    id="equipment-tariff"
                    label={t("fields.tariff")}
                    value={field.value}
                    options={tariffs.map((v) => ({
                      value: v.code,
                      label: t(`tariffs.${v.code}`),
                    }))}
                    onChange={(value) => {
                      field.onChange(value);
                      const rate = Object.prototype.hasOwnProperty.call(tariffRates, value)
                        ? tariffRates[value]
                        : getTariff(value)?.rate;
                      setValue("dailyRate", rate ?? NaN, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    }}
                  />
                )}
              />
              {errors.tariff && (
                <FieldError>{t("validation.tariff")}</FieldError>
              )}
            </Field>
            <Field controlId="equipment-rate">
              <FieldLabel>{t("fields.dailyRate")}</FieldLabel>
              <Input
                type="number"
                min={0}
                max={1000000}
                step={1}
                {...register("dailyRate", { valueAsNumber: true })}
                aria-invalid={!!errors.dailyRate}
              />
              {errors.dailyRate && (
                <FieldError>{t("validation.dailyRate")}</FieldError>
              )}
            </Field>
            <Field controlId="equipment-status">
              <FieldLabel>{t("fields.status")}</FieldLabel>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <SelectField
                    id="equipment-status"
                    label={t("fields.status")}
                    value={field.value}
                    onChange={field.onChange}
                    options={statuses.map((v) => ({
                      value: v,
                      label: t(`statuses.${v}`),
                    }))}
                  />
                )}
              />
            </Field>
            <Field controlId="equipment-notes" className="sm:col-span-2">
              <FieldLabel>{t("fields.notes")}</FieldLabel>
              <Textarea {...register("notes")} maxLength={2000} />
              {errors.notes && <FieldError>{t("validation.notes")}</FieldError>}
            </Field>
          </fieldset>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t("priceHint")}
          </p>
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-red-700 dark:bg-red-950 dark:text-red-200"
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
