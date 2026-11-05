import { getDb } from "@/lib/db";
import { getBelgradeDate } from "@/lib/bookings/today";
import { getTariff } from "@/lib/equipment/tariffs";

export type ReportPeriod = { from: string; to: string; days: number };
export type CashDay = { day: string; received: number; refunded: number; net: number };
export type CashMethod = { method: "CASH" | "CARD" | "TRANSFER"; received: number; refunded: number; net: number };
export type CategoryReport = {
  tariff: string; category: string; rentals: number; units: number;
  unitDays: number; capacityDays: number; utilization: number;
};
export type PopularEquipment = {
  equipmentId: string; code: string; name: string; size: string;
  tariff: string; bookings: number; unitDays: number;
};
export type ReportData = {
  period: ReportPeriod;
  received: number; refunded: number; net: number; transactions: number; paidBookings: number;
  averagePaidBooking: number;
  bookingCount: number; inventoryUnits: number;
  occupiedUnitDays: number; capacityUnitDays: number; utilizationPercent: number;
  days: CashDay[]; methods: CashMethod[]; categories: CategoryReport[];
  popular: PopularEquipment[];
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MS_DAY = 86_400_000;
function dateTime(value: string) {
  if (!DATE.test(value)) return NaN;
  const ms = Date.parse(value + "T00:00:00.000Z");
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== value) return NaN;
  return ms;
}

export function parseReportPeriod(params: { from?: string; to?: string }, today = getBelgradeDate()): ReportPeriod | null {
  const first = today.slice(0, 7) + "-01";
  const monthEnd = new Date(Date.UTC(Number(today.slice(0,4)),Number(today.slice(5,7)),0)).toISOString().slice(0,10);
  const from = params.from ?? first;
  const to = params.to ?? monthEnd;
  const a = dateTime(from), b = dateTime(to);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a > b) return null;
  const days = Math.round((b - a) / MS_DAY) + 1;
  if (days < 1 || days > 366) return null;
  return { from, to, days };
}

export function buildDays(period: ReportPeriod): CashDay[] {
  const start = dateTime(period.from);
  return Array.from({ length: period.days }, (_, i) => ({
    day: new Date(start + i * MS_DAY).toISOString().slice(0, 10),
    received: 0, refunded: 0, net: 0,
  }));
}

export function utilizationPercent(occupied: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.round((occupied * 1000) / capacity) / 10;
}

type DailyMoneyQuery = {
  day: string; kind: "PAYMENT" | "REFUND"; method: CashMethod["method"];
  amount: bigint; count: bigint;
};
type CategoryQuery = { tariff: string; rentals: bigint; unitDays: bigint };
type ItemQuery = {
  equipmentId: string; code: string; name: string; size: string; tariff: string;
  bookings: bigint; unitDays: bigint;
};
type DistinctQuery = { paidBookings: bigint };
const int = (n: bigint | number | null) => Number(n ?? 0);

export async function loadReportData(period: ReportPeriod): Promise<ReportData> {
  const db = getDb();
  const { from, to, days: dayCount } = period;
  const [money, paid, categoryDays, items, inventory, bookingCount] = await Promise.all([
    db.$queryRaw<DailyMoneyQuery[]>`
      SELECT (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Belgrade')::date::text AS "day",
        kind::text AS "kind", method::text AS "method",
        SUM(amount)::bigint AS "amount", COUNT(*)::bigint AS "count"
      FROM "Payment"
      WHERE "createdAt" >= ((${from}::date::timestamp AT TIME ZONE 'Europe/Belgrade') AT TIME ZONE 'UTC')
        AND "createdAt" < (((${to}::date + INTERVAL '1 day')::timestamp AT TIME ZONE 'Europe/Belgrade') AT TIME ZONE 'UTC')
      GROUP BY 1, 2, 3
      ORDER BY 1, 2, 3
    `,
    db.$queryRaw<DistinctQuery[]>`
      SELECT COUNT(DISTINCT "bookingId")::bigint AS "paidBookings"
      FROM "Payment"
      WHERE "createdAt" >= ((${from}::date::timestamp AT TIME ZONE 'Europe/Belgrade') AT TIME ZONE 'UTC')
        AND "createdAt" < (((${to}::date + INTERVAL '1 day')::timestamp AT TIME ZONE 'Europe/Belgrade') AT TIME ZONE 'UTC')
        AND kind = 'PAYMENT'
    `,
    db.$queryRaw<CategoryQuery[]>`
      SELECT e.tariff AS "tariff",
        COUNT(DISTINCT b.id)::bigint AS "rentals",
        COALESCE(SUM(LEAST(b."endDate",${to}::date) -
          GREATEST(b."startDate",${from}::date) + 1),0)::bigint AS "unitDays"
      FROM "BookingItem" bi
      JOIN "Booking" b ON b.id = bi."bookingId"
      JOIN "Equipment" e ON e.id = bi."equipmentId"
      WHERE b.status IN ('RESERVED','ISSUED','RETURNED')
        AND b."startDate" <= ${to}::date AND b."endDate" >= ${from}::date
      GROUP BY e.tariff
    `,
    db.$queryRaw<ItemQuery[]>`
      SELECT e.id AS "equipmentId",e.code,e.name,e.size,e.tariff,
        COUNT(DISTINCT b.id)::bigint AS "bookings",
        COALESCE(SUM(LEAST(b."endDate",${to}::date) -
          GREATEST(b."startDate",${from}::date) + 1),0)::bigint AS "unitDays"
      FROM "BookingItem" bi
      JOIN "Booking" b ON b.id=bi."bookingId"
      JOIN "Equipment" e ON e.id=bi."equipmentId"
      WHERE b.status IN ('RESERVED','ISSUED','RETURNED')
        AND b."startDate" <= ${to}::date AND b."endDate" >= ${from}::date
      GROUP BY e.id,e.code,e.name,e.size,e.tariff
      ORDER BY "unitDays" DESC, "bookings" DESC,e.name,e.code
      LIMIT 12
    `,
    db.equipment.groupBy({ by: ["tariff", "status"], _count: { _all: true } }),
    db.booking.count({
      where: {
        status: { in: ["RESERVED","ISSUED","RETURNED"] },
        startDate: { lte: new Date(to + "T00:00:00.000Z") },
        endDate: { gte: new Date(from + "T00:00:00.000Z") },
      },
    }),
  ]);

  const allDays = buildDays(period);
  const byDay = new Map(allDays.map(row => [row.day, row]));
  const methods: CashMethod[] = (["CASH","CARD","TRANSFER"] as const).map(method => ({
    method, received: 0, refunded: 0, net: 0,
  }));
  const byMethod = new Map(methods.map(row => [row.method, row]));
  let transactions = 0;
  for (const row of money) {
    const amount = int(row.amount);
    transactions += int(row.count);
    const day = byDay.get(row.day);
    const method = byMethod.get(row.method);
    if (!day || !method) continue;
    if (row.kind === "PAYMENT") { day.received += amount; method.received += amount; }
    else { day.refunded += amount; method.refunded += amount; }
  }
  for (const day of allDays) day.net = day.received - day.refunded;
  for (const method of methods) method.net = method.received - method.refunded;
  const received = methods.reduce((sum,item)=>sum+item.received,0);
  const refunded = methods.reduce((sum,item)=>sum+item.refunded,0);

  // Historical archived rental activity still counts until deliberately purged.
  // Today's active-inventory denominator makes past utilization an estimate.
  const capacity = new Map<string,number>();
  for (const item of inventory) {
    if (item.status !== "ARCHIVED") capacity.set(item.tariff,(capacity.get(item.tariff) ?? 0) + item._count._all);
  }
  const occupancy = new Map(categoryDays.map(item => [item.tariff,item]));
  const keys = new Set([...capacity.keys(),...occupancy.keys()]);
  const categories: CategoryReport[] = Array.from(keys,tariff=>{
    const group = occupancy.get(tariff);
    const units = capacity.get(tariff) ?? 0;
    const unitDays = int(group?.unitDays ?? 0);
    const capacityDays = units * dayCount;
    return {
      tariff, category: getTariff(tariff)?.category ?? "equipment",
      rentals: int(group?.rentals ?? 0), units, unitDays, capacityDays,
      utilization: utilizationPercent(unitDays,capacityDays),
    };
  }).sort((a,b)=>b.unitDays-a.unitDays || a.tariff.localeCompare(b.tariff));
  const inventoryUnits = categories.reduce((sum,row)=>sum+row.units,0);
  const occupiedUnitDays = categories.reduce((sum,row)=>sum+row.unitDays,0);
  const capacityUnitDays = inventoryUnits * dayCount;
  const popular = items.map(item=>({
    equipmentId:item.equipmentId,code:item.code,name:item.name,size:item.size,
    tariff:item.tariff, bookings:int(item.bookings),unitDays:int(item.unitDays),
  }));
  const paidBookings = int(paid[0]?.paidBookings ?? 0);
  return {
    period, received, refunded, net:received-refunded, transactions, paidBookings,
    averagePaidBooking:paidBookings ? Math.round((received-refunded)/paidBookings) : 0,
    bookingCount, inventoryUnits, occupiedUnitDays, capacityUnitDays,
    utilizationPercent:utilizationPercent(occupiedUnitDays,capacityUnitDays),
    days:allDays, methods, categories, popular,
  };
}
