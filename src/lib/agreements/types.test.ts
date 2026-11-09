import assert from "node:assert/strict";
import test from "node:test";
import { agreementDate, agreementNumber, rentalCalendarDays } from "./types";
test("rental days are inclusive and independent of DST", () => {
  assert.equal(rentalCalendarDays("2026-03-28", "2026-03-30"), 3);
  assert.equal(rentalCalendarDays("2026-10-24", "2026-10-26"), 3);
  assert.equal(rentalCalendarDays("2026-12-31", "2027-01-02"), 3);
  assert.equal(rentalCalendarDays("2028-02-28", "2028-03-01"), 3);
  assert.equal(rentalCalendarDays("2026-11-09", "2026-11-09"), 1);
});
test("contract reference preserves booking identity and dates support empty passport fields", () => {
  assert.equal(agreementNumber("a-b-c"), "TR-a-b-c");
  assert.equal(agreementDate("2026-11-09"), "09.11.2026");
  assert.equal(agreementDate(""), "________________");
});
