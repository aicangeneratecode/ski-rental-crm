export type RentalDiscount = number;

export type RentalItem = {
  equipmentId: string;
  dailyRate: number;
  complimentary: boolean;
};

export type RentalPricingInput = {
  startDate: string;
  endDate: string;
  travelDay: boolean;
  /** Manual discount: integer percentage from 0 to 100. */
  discountPercent: number;
  /** Alternative manual discount in whole RSD. May not be combined with percent. */
  discountFixed?: number;
  items: RentalItem[];
};

const DAY_MS = 86_400_000;

function parseDate(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("INVALID_DATE");
  }

  // Calendar dates are timezone independent.
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
  if (end < start) throw new Error("INVALID_DATE_RANGE");

  const calendarDays = (end - start) / DAY_MS + 1;
  const paidDays = calendarDays - (input.travelDay ? 1 : 0);
  if (paidDays < 1) throw new Error("NO_PAID_DAYS");
  if (calendarDays > 366) throw new Error("RENTAL_TOO_LONG");

  const discountFixed = input.discountFixed ?? 0;
  if (!Number.isSafeInteger(input.discountPercent) || input.discountPercent < 0 || input.discountPercent > 100
    || !Number.isSafeInteger(discountFixed) || discountFixed < 0 || discountFixed > 2_147_483_647
    || (discountFixed > 0 && input.discountPercent > 0)) {
    throw new Error("INVALID_DISCOUNT");
  }

  if (input.items.length === 0) throw new Error("EMPTY_ITEMS");

  const ids = new Set<string>();
  const lines = input.items.map((item) => {
    if (!item.equipmentId.trim()) throw new Error("INVALID_EQUIPMENT");
    if (ids.has(item.equipmentId)) throw new Error("DUPLICATE_EQUIPMENT");
    ids.add(item.equipmentId);
    if (!Number.isSafeInteger(item.dailyRate) || item.dailyRate < 0 || item.dailyRate > 1_000_000) {
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

  const standardSubtotal = lines.reduce((sum, line) => sum + line.standardAmount, 0);
  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
  // Money is stored in PostgreSQL Int; keep the complete calculation in range.
  if (!Number.isSafeInteger(standardSubtotal) || standardSubtotal > 2_147_483_647 ||
      !Number.isSafeInteger(subtotal) || subtotal > 2_147_483_647) {
    throw new Error("AMOUNT_TOO_LARGE");
  }
  if (discountFixed > subtotal) throw new Error("DISCOUNT_EXCEEDS_SUBTOTAL");

  const discountAmount = discountFixed > 0
    ? discountFixed
    : Math.round(subtotal * input.discountPercent / 100);
  const total = subtotal - discountAmount;

  return {
    calendarDays,
    paidDays,
    travelDay: input.travelDay,
    discountPercent: input.discountPercent,
    discountFixed,
    lines,
    standardSubtotal,
    complimentaryAmount: standardSubtotal - subtotal,
    subtotal,
    discountAmount,
    total,
  };
}
