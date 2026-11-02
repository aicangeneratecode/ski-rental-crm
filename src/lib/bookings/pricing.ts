export type RentalDiscount = 0 | 5 | 10 | 15 | 20;

export type RentalItem = {
  equipmentId: string;
  dailyRate: number;
  complimentary: boolean;
};

export type RentalPricingInput = {
  startDate: string;
  endDate: string;
  travelDay: boolean;
  discountPercent: RentalDiscount;
  items: RentalItem[];
};

const DAY_MS = 86_400_000;

const minimumDays: Record<RentalDiscount, number> = {
  0: 1,
  5: 4,
  10: 6,
  15: 8,
  20: 10,
};

function parseDate(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("INVALID_DATE");
  }

  // Работаем с календарными датами без влияния часового пояса.
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);

  if (
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString().slice(0, 10) !== value
  ) {
    throw new Error("INVALID_DATE");
  }

  return timestamp;
}

export function calculateRental(input: RentalPricingInput) {
  const start = parseDate(input.startDate);
  const end = parseDate(input.endDate);

  if (end < start) {
    throw new Error("INVALID_DATE_RANGE");
  }

  const calendarDays = (end - start) / DAY_MS + 1;
  const paidDays = calendarDays - (input.travelDay ? 1 : 0);

  if (paidDays < 1) {
    throw new Error("NO_PAID_DAYS");
  }

  if (
    !Object.prototype.hasOwnProperty.call(
      minimumDays,
      input.discountPercent,
    )
  ) {
    throw new Error("INVALID_DISCOUNT");
  }

  if (paidDays < minimumDays[input.discountPercent]) {
    throw new Error("DISCOUNT_NOT_AVAILABLE");
  }

  if (input.items.length === 0) {
    throw new Error("EMPTY_ITEMS");
  }

  const ids = new Set<string>();

  const lines = input.items.map((item) => {
    if (!item.equipmentId.trim()) {
      throw new Error("INVALID_EQUIPMENT");
    }

    if (ids.has(item.equipmentId)) {
      throw new Error("DUPLICATE_EQUIPMENT");
    }

    ids.add(item.equipmentId);

    if (
      !Number.isSafeInteger(item.dailyRate) ||
      item.dailyRate < 0 ||
      item.dailyRate > 1_000_000
    ) {
      throw new Error("INVALID_RATE");
    }

    const standardAmount = item.dailyRate * paidDays;

    return {
      equipmentId: item.equipmentId,
      dailyRate: item.dailyRate,
      complimentary: item.complimentary,
      standardAmount,
      amount: item.complimentary ? 0 : standardAmount,
    };
  });

  const standardSubtotal = lines.reduce(
    (sum, line) => sum + line.standardAmount,
    0,
  );

  const subtotal = lines.reduce(
    (sum, line) => sum + line.amount,
    0,
  );

  // Проверяем и промежуточное умножение для денежного расчёта.
  if (
    !Number.isSafeInteger(standardSubtotal) ||
    !Number.isSafeInteger(subtotal * 100)
  ) {
    throw new Error("AMOUNT_TOO_LARGE");
  }

  const total = Math.round(
    (subtotal * (100 - input.discountPercent)) / 100,
  );

  return {
    calendarDays,
    paidDays,
    travelDay: input.travelDay,
    discountPercent: input.discountPercent,
    lines,
    standardSubtotal,
    complimentaryAmount: standardSubtotal - subtotal,
    subtotal,
    discountAmount: subtotal - total,
    total,
  };
}