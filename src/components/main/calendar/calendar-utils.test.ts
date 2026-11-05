import assert from "node:assert/strict";
import test from "node:test";
import { addDays, getMonthWeeks, layoutWeek, hiddenByDay, overlaps, shiftMonth, startOfWeek, applyCalendarFilters } from "./calendar-utils";
import type { CalendarRental, CalendarFilters } from "./calendar-types";

const base: CalendarRental = {
  id: "b1", version: 1, customerId: "c1", customerName: "Анна", customerPhone: "+38164111111",
  createdById: "u1", createdByName: "Мария", equipmentIds: ["e1"], tariffs: ["Premium"],
  startDate: "2026-12-03", endDate: "2026-12-08", status: "RESERVED", paidDays: 6,
  travelDay: false, discountPercent: 0, subtotal: 12000, discountAmount: 0, total: 12000, notes: "",
  items: [{ id: "i1", code: "S-1", name: "Atomic", complimentary: false, dailyRate: 2000, amount: 12000 }]
};
const filters: CalendarFilters = { equipmentId: "", tariff: "", customerId: "", staffId: "", search: "" };
test("months start on Monday and fit all days even on 6-week months", () => {
  const december = getMonthWeeks("2026-12-15");
  assert.equal(december[0][0], "2026-11-30");
  assert.equal(december.at(-1)?.at(-1), "2027-01-03");
  assert.equal(startOfWeek("2026-12-06"), "2026-11-30");
  assert.equal(shiftMonth("2026-01-31", 1), "2026-02-28");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});
test("bookings intersect dates inclusively", () => {
  assert.equal(overlaps(base, "2026-12-08", "2026-12-08"), true);
  assert.equal(overlaps(base, "2026-12-09", "2026-12-09"), false);
});
test("multiple day spans are split by week and never overlap on a lane", () => {
  const second = { ...base, id: "b2", startDate: "2026-12-04", endDate: "2026-12-05" };
  const after = { ...base, id: "b3", startDate: "2026-12-09", endDate: "2026-12-11" };
  const segments = layoutWeek([base, second, after], "2026-11-30");
  assert.equal(segments.length, 2);
  assert.equal(segments[0].lane, 0);
  assert.equal(segments[1].lane, 1);
  assert.deepEqual(hiddenByDay(segments, 1), [0,0,0,0,1,1,0]);
  const nextWeek = layoutWeek([base, second, after], "2026-12-07");
  assert.equal(nextWeek[0].start, 0);
  assert.equal(nextWeek[0].end, 1);
});
test("filters combine inventory tariff staff customer and search", () => {
  assert.equal(applyCalendarFilters([base], { ...filters, equipmentId: "e1", tariff: "Premium", staffId: "u1", customerId: "c1", search: "atomic" }).length, 1);
  assert.equal(applyCalendarFilters([base], { ...filters, equipmentId: "e2" }).length, 0);
});
