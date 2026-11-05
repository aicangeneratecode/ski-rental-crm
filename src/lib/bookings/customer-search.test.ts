import assert from "node:assert/strict";
import test from "node:test";
import { searchBookingCustomers } from "./customer-search";
import type { BookingCustomer } from "./types";

const customers: BookingCustomer[] = [
  { id: "1", name: "Анна Иванова", phone: "+381641234567" },
  { id: "2", name: "Иван Петров", phone: "" },
  { id: "3", name: "Ёлка Сидорова", phone: "063777888" },
];

test("customer search is case-insensitive and handles multiple name tokens", () => {
  assert.deepEqual(searchBookingCustomers(customers, "иванова АННА").map(c => c.id), ["1"]);
  assert.deepEqual(searchBookingCustomers(customers, "ПЕТРОВ").map(c => c.id), ["2"]);
  assert.deepEqual(searchBookingCustomers(customers, "елка").map(c => c.id), ["3"]);
});

test("customer search matches local +381 and 0-prefixed telephone numbers", () => {
  assert.deepEqual(searchBookingCustomers(customers, "0641234567").map(c => c.id), ["1"]);
  assert.deepEqual(searchBookingCustomers(customers, "+381641234").map(c => c.id), ["1"]);
  assert.deepEqual(searchBookingCustomers(customers, "063777").map(c => c.id), ["3"]);
});

test("empty query returns all customers and unknown name returns none", () => {
  assert.equal(searchBookingCustomers(customers, "").length, 3);
  assert.equal(searchBookingCustomers(customers, "несуществующий").length, 0);
});
