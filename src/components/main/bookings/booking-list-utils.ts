import { getTodayKind } from "@/lib/bookings/today";
import type { BookingRow } from "@/lib/bookings/types";

export type RentalRow = BookingRow & { netPaid: number; createdAt: string };
export type RentalView = "all" | "pickup" | "return" | "active" | "attention" | "balance" | "reserved" | "returned" | "cancelled";
export type RentalSort = "priority" | "newest" | "startAsc" | "startDesc" | "endAsc" | "endDesc" | "nameAsc" | "amountDesc" | "balanceDesc";
export type RentalFilters = {
  view: RentalView; query: string; from: string; to: string;
  balanceOnly: boolean; sort: RentalSort;
};

export function rentalBalance(row: RentalRow): number {
  return Math.max(0, row.total - row.netPaid);
}
export function rentalAttention(row: RentalRow, today: string) {
  const kind = getTodayKind(row, today);
  return kind === "overdue" || kind === "missed";
}
export function rentalPriority(row: RentalRow, today: string): number {
  const kind = getTodayKind(row, today);
  if (kind === "overdue") return 0;
  if (kind === "missed") return 1;
  if (kind === "return") return 2;
  if (kind === "pickup") return 3;
  if (row.status === "ISSUED") return 4;
  if (row.status === "RESERVED") return 5;
  if (row.status === "RETURNED") return 6;
  return 7;
}
export function matchesRentalView(row: RentalRow, view: RentalView, today: string): boolean {
  const kind = getTodayKind(row, today);
  switch (view) {
    case "pickup": return kind === "pickup";
    case "return": return kind === "return";
    case "active": return row.status === "ISSUED";
    case "attention": return rentalAttention(row, today);
    case "balance": return row.status !== "CANCELLED" && rentalBalance(row) > 0;
    case "reserved": return row.status === "RESERVED";
    case "returned": return row.status === "RETURNED";
    case "cancelled": return row.status === "CANCELLED";
    default: return true;
  }
}
function normalize(value: string) {
  return value.toLocaleLowerCase("ru").trim();
}
function compareString(a: string, b: string): number {
  return a.localeCompare(b, "ru");
}
export function filterRentals(rows: RentalRow[], filters: RentalFilters, today: string): RentalRow[] {
  const query = normalize(filters.query);
  const phoneDigits = query.replace(/\D/g, "");
  const filtered = rows.filter((row) => {
    if (filters.from && filters.to && filters.from > filters.to) return false;
    if (!matchesRentalView(row, filters.view, today)) return false;
    if (filters.balanceOnly && (row.status === "CANCELLED" || rentalBalance(row) <= 0)) return false;
    if (filters.from && row.endDate < filters.from) return false;
    if (filters.to && row.startDate > filters.to) return false;
    if (!query) return true;
    const searchable = normalize([row.id, row.customerName, row.customerPhone, row.notes,
      ...row.items.flatMap((item) => [item.name, item.code])].join(" "));
    return searchable.includes(query) ||
      (phoneDigits.length >= 3 && row.customerPhone.replace(/\D/g, "").includes(phoneDigits));
  });
  return filtered.sort((a, b) => {
    let comparison = 0;
    switch (filters.sort) {
      case "newest": comparison = compareString(b.createdAt, a.createdAt); break;
      case "startAsc": comparison = compareString(a.startDate, b.startDate); break;
      case "startDesc": comparison = compareString(b.startDate, a.startDate); break;
      case "endAsc": comparison = compareString(a.endDate, b.endDate); break;
      case "endDesc": comparison = compareString(b.endDate, a.endDate); break;
      case "nameAsc": comparison = compareString(a.customerName, b.customerName); break;
      case "amountDesc": comparison = b.total - a.total; break;
      case "balanceDesc": comparison = rentalBalance(b) - rentalBalance(a); break;
      default: comparison = rentalPriority(a, today) - rentalPriority(b, today);
    }
    return comparison || compareString(b.createdAt, a.createdAt) || compareString(a.id, b.id);
  });
}
