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

test("each discount becomes available at its paid-day threshold", () => {
  const cases = [
    { discount: 5, days: 4 },
    { discount: 10, days: 6 },
    { discount: 15, days: 8 },
    { discount: 20, days: 10 },
  ] as const;

  for (const { discount, days } of cases) {
    const result = calculateRental(
      booking({
        endDate: `2027-01-${9 + days}`,
        discountPercent: discount,
      }),
    );

    assert.equal(result.paidDays, days);
    assert.equal(
      result.total,
      2000 * days * (1 - discount / 100),
    );

    assert.throws(
      () =>
        calculateRental(
          booking({
            endDate: `2027-01-${8 + days}`,
            discountPercent: discount,
          }),
        ),
      /DISCOUNT_NOT_AVAILABLE/,
    );
  }
});

test("free travel day does not count toward discount eligibility", () => {
  assert.throws(
    () =>
      calculateRental(
        booking({
          endDate: "2027-01-13",
          travelDay: true,
          discountPercent: 5,
        }),
      ),
    /DISCOUNT_NOT_AVAILABLE/,
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