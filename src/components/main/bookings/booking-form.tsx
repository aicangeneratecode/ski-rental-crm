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
import { updateBooking } from "@/lib/bookings/update-actions";
import type { RentalRow } from "./booking-list-utils";
import { categories, getTariff } from "@/lib/equipment/tariffs";
import { kitPartCategory, kitProgress, rentalKits, type RentalKitId } from "@/lib/bookings/kits";
import BookingInlineCustomer from "./booking-inline-customer";
import BookingCustomerPicker from "./booking-customer-picker";
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
  booking?: RentalRow;
  editMode?: "edit" | "extend";
};

export default function BookingForm({
  customers,
  equipment,
  onClose,
  onSaved,
  booking,
  editMode = "edit",
}: Props) {
  const t = useTranslations("bookings");
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [customerQuery, setCustomerQuery] = useState(booking?.customerName ?? "");
  const [category, setCategory] = useState("all");
  const [kit, setKit] = useState<RentalKitId | null>(null);
  const [discountMode, setDiscountMode] = useState<"percent" | "fixed">(booking && booking.discountPercent === 0 && booking.discountAmount > 0 ? "fixed" : "percent");
  const issued = booking?.status === "ISSUED";
  const extending = Boolean(booking && editMode === "extend");
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
      customerId: booking?.customerId ?? "",
      startDate: booking?.startDate ?? "",
      endDate: booking?.endDate ?? "",
      travelDay: booking?.travelDay ?? false,
      discountPercent: booking?.discountPercent ?? 0,
      discountFixed: booking && booking.discountPercent === 0 ? booking.discountAmount : 0,
      notes: booking?.notes ?? "",
      items: booking?.items.filter((item) => Boolean(item.equipmentId)).map((item) => ({
        equipmentId: item.equipmentId!,
        complimentary: item.complimentary,
      })) ?? [],
    },
  });

  const selectedCustomerId = useWatch({ control, name: "customerId" });
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
        reservation.bookingId !== booking?.id &&
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

          const previous = booking?.items.find((entry) => entry.equipmentId === item.equipmentId);
          return { ...item, dailyRate: previous?.dailyRate ?? record.dailyRate };
        }),
      });
    }
  } catch {
    // Подсказка под расчётом объяснит, что нужно проверить.
  }

  const query = search.trim().toLowerCase();
  const visibleEquipment = equipment.filter((item) =>
    (item.status === undefined || item.status === "READY" ||
      booking?.items.some((selected) => selected.equipmentId === item.id)) &&
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
      const result = booking
        ? await updateBooking({ id: booking.id, version: booking.version, values })
        : await createBooking(values);

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
          <DialogTitle>{t(booking ? extending ? "extendBooking" : "editBooking" : "add")}</DialogTitle>
          <DialogDescription>{t(booking ? issued ? "issuedEditHint" : "reservedEditHint" : "formHint")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} noValidate className="space-y-5">
          <fieldset disabled={isSubmitting} className="space-y-5">
            <Field controlId="booking-customer">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <FieldLabel>{t("customer")}</FieldLabel>
                {!issued && <Button type="button" size="sm" variant="outline" onClick={() => setAddingCustomer((previous) => !previous)}>
                  {addingCustomer ? t("hideNewCustomer") : t("addCustomerInline")}
                </Button>}
              </div>
              <input type="hidden" {...register("customerId")} />
              {issued ? (
                <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold dark:border-gray-700 dark:bg-gray-800">{booking?.customerName}</p>
              ) : <BookingCustomerPicker
                customers={customerOptions}
                selectedId={selectedCustomerId}
                query={customerQuery}
                invalid={!!errors.customerId}
                onQueryChange={(value) => {
                  setCustomerQuery(value);
                  setValue("customerId", "", { shouldDirty: true, shouldValidate: true });
                }}
                onSelect={(customer) => {
                  setCustomerQuery(customer.name);
                  setValue("customerId", customer.id, { shouldDirty: true, shouldValidate: true });
                  setError(null);
                }}
              />}
              {errors.customerId && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{t("chooseCustomer")}</p>}
            </Field>

            {!issued && addingCustomer && (
              <BookingInlineCustomer
                onCancel={() => setAddingCustomer(false)}
                onCreated={(customer) => {
                  setAddedCustomers((current) => [customer, ...current]);
                  setValue("customerId", customer.id, { shouldDirty: true, shouldValidate: true });
                  setCustomerQuery(customer.name);
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
                  disabled={isSubmitting || issued}
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
                  min={extending || issued ? booking?.endDate : startDate || undefined}
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
              {issued && <p className="text-xs text-amber-700 dark:text-amber-400">{t("issuedItemsLocked")}</p>}
              {!issued && (
                <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50/40 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{t("kitTemplates")}</p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(rentalKits) as RentalKitId[]).map((id) => (
                      <button type="button" key={id} aria-pressed={kit === id}
                        onClick={() => {
                          setKit(id);
                          setCategory(kitPartCategory(rentalKits[id][0]));
                          setSearch("");
                        }}
                        className={"rounded-lg border px-3 py-2 text-xs font-semibold transition-colors " +
                          (kit === id ? "border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-500/10 dark:text-brand-300" :
                          "border-gray-200 bg-white text-gray-600 hover:border-brand-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300")}>
                        {t(("kits." + id) as "kits.ski")}
                      </button>
                    ))}
                    {kit && <button type="button" onClick={() => setKit(null)}
                      className="rounded-lg px-2 py-2 text-xs text-gray-500 underline underline-offset-2 dark:text-gray-400">{t("clearKit")}</button>}
                  </div>
                  {kit && (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {kitProgress(kit, items.map((selected) =>
                          equipment.find((item) => item.id === selected.equipmentId)?.tariff ?? "")).map(({part, selected}) => (
                          <button type="button" key={part}
                            onClick={() => { setCategory(kitPartCategory(part)); setSearch(""); }}
                            className={"rounded-lg border px-3 py-1.5 text-xs font-medium focus-visible:outline-2 focus-visible:outline-brand-500 " +
                              (selected ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300" :
                              "border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300")}>
                            {selected ? "✓ " : "○ "}{t(("kitParts." + part) as "kitParts.skis")}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t("kitHint")}</p>
                    </>
                  )}
                </div>
              )}
              {!issued && <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("searchEquipment")}
                aria-label={t("searchEquipment")}
              />}
              {!issued && <div role="group" aria-label={t("equipmentCategory")} className="flex gap-2 overflow-x-auto pb-1">
                {["all", ...categories].map((value) => (
                  <button key={value} type="button" aria-pressed={category === value}
                    onClick={() => setCategory(value)}
                    className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand-500 ${category === value
                      ? "bg-brand-700 text-white dark:bg-brand-400 dark:text-gray-950"
                      : "border border-gray-200 bg-white text-gray-600 hover:border-brand-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}>
                    {value === "all" ? t("allEquipmentCategories") : t(`categories.${value}`)}
                  </button>
                ))}
              </div>}

              {!issued && !datesValid && (
                <p className="text-sm text-gray-500">
                  {t("chooseDates")}
                </p>
              )}

              {!issued && <div className="max-h-64 space-y-2 overflow-y-auto">
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
                            {item.name} · {item.size}
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
              </div>}
            </section>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" {...register("travelDay")} disabled={issued} />
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
            {booking && <p className="text-xs text-gray-500 dark:text-gray-400">{t("previousTotal")}: {formatBookingMoney(booking.total)} · {t("alreadyPaid")}: {formatBookingMoney(booking.netPaid)}</p>}
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

            {booking && pricing && pricing.total < booking.netPaid && (
              <p role="alert" className="text-sm font-semibold text-red-600 dark:text-red-400">{t("errors.refundRequired")}</p>
            )}

            {items.length > 0 && (
              <section aria-label={t("selectedEquipmentTitle")} className="space-y-2 border-t border-gray-200 pt-3 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {t("selectedEquipmentTitle")}
                </h4>
                <ol className="space-y-2">
                  {items.map((selected, index) => {
                    const item = equipment.find((entry) => entry.id === selected.equipmentId);
                    if (!item) return null;
                    return (
                      <li key={selected.equipmentId} className="flex min-w-0 items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 dark:border-gray-700 dark:bg-gray-900">
                        <span className="shrink-0 text-xs font-semibold tabular-nums text-gray-400">{index + 1}.</span>
                        <span className="min-w-0 flex-1">
                          <span className="block break-words text-sm font-semibold text-gray-900 dark:text-gray-100">{item.name}</span>
                          <span className="block text-xs text-gray-500 dark:text-gray-400">
                            {item.size} · {selected.complimentary ? t("free") : t("perDay", { amount: formatBookingMoney(booking?.items.find((old) => old.equipmentId === item.id)?.dailyRate ?? item.dailyRate) })}
                          </span>
                        </span>
                        {!issued && <button type="button" disabled={isSubmitting}
                          onClick={() => updateItems(items.filter((entry) => entry.equipmentId !== selected.equipmentId))}
                          aria-label={t("removeSelectedEquipment", { name: item.name })}
                          className="shrink-0 rounded-lg px-2.5 py-2 text-xs font-semibold text-gray-500 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-brand-500 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-red-950/40 dark:hover:text-red-300">
                          {t("removeEquipment")}
                        </button>}
                      </li>
                    );
                  })}
                </ol>
              </section>
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
              disabled={isSubmitting || !pricing || selectedUnavailable || Boolean(booking && pricing.total < booking.netPaid)}
            >
              {t(isSubmitting ? "saving" : "save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}