import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateRental,
  type RentalPricingInput,
} from "./pricing";

function booking(
  changes: Partial<RentalPricingInput> = {},
): RentalPricingInput {
  return {
    startDate: "2027-01-10",
    endDate: "2027-01-12",
    travelDay: false,
    discountPercent: 0,
    items: [
      {
        equipmentId: "ski-001",
        dailyRate: 2000,
        complimentary: false,
      },
    ],
    ...changes,
  };
}

test("includes both pickup and return dates", () => {
  const result = calculateRental(booking());

  assert.equal(result.calendarDays, 3);
  assert.equal(result.paidDays, 3);
  assert.equal(result.total, 6000);
});

test("same-day rental costs one daily rate", () => {
  const result = calculateRental(
    booking({ endDate: "2027-01-10" }),
  );

  assert.equal(result.paidDays, 1);
  assert.equal(result.total, 2000);
});

test("travel day reduces payment but preserves occupied dates", () => {
  const result = calculateRental(
    booking({ travelDay: true }),
  );

  assert.equal(result.calendarDays, 3);
  assert.equal(result.paidDays, 2);
  assert.equal(result.total, 4000);
});

test("long rental receives no automatic discount", () => {
  const result = calculateRental(
    booking({ endDate: "2027-01-19" }),
  );

  assert.equal(result.paidDays, 10);
  assert.equal(result.discountAmount, 0);
  assert.equal(result.total, 20000);
});

test("arbitrary percentage is allowed even on a one-day rental", () => {
  const total = calculateRental(booking({ endDate: "2027-01-10", discountPercent: 37 }));
  assert.equal(total.subtotal, 2000);
  assert.equal(total.discountAmount, 740);
  assert.equal(total.total, 1260);
});

test("manual fixed RSD discount changes total without changing rates", () => {
  const result = calculateRental(booking({ discountPercent: 0, discountFixed: 1555 }));
  assert.equal(result.subtotal, 6000);
  assert.equal(result.discountAmount, 1555);
  assert.equal(result.total, 4445);
  assert.equal(result.lines[0].amount, 6000);
});

test("rounds fractional percent discount to whole dinars", () => {
  const result = calculateRental(booking({
    endDate: "2027-01-10",
    discountPercent: 33,
    items: [{ equipmentId: "helmet", dailyRate: 75, complimentary: false }],
  }));
  assert.equal(result.discountAmount, 25);
  assert.equal(result.total, 50);
});

test("fully discounted rentals may have zero total", () => {
  assert.equal(calculateRental(booking({ discountPercent: 100 })).total, 0);
  assert.equal(calculateRental(booking({ discountFixed: 6000 })).total, 0);
});

test("rejects out-of-range discount, a fixed discount above subtotal and mixed modes", () => {
  for (const discountPercent of [-1, 101, 1.5, Number.NaN]) {
    assert.throws(() => calculateRental(booking({ discountPercent })), /INVALID_DISCOUNT/);
  }
  for (const discountFixed of [-1, 1.5, Number.NaN]) {
    assert.throws(() => calculateRental(booking({ discountFixed })), /INVALID_DISCOUNT/);
  }
  assert.throws(
    () => calculateRental(booking({ discountPercent: 5, discountFixed: 100 })),
    /INVALID_DISCOUNT/,
  );
  assert.throws(
    () => calculateRental(booking({ discountFixed: 6001 })),
    /DISCOUNT_EXCEEDS_SUBTOTAL/,
  );
});

test("equipment becomes free only after manual selection", () => {
  const items = [
    {
      equipmentId: "ski-001",
      dailyRate: 2000,
      complimentary: false,
    },
    {
      equipmentId: "poles-001",
      dailyRate: 250,
      complimentary: false,
    },
  ];

  assert.equal(
    calculateRental(booking({ items })).total,
    6750,
  );

  const result = calculateRental(
    booking({
      items: [
        items[0],
        { ...items[1], complimentary: true },
      ],
    }),
  );

  assert.equal(result.total, 6000);
  assert.equal(result.complimentaryAmount, 750);
});

test("calendar calculation handles leap years and clock changes", () => {
  assert.equal(
    calculateRental(
      booking({
        startDate: "2028-02-28",
        endDate: "2028-03-01",
      }),
    ).calendarDays,
    3,
  );

  assert.equal(
    calculateRental(
      booking({
        startDate: "2027-03-27",
        endDate: "2027-03-29",
      }),
    ).calendarDays,
    3,
  );
});

test("invalid dates and zero paid days are rejected", () => {
  for (const changes of [
    { startDate: "2027-02-29" },
    { startDate: "2027-01-13" },
    { startDate: "10.01.2027" },
    { endDate: "2027-01-10", travelDay: true },
  ]) {
    assert.throws(() => calculateRental(booking(changes)));
  }
});

test("empty selection, duplicate equipment and invalid rates fail", () => {
  assert.throws(
    () => calculateRental(booking({ items: [] })),
    /EMPTY_ITEMS/,
  );

  const item = booking().items[0];

  assert.throws(
    () => calculateRental(booking({ items: [item, item] })),
    /DUPLICATE_EQUIPMENT/,
  );

  for (const dailyRate of [-1, 1.5, NaN, 1_000_001]) {
    assert.throws(
      () =>
        calculateRental(
          booking({ items: [{ ...item, dailyRate }] }),
        ),
      /INVALID_RATE/,
    );
  }
});