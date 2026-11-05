"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import RentalDatePicker from "@/components/ui/rental-date-picker";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { createBooking } from "@/lib/bookings/actions";
import { categories, getTariff } from "@/lib/equipment/tariffs";
import BookingInlineCustomer from "./booking-inline-customer";
import { calculateRental } from "@/lib/bookings/pricing";
import {
  createBookingSchema,
  type BookingErrorCode,
  type CreateBookingInput,
} from "@/lib/bookings/schema";
import {
  formatBookingMoney,
  type BookingCustomer,
  type BookingEquipment,
} from "@/lib/bookings/types";

type Props = {
  customers: BookingCustomer[];
  equipment: BookingEquipment[];
  onClose: () => void;
  onSaved: () => void;
};

export default function BookingForm({
  customers,
  equipment,
  onClose,
  onSaved,
}: Props) {
  const t = useTranslations("bookings");
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [discountMode, setDiscountMode] = useState<"percent" | "fixed">("percent");
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [addedCustomers, setAddedCustomers] = useState<BookingCustomer[]>([]);
  const [error, setError] = useState<BookingErrorCode | null>(null);

  const {
    register,
    control,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateBookingInput>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: {
      customerId: "",
      startDate: "",
      endDate: "",
      travelDay: false,
      discountPercent: 0,
      discountFixed: 0,
      notes: "",
      items: [],
    },
  });

  const startDate = useWatch({ control, name: "startDate" });
  const endDate = useWatch({ control, name: "endDate" });
  const travelDay = useWatch({ control, name: "travelDay" });
  const discountPercent = useWatch({
    control,
    name: "discountPercent",
  });
  const discountFixed = useWatch({ control, name: "discountFixed" });
  const items = useWatch({ control, name: "items" });
  const customerOptions = [...addedCustomers, ...customers.filter((customer) => !addedCustomers.some((added) => added.id === customer.id))];

  let calendarDays = 0;

  try {
    calendarDays = calculateRental({
      startDate,
      endDate,
      travelDay: false,
      discountPercent: 0,
      items: [
        {
          equipmentId: "date-check",
          dailyRate: 0,
          complimentary: false,
        },
      ],
    }).calendarDays;
  } catch {
    // Пока даты не заполнены, выбор оборудования недоступен.
  }

  const datesValid = calendarDays >= 1 && calendarDays <= 366;

  const isOccupied = (item: BookingEquipment) =>
    datesValid &&
    item.reservations.some(
      (reservation) =>
        reservation.startDate <= endDate &&
        reservation.endDate >= startDate,
    );

  const selectedUnavailable = items.some((selected) => {
    const record = equipment.find(
      (item) => item.id === selected.equipmentId,
    );
    return !record || isOccupied(record);
  });

  let pricing: ReturnType<typeof calculateRental> | null = null;

  try {
    if (datesValid) {
      pricing = calculateRental({
        startDate,
        endDate,
        travelDay,
        discountPercent,
        discountFixed,
        items: items.map((item) => {
          const record = equipment.find(
            (entry) => entry.id === item.equipmentId,
          );

          if (!record) throw new Error("MISSING_EQUIPMENT");

          return { ...item, dailyRate: record.dailyRate };
        }),
      });
    }
  } catch {
    // Подсказка под расчётом объяснит, что нужно проверить.
  }

  const query = search.trim().toLowerCase();
  const visibleEquipment = equipment.filter((item) =>
    (category === "all" || getTariff(item.tariff)?.category === category) &&
    `${item.code} ${item.name} ${item.size} ${item.tariff}`
      .toLowerCase()
      .includes(query),
  );
  const equipmentGroups = categories.map((value) => ({
    category: value,
    items: visibleEquipment.filter((item) => getTariff(item.tariff)?.category === value),
  })).filter((group) => group.items.length > 0);

  function updateItems(next: CreateBookingInput["items"]) {
    setValue("items", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setError(null);
  }

  const submit = handleSubmit(async (values) => {
    setError(null);

    try {
      const result = await createBooking(values);

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
        className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl"
      >
        <DialogHeader>
          <DialogTitle>{t("add")}</DialogTitle>
          <DialogDescription>{t("formHint")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} noValidate className="space-y-5">
          <fieldset disabled={isSubmitting} className="space-y-5">
            <Field controlId="booking-customer">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <FieldLabel>{t("customer")}</FieldLabel>
                <Button type="button" size="sm" variant="outline" onClick={() => setAddingCustomer((previous) => !previous)}>
                  {addingCustomer ? t("hideNewCustomer") : t("addCustomerInline")}
                </Button>
              </div>
              <select
                {...register("customerId")}
                id="booking-customer"
                aria-invalid={!!errors.customerId}
                className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="">{t("chooseCustomer")}</option>
                {customerOptions.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}{customer.phone ? ` · ${customer.phone}` : ""}
                  </option>
                ))}
              </select>
              {errors.customerId && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{t("chooseCustomer")}</p>}
            </Field>

            {addingCustomer && (
              <BookingInlineCustomer
                onCancel={() => setAddingCustomer(false)}
                onCreated={(customer) => {
                  setAddedCustomers((current) => [customer, ...current]);
                  setValue("customerId", customer.id, { shouldDirty: true, shouldValidate: true });
                  setAddingCustomer(false);
                  setError(null);
                }}
              />
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field controlId="booking-start">
                <FieldLabel>{t("startDate")}</FieldLabel>
                <RentalDatePicker
                  id="booking-start"
                  label={t("startDate")}
                  value={startDate}
                  disabled={isSubmitting}
                  invalid={!!errors.startDate}
                  onChange={(value) =>
                    setValue("startDate", value, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    })
                  }
                />
              </Field>

              <Field controlId="booking-end">
                <FieldLabel>{t("endDate")}</FieldLabel>
                <RentalDatePicker
                  id="booking-end"
                  label={t("endDate")}
                  value={endDate}
                  min={startDate || undefined}
                  disabled={isSubmitting}
                  invalid={!!errors.endDate}
                  onChange={(value) =>
                    setValue("endDate", value, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    })
                  }
                />
              </Field>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("dateHint")}
            </p>

            <section className="space-y-3">
              <h3 className="font-medium">{t("equipment")}</h3>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("searchEquipment")}
                aria-label={t("searchEquipment")}
              />
              <div role="group" aria-label={t("equipmentCategory")} className="flex gap-2 overflow-x-auto pb-1">
                {["all", ...categories].map((value) => (
                  <button key={value} type="button" aria-pressed={category === value}
                    onClick={() => setCategory(value)}
                    className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand-500 ${category === value
                      ? "bg-brand-700 text-white dark:bg-brand-400 dark:text-gray-950"
                      : "border border-gray-200 bg-white text-gray-600 hover:border-brand-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}>
                    {value === "all" ? t("allEquipmentCategories") : t(`categories.${value}`)}
                  </button>
                ))}
              </div>

              {!datesValid && (
                <p className="text-sm text-gray-500">
                  {t("chooseDates")}
                </p>
              )}

              <div className="max-h-64 space-y-2 overflow-y-auto">
                {equipmentGroups.map((group) => (
                  <div key={group.category} className="space-y-2">
                    <div className="sticky top-0 z-10 flex items-center justify-between rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                      <span>{t(`categories.${group.category}`)}</span>
                      <span>{t("categoryCount", { count: group.items.length })}</span>
                    </div>
                    {group.items.map((item) => {
                  const selected = items.find(
                    (entry) => entry.equipmentId === item.id,
                  );
                  const occupied = isOccupied(item);

                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                    >
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-1 size-4"
                          checked={!!selected}
                          disabled={
                            !selected &&
                            (!datesValid || occupied || items.length >= 100)
                          }
                          onChange={(event) =>
                            updateItems(
                              event.target.checked
                                ? [
                                    ...items,
                                    {
                                      equipmentId: item.id,
                                      complimentary: false,
                                    },
                                  ]
                                : items.filter(
                                    (entry) =>
                                      entry.equipmentId !== item.id,
                                  ),
                            )
                          }
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">
                            {item.code} · {item.name} · {item.size}
                          </span>
                          <span className="block text-sm text-gray-500">
                            {t("perDay", {
                              amount: formatBookingMoney(item.dailyRate),
                            })}
                          </span>
                          {occupied && (
                            <span className="block text-sm text-red-600">
                              {t("occupied")}
                            </span>
                          )}
                        </span>
                      </label>

                      {selected && (
                        <label className="mt-2 flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selected.complimentary}
                            onChange={(event) =>
                              updateItems(
                                items.map((entry) =>
                                  entry.equipmentId === item.id
                                    ? {
                                        ...entry,
                                        complimentary: event.target.checked,
                                      }
                                    : entry,
                                ),
                              )
                            }
                          />
                          {t("free")}
                        </label>
                      )}
                    </div>
                  );
                    })}
                  </div>
                ))}

                {visibleEquipment.length === 0 && (
                  <p className="text-sm text-gray-500">
                    {t("noEquipment")}
                  </p>
                )}
              </div>
            </section>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" {...register("travelDay")} />
                {t("travelDay")}
              </label>
              <p className="text-sm text-gray-500">{t("travelHint")}</p>
            </div>

            <section className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t("discount")}</h3>
              <div role="group" aria-label={t("discountType")} className="inline-flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
                {(["percent", "fixed"] as const).map((mode) => (
                  <button key={mode} type="button" aria-pressed={discountMode === mode}
                    onClick={() => {
                      setDiscountMode(mode);
                      setValue("discountPercent", 0, { shouldDirty: true, shouldValidate: true });
                      setValue("discountFixed", 0, { shouldDirty: true, shouldValidate: true });
                    }}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-brand-500 ${discountMode === mode ? "bg-white text-brand-700 shadow-theme-xs dark:bg-gray-700 dark:text-brand-400" : "text-gray-500 dark:text-gray-300"}`}>
                    {t(`discountModes.${mode}`)}
                  </button>
                ))}
              </div>
              <Field controlId="booking-discount-value">
                <FieldLabel>{discountMode === "percent" ? t("discountPercentLabel") : t("discountFixedLabel")}</FieldLabel>
                {discountMode === "percent" ? (
                  <Input id="booking-discount-value" type="number" min="0" max="100" step="1"
                    {...register("discountPercent", { valueAsNumber: true })} aria-invalid={!!errors.discountPercent} />
                ) : (
                  <Input id="booking-discount-value" type="number" min="0" max="2147483647" step="1"
                    {...register("discountFixed", { valueAsNumber: true })} aria-invalid={!!errors.discountFixed} />
                )}
                {(errors.discountPercent || errors.discountFixed) && (
                  <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">{t("discountInvalid")}</p>
                )}
              </Field>
              {pricing && <p className="text-sm font-semibold text-brand-700 dark:text-brand-400">
                {t("discountAmount")}: −{formatBookingMoney(pricing.discountAmount)}
              </p>}
              {!pricing && discountMode === "fixed" && discountFixed > 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-400">{t("discountMaxHint")}</p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("discountHint")}</p>
            </section>

            <Field controlId="booking-notes">
              <FieldLabel>{t("notes")}</FieldLabel>
              <Textarea {...register("notes")} maxLength={2000} />
            </Field>
          </fieldset>

          <section
            aria-live="polite"
            className="space-y-2 rounded-xl bg-gray-50 p-4 dark:bg-gray-800"
          >
            <h3 className="font-semibold">{t("summary")}</h3>
            <p className="text-sm">
              {t("selected", { count: items.length })}
            </p>

            {pricing ? (
              <>
                <p className="text-sm">
                  {t("days", {
                    calendar: pricing.calendarDays,
                    paid: pricing.paidDays,
                  })}
                </p>
                <div className="flex justify-between text-sm">
                  <span>{t("subtotal")}</span>
                  <span>{formatBookingMoney(pricing.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t("discountAmount")}</span>
                  <span>{formatBookingMoney(pricing.discountAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold">
                  <span>{t("total")}</span>
                  <span>{formatBookingMoney(pricing.total)}</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">
                {t("invalidPricing")}
              </p>
            )}

            <p className="text-xs text-gray-500">
              {t("previewHint")}
            </p>
          </section>

          {selectedUnavailable && (
            <p role="alert" className="text-sm text-red-600">
              {t("errors.datesUnavailable")}
            </p>
          )}

          {Object.keys(errors).length > 0 && (
            <p role="alert" className="text-sm text-red-600">
              {t("invalid")}
            </p>
          )}

          {error && (
            <p role="alert" className="text-sm text-red-600">
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
            <Button
              type="submit"
              disabled={isSubmitting || !pricing || selectedUnavailable}
            >
              {t(isSubmitting ? "saving" : "save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}