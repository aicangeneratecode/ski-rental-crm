import assert from "node:assert/strict";
import test from "node:test";

import {
  filterRentals, matchesRentalView, rentalBalance, type RentalFilters, type RentalRow,
} from "./booking-list-utils";

const today = "2026-11-04";
const base: RentalRow = {
  id: "booking-a",
  version: 1,
  customerName: "Анна Иванова",
  customerPhone: "+381641234567",
  createdAt: "2026-11-01T10:00:00.000Z",
  startDate: "2026-11-04",
  endDate: "2026-11-07",
  status: "RESERVED",
  paidDays: 4,
  total: 8000,
  netPaid: 2000,
  notes: "",
  travelDay: false,
  discountPercent: 0,
  subtotal: 8000,
  discountAmount: 0,
  items: [{
    id: "item-a", code: "SKI-100", name: "Atomic Redster", complimentary: false,
    dailyRate: 2000, amount: 8000,
  }],
};
const filters: RentalFilters = {
  view: "all", query: "", from: "", to: "", balanceOnly: false, sort: "priority",
};
const withChanges = (changes: Partial<RentalRow>): RentalRow => ({ ...base, ...changes });

test("priority puts overdue returns and missed pickup first", () => {
  const late = withChanges({ id: "overdue", status: "ISSUED", endDate: "2026-11-01" });
  const missed = withChanges({ id: "missed", status: "RESERVED", startDate: "2026-11-02" });
  const returned = withChanges({ id: "returned", status: "RETURNED" });
  const result = filterRentals([returned, base, missed, late], filters, today);
  assert.deepEqual(result.map((row) => row.id), ["overdue", "missed", "booking-a", "returned"]);
  assert.equal(matchesRentalView(late, "attention", today), true);
  assert.equal(matchesRentalView(missed, "attention", today), true);
  assert.equal(matchesRentalView(base, "pickup", today), true);
});

test("balance includes only non-cancelled bookings with outstanding payment", () => {
  const paid = withChanges({ id: "paid", netPaid: 8000 });
  const cancelled = withChanges({ id: "cancelled", status: "CANCELLED" });
  assert.equal(rentalBalance(base), 6000);
  assert.deepEqual(
    filterRentals([base, paid, cancelled], { ...filters, view: "balance" }, today).map((row) => row.id),
    ["booking-a"],
  );
});

test("search recognizes equipment codes, names and phone digits", () => {
  assert.equal(filterRentals([base], { ...filters, query: "ski-100" }, today).length, 1);
  assert.equal(filterRentals([base], { ...filters, query: "atomic" }, today).length, 1);
  assert.equal(filterRentals([base], { ...filters, query: "0641234567" }, today).length, 1);
  assert.equal(filterRentals([base], { ...filters, query: "неизвестный" }, today).length, 0);
});

test("date filter uses inclusive period overlaps", () => {
  assert.equal(filterRentals([base], { ...filters, from: "2026-11-07", to: "2026-11-08" }, today).length, 1);
  assert.equal(filterRentals([base], { ...filters, from: "2026-11-08" }, today).length, 0);
  assert.equal(filterRentals([base], { ...filters, from: "2026-11-10", to: "2026-11-01" }, today).length, 0);
});

test("amount sorting is deterministic", () => {
  const expensive = withChanges({ id: "expensive", total: 20000 });
  const sorted = filterRentals([base, expensive], { ...filters, sort: "amountDesc" }, today);
  assert.deepEqual(sorted.map((row) => row.id), ["expensive", "booking-a"]);
});
