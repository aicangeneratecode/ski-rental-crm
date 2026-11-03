import type { BookingRow } from "./types";

export type TodayKind = "pickup" | "return" | "overdue" | "missed";

export function getBelgradeDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Belgrade",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value;

  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function getTodayKind(
  booking: Pick<BookingRow, "status" | "startDate" | "endDate">,
  today: string,
): TodayKind | null {
  if (booking.status === "RESERVED") {
    if (booking.startDate < today) return "missed";
    if (booking.startDate === today) return "pickup";
  }

  if (booking.status === "ISSUED") {
    if (booking.endDate < today) return "overdue";
    if (booking.endDate === today) return "return";
  }

  return null;
}