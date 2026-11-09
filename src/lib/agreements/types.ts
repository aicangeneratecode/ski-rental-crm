import type { BookingRow } from "@/lib/bookings/types";

export type AgreementBooking = Omit<BookingRow, "customerPhone" | "notes">;
export type AgreementFields = {
  number: string;
  date: string;
  fullName: string;
  passportNumber: string;
  passportIssuer: string;
  passportDate: string;
};
export function agreementDate(value: string) {
  return value ? value.split("-").reverse().join(".") : "________________";
}
export function rentalCalendarDays(start: string, end: string) {
  return (
    Math.round(
      (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
        86400000,
    ) + 1
  );
}
export function agreementNumber(id: string) {
  return `TR-${id}`;
}
