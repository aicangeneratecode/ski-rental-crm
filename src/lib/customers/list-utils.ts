import type { CustomerRow } from "./schema";
import type { BookingRow } from "@/lib/bookings/types";

export type CustomerRental = {
  id: string;
  startDate: string;
  endDate: string;
  status: BookingRow["status"];
  total: number;
  netPaid: number;
};

export type CustomerListRow = CustomerRow & {
  createdAt: string;
  rentals: CustomerRental[];
  rentalCount: number;
  activeCount: number;
  completedCount: number;
  /** Outstanding amount on non-cancelled rentals; may include future reserved rentals. */
  balance: number;
  /** Unpaid amount only on already issued or returned rentals. */
  dueBalance: number;
};

export type CustomerSort = "createdAt" | "name" | "balance" | "rentalCount";
export type CustomerDirection = "asc" | "desc";
export type CustomerBalanceFilter = "all" | "withBalance" | "settled";

export type CustomerListFilters = {
  query: string;
  sort: CustomerSort;
  direction: CustomerDirection;
  balanceFilter: CustomerBalanceFilter;
};

export function customerRentalBalance(rental: CustomerRental): number {
  if (rental.status === "CANCELLED") return 0;
  return Math.max(0, rental.total - rental.netPaid);
}

export function summarizeCustomerRentals(rentals: CustomerRental[]) {
  return {
    rentalCount: rentals.length,
    activeCount: rentals.filter((rental) => rental.status === "RESERVED" || rental.status === "ISSUED").length,
    completedCount: rentals.filter((rental) => rental.status === "RETURNED").length,
    balance: rentals.reduce((sum, rental) => sum + customerRentalBalance(rental), 0),
    dueBalance: rentals.reduce(
      (sum, rental) =>
        sum + (rental.status === "ISSUED" || rental.status === "RETURNED" ? customerRentalBalance(rental) : 0),
      0,
    ),
  };
}

function normalizedPhoneNumbers(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("381")) return [digits, "0" + digits.slice(3)];
  if (digits.startsWith("0")) return [digits, "381" + digits.slice(1)];
  return [digits];
}

export function filterAndSortCustomers(
  customers: CustomerListRow[],
  { query, sort, direction, balanceFilter }: CustomerListFilters,
): CustomerListRow[] {
  const search = query.trim().toLocaleLowerCase("ru");
  const phoneQuery = search.replace(/\D/g, "");
  const matching = customers.filter((customer) => {
    if (balanceFilter === "withBalance" && customer.balance <= 0) return false;
    if (balanceFilter === "settled" && customer.balance > 0) return false;
    if (!search) return true;
    const searchable = [customer.id, customer.name, customer.email, customer.phone]
      .join(" ").toLocaleLowerCase("ru");
    return searchable.includes(search) ||
      (phoneQuery.length >= 3 && normalizedPhoneNumbers(customer.phone)
        .some((number) => number.includes(phoneQuery)));
  });

  const factor = direction === "asc" ? 1 : -1;
  return matching.sort((a, b) => {
    let compared = 0;
    switch (sort) {
      case "name": compared = a.name.localeCompare(b.name, "ru"); break;
      case "balance": compared = a.balance - b.balance; break;
      case "rentalCount": compared = a.rentalCount - b.rentalCount; break;
      default: compared = a.createdAt.localeCompare(b.createdAt);
    }
    return factor * compared || a.name.localeCompare(b.name, "ru") || a.id.localeCompare(b.id);
  });
}
