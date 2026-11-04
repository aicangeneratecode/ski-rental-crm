import type { CalendarFilters, CalendarRental } from "./calendar-types";

const DAY_MS = 86_400_000;
export function dayStamp(date: string): number {
  return Date.parse(`${date}T00:00:00.000Z`);
}
export function addDays(date: string, count: number): string {
  return new Date(dayStamp(date) + count * DAY_MS).toISOString().slice(0, 10);
}
export function startOfWeek(date: string): string {
  const day = new Date(dayStamp(date)).getUTCDay();
  return addDays(date, -((day + 6) % 7));
}
export function startOfMonth(date: string): string {
  return date.slice(0, 7) + "-01";
}
export function shiftMonth(date: string, count: number): string {
  const day = Number(date.slice(8, 10));
  const first = new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1 + count, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(day, lastDay))).toISOString().slice(0, 10);
}
export function endOfMonth(date: string): string {
  return addDays(shiftMonth(startOfMonth(date), 1), -1);
}
export function getMonthWeeks(date: string): string[][] {
  const first = startOfWeek(startOfMonth(date));
  const last = endOfMonth(date);
  const weekCount = Math.ceil((Math.round((dayStamp(last) - dayStamp(first)) / DAY_MS) + 1) / 7);
  return Array.from({ length: weekCount }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => addDays(first, week * 7 + day)));
}
export function overlaps(rental: Pick<CalendarRental, "startDate" | "endDate">, from: string, to: string): boolean {
  return rental.startDate <= to && rental.endDate >= from;
}
export function activeOn(rental: Pick<CalendarRental, "startDate" | "endDate">, date: string): boolean {
  return overlaps(rental, date, date);
}
export function formatMonth(date: string): string {
  return new Intl.DateTimeFormat("ru-RU", { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(dayStamp(date)));
}
export function formatFullDay(date: string): string {
  return new Intl.DateTimeFormat("ru-RU", { timeZone: "UTC", day: "numeric", month: "long", weekday: "long", year: "numeric" }).format(new Date(dayStamp(date)));
}
export function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat("ru-RU", { timeZone: "UTC", day: "numeric", month: "short" }).format(new Date(dayStamp(date)));
}
export function applyCalendarFilters(rentals: CalendarRental[], filters: CalendarFilters): CalendarRental[] {
  const search = filters.search.trim().toLocaleLowerCase("ru");
  return rentals.filter((rental) => {
    if (filters.equipmentId && !rental.equipmentIds.includes(filters.equipmentId)) return false;
    if (filters.tariff && !rental.tariffs.includes(filters.tariff)) return false;
    if (filters.customerId && rental.customerId !== filters.customerId) return false;
    if (filters.staffId && rental.createdById !== filters.staffId) return false;
    if (!search) return true;
    return [
      rental.id, rental.customerName, rental.customerPhone,
      ...rental.items.flatMap((item) => [item.code, item.name])
    ].join(" ").toLocaleLowerCase("ru").includes(search);
  });
}

export type CalendarSegment = {
  rental: CalendarRental;
  start: number;
  end: number;
  lane: number;
};
export function layoutWeek(rentals: CalendarRental[], weekStart: string): CalendarSegment[] {
  const weekEnd = addDays(weekStart, 6);
  const candidates = rentals.filter((r) => overlaps(r, weekStart, weekEnd))
    .sort((a, b) => a.startDate.localeCompare(b.startDate)
      || b.endDate.localeCompare(a.endDate) || a.id.localeCompare(b.id));
  const laneEnds: number[] = [];
  return candidates.map((rental) => {
    const start = Math.max(0, Math.round((dayStamp(rental.startDate) - dayStamp(weekStart)) / DAY_MS));
    const end = Math.min(6, Math.round((dayStamp(rental.endDate) - dayStamp(weekStart)) / DAY_MS));
    let lane = laneEnds.findIndex((occupiedEnd) => occupiedEnd < start);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = end;
    return { rental, start, end, lane };
  });
}
export function hiddenByDay(segments: CalendarSegment[], visibleLanes: number): number[] {
  return Array.from({ length: 7 }, (_, day) =>
    segments.filter((segment) => segment.lane >= visibleLanes && segment.start <= day && segment.end >= day).length);
}
