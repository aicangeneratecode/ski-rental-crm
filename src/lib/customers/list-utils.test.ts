import assert from "node:assert/strict";
import test from "node:test";
import {
  customerRentalBalance,
  summarizeCustomerRentals,
  filterAndSortCustomers,
  type CustomerListRow,
  type CustomerRental,
  type CustomerListFilters,
} from "./list-utils";

function rental(changes: Partial<CustomerRental> = {}): CustomerRental {
  return {
    id: "b-1",
    startDate: "2026-11-04",
    endDate: "2026-11-08",
    status: "ISSUED",
    total: 12000,
    netPaid: 5000,
    ...changes,
  };
}

const filters: CustomerListFilters = {
  query: "",
  sort: "createdAt",
  direction: "desc",
  balanceFilter: "all",
};

function customer(changes: Partial<CustomerListRow> = {}): CustomerListRow {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Лаврик Оля",
    phone: "+381621926013",
    email: "olya@example.com",
    notes: "",
    version: 1,
    createdAt: "2026-11-04T12:00:00.000Z",
    rentals: [],
    rentalCount: 1,
    activeCount: 1,
    completedCount: 0,
    balance: 7000,
    dueBalance: 7000,
    ...changes,
  };
}

test("balances exclude cancelled bookings and subtract refunds", () => {
  assert.equal(customerRentalBalance(rental({ netPaid: 3000 })), 9000);
  assert.equal(customerRentalBalance(rental({ netPaid: 14000 })), 0);
  assert.equal(customerRentalBalance(rental({ status: "CANCELLED", netPaid: 0 })), 0);
});

test("future reservations count toward outstanding but not due after issue", () => {
  const summary = summarizeCustomerRentals([
    rental({ id: "future", status: "RESERVED", total: 5000, netPaid: 0 }),
    rental({ id: "issued", total: 10000, netPaid: 6000 }),
    rental({ id: "returned", status: "RETURNED", total: 3000, netPaid: 3000 }),
    rental({ id: "cancelled", status: "CANCELLED", total: 12000, netPaid: 0 }),
  ]);
  assert.deepEqual(summary, {
    rentalCount: 4,
    activeCount: 2,
    completedCount: 1,
    balance: 9000,
    dueBalance: 4000,
  });
});

test("search matches names, codes, emails and local 06 / +381 phone forms", () => {
  const item = customer();
  assert.equal(filterAndSortCustomers([item], { ...filters, query: "лаврик" }).length, 1);
  assert.equal(filterAndSortCustomers([item], { ...filters, query: "olya@example" }).length, 1);
  assert.equal(filterAndSortCustomers([item], { ...filters, query: "0621926013" }).length, 1);
  assert.equal(filterAndSortCustomers([item], { ...filters, query: "11111111" }).length, 1);
  assert.equal(filterAndSortCustomers([item], { ...filters, query: "no-match" }).length, 0);
});

test("filters outstanding balances without mutating input rows", () => {
  const items = [customer(), customer({ id: "other", name: "Анна", balance: 0, dueBalance: 0 })];
  assert.equal(filterAndSortCustomers(items, { ...filters, balanceFilter: "withBalance" }).length, 1);
  assert.equal(filterAndSortCustomers(items, { ...filters, balanceFilter: "settled" }).length, 1);
  assert.equal(items[0].name, "Лаврик Оля");
});

test("sorts by balance, name, rentals and creation date", () => {
  const a = customer({ id: "one", name: "Анна", balance: 2000, rentalCount: 2, createdAt: "2026-11-01T12:00:00Z" });
  const b = customer({ id: "two", name: "Борис", balance: 8000, rentalCount: 10, createdAt: "2026-11-02T12:00:00Z" });
  const items = [a, b];
  assert.deepEqual(filterAndSortCustomers(items, { ...filters, sort: "balance" }).map((x) => x.id), ["two", "one"]);
  assert.deepEqual(filterAndSortCustomers(items, { ...filters, sort: "name", direction: "asc" }).map((x) => x.id), ["one", "two"]);
  assert.deepEqual(filterAndSortCustomers(items, { ...filters, sort: "rentalCount", direction: "asc" }).map((x) => x.id), ["one", "two"]);
  assert.deepEqual(filterAndSortCustomers(items, filters).map((x) => x.id), ["two", "one"]);
});
