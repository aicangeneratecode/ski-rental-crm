import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { getTariff, tariffs, type TariffCode } from "./tariffs";
import { z } from "zod";

const tariffCodes = tariffs.map(item => item.code) as [TariffCode, ...TariffCode[]];
export const rateInputSchema = z.object({
  code: z.enum(tariffCodes),
  rate: z.union([z.number().int().min(0).max(1_000_000), z.null()]),
  version: z.number().int().nonnegative(),
  applyToReady: z.boolean().default(false),
}).refine(v => !(v.applyToReady && v.rate === null));

export type TariffRateRow = {
  code: TariffCode;
  category: (typeof tariffs)[number]["category"];
  rate: number | null;
  version: number;
  custom: boolean;
};

export type TariffFailure = "conflict" | "invalid";
export class TariffUpdateError extends Error {
  constructor(public readonly code: TariffFailure) { super(code); }
}

export async function readTariffRates(): Promise<TariffRateRow[]> {
  const saved = await getDb().tariffRate.findMany({
    select: { code: true, rate: true, version: true },
  });
  const byCode = new Map(saved.map(item => [item.code, item]));
  return tariffs.map(item => ({
    code: item.code, category: item.category,
    rate: byCode.get(item.code)?.rate ?? (byCode.has(item.code) ? null : item.rate),
    version: byCode.get(item.code)?.version ?? 0,
    custom: byCode.has(item.code),
  }));
}

export async function readTariffRateMap(): Promise<Record<string, number | null>> {
  return Object.fromEntries((await readTariffRates()).map(item => [item.code, item.rate]));
}

export async function updateTariffRate(
  input: z.infer<typeof rateInputSchema>, actorId: string,
): Promise<number> {
  const found = getTariff(input.code);
  if (!found) throw new TariffUpdateError("invalid");
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await getDb().$transaction(async tx => {
        const previous = await tx.tariffRate.findUnique({
          where: { code: input.code },
          select: { rate: true, version: true },
        });
        if (previous?.version ?? 0 !== input.version) {
          throw new TariffUpdateError("conflict");
        }
        if (previous) {
          const updated = await tx.tariffRate.updateMany({
            where: { code: input.code, version: input.version },
            data: { rate: input.rate, version: { increment: 1 } },
          });
          if (updated.count !== 1) throw new TariffUpdateError("conflict");
        } else {
          await tx.tariffRate.create({ data: { code: input.code, rate: input.rate } });
        }
        let affected = 0;
        if (input.applyToReady && input.rate !== null) {
          const result = await tx.equipment.updateMany({
            where: {
              tariff: input.code,
              status: "READY",
              bookingItems: { none: { booking: { status: "ISSUED" } } },
            },
            data: { dailyRate: input.rate, version: { increment: 1 } },
          });
          affected = result.count;
        }
        await tx.tariffChange.create({
          data: {
            code: input.code,
            actorId,
            previousRate: previous ? previous.rate : found.rate,
            newRate: input.rate,
            affectedItems: affected,
          },
        });
        return affected;
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 15000,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2034" || error.code === "P2002")) {
        if (attempt < 2) continue;
        throw new TariffUpdateError("conflict");
      }
      throw error;
    }
  }
  throw new TariffUpdateError("conflict");
}
