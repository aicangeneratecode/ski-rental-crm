/**
 * TOP RIDE legacy importer.
 *
 * The exported customer/inventory data is private: keep JSON on the user's
 * computer, never add it to the Git repository. Dry-run is the default.
 * No bookings, payments, debts, or old inventory statuses are imported.
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { z } from "zod";

import { getDb } from "../src/lib/db";
import { customerSchema } from "../src/lib/customers/schema";
import { equipmentSchema } from "../src/lib/equipment/schema";
import { normalizeEquipmentModelName } from "../src/lib/equipment/normalize-legacy";

const customerSourceSchema = z.object({
  sourceRow: z.number().int().positive(),
  name: z.string(),
  phone: z.string(),
  email: z.string(),
  notes: z.string(),
}).strict();
const inventorySourceSchema = z.object({
  sourceRow: z.number().int().positive(),
  name: z.string(),
  category: z.string(),
  tariff: z.string().nullable(),
  size: z.string(),
  dailyRate: z.number().int().nonnegative().nullable(),
  notes: z.string(),
}).strict();
const sourceSchema = z.object({
  format: z.literal("topride-legacy-import-v1"),
  sourceDate: z.string(),
  customers: z.array(customerSourceSchema),
  equipment: z.array(inventorySourceSchema),
}).strict();

type Source = z.infer<typeof sourceSchema>;
type Plan = {
  customers: Array<{ id: string; name: string; phone: string; email: string; notes: string }>;
  equipment: Array<{ id: string; code: string; name: string; tariff: string; size: string; dailyRate: number; status: "READY"; notes: string }>;
  existingCustomers: number;
  existingEquipment: number;
  matchingCustomers: number;
  matchingEquipment: number;
  unresolved: Array<{ row: number; name: string; reason: string }>;
};

function stableUuid(kind: string, row: number, name: string, other: string): string {
  const bytes = createHash("sha256").update("TOPRIDE/LEGACY/2026/" + kind + "/" + row + "/" + name + "/" + other).digest();
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function customerKey(name: string, phone: string) {
  return `${name.trim().toLocaleLowerCase("ru").replace(/\s+/g, " ")}| ${phone.replace(/\D/g, "")}`;
}
function equipmentKey(name: string, tariff: string, size: string) {
  return [name.trim().toLocaleLowerCase("ru").replace(/\s+/g, " "), tariff, size.trim().toLocaleLowerCase("ru")].join("|");
}
function addPool(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}
function takePool(map: Map<string, number>, key: string) {
  const count = map.get(key) ?? 0;
  if (!count) return false;
  map.set(key, count - 1);
  return true;
}
function uniqueRows(items: Array<{ sourceRow: number }>, group: string) {
  const seen = new Set<number>();
  for (const item of items) {
    if (seen.has(item.sourceRow)) throw new Error(group + ": repeated sourceRow " + item.sourceRow);
    seen.add(item.sourceRow);
  }
}

async function loadSource(path: string): Promise<Source> {
  const text = await readFile(resolve(path), "utf8");
  const result = sourceSchema.safeParse(JSON.parse(text));
  if (!result.success) {
    console.error("Invalid cleaned import JSON:", z.prettifyError(result.error).slice(0, 9000));
    throw new Error("IMPORT_FILE_INVALID");
  }
  uniqueRows(result.data.customers, "customers");
  uniqueRows(result.data.equipment, "equipment");
  return result.data;
}

function validatedData(source: Source) {
  const customers = source.customers.map((row) => {
    const parsed = customerSchema.safeParse({
      name: row.name, phone: row.phone, email: row.email, notes: row.notes,
    });
    if (!parsed.success) throw new Error(`Invalid customer at CSV row ${row.sourceRow}: ${z.prettifyError(parsed.error)}`);
    return { id: stableUuid("customer", row.sourceRow, row.name, row.phone), ...parsed.data };
  });
  const equipment = source.equipment.map((row) => {
    if (row.tariff === null || row.dailyRate === null) {
      return { row, data: null };
    }
    const parsed = equipmentSchema.safeParse({
      code: String(row.sourceRow).padStart(4, "0"),
      name: normalizeEquipmentModelName(row.name, row.size), tariff: row.tariff, size: row.size,
      dailyRate: row.dailyRate, status: "READY", notes: row.notes,
    });
    if (!parsed.success) throw new Error(`Invalid equipment at CSV row ${row.sourceRow}: ${z.prettifyError(parsed.error)}`);
    return { row, data: { id: stableUuid("equipment", row.sourceRow, row.name, row.category), ...parsed.data, status: "READY" as const } };
  });
  return { customers, equipment };
}

type Validated = ReturnType<typeof validatedData>;
type ExistingCustomer = { id: string; name: string; phone: string };
type ExistingEquipment = { id: string; code: string; name: string; tariff: string; size: string };

function buildPlan(validated: Validated, existingCustomers: ExistingCustomer[], existingEquipment: ExistingEquipment[]): Plan {
  const customerIds = new Set(validated.customers.map((c) => c.id));
  const equipmentIds = new Set(validated.equipment.flatMap((item) => item.data ? [item.data.id] : []));
  const existingCustomerIds = new Set(existingCustomers.map((c) => c.id));
  const existingEquipmentIds = new Set(existingEquipment.map((e) => e.id));
  const poolsCustomer = new Map<string, number>();
  const poolsEquipment = new Map<string, number>();

  // Already imported records are reserved for their exact stable source identity.
  // Remaining existing records may match one source row each.
  for (const customer of existingCustomers) if (!customerIds.has(customer.id)) {
    addPool(poolsCustomer, customerKey(customer.name, customer.phone));
  }
  for (const item of existingEquipment) if (!equipmentIds.has(item.id)) {
    addPool(poolsEquipment, equipmentKey(item.name, item.tariff, item.size));
  }

  let matchingCustomers = 0, matchingEquipment = 0;
  const customers: Plan["customers"] = [];
  for (const row of validated.customers) {
    if (existingCustomerIds.has(row.id)) { matchingCustomers++; continue; }
    if (takePool(poolsCustomer, customerKey(row.name, row.phone))) { matchingCustomers++; continue; }
    customers.push(row);
  }

  const equipment: Plan["equipment"] = [];
  const unresolved: Plan["unresolved"] = [];
  const codes = new Map(existingEquipment.map((item) => [item.code, item]));
  for (const { row, data } of validated.equipment) {
    if (!data) {
      unresolved.push({ row: row.sourceRow, name: row.name, reason: "No reliable tariff/category in source" });
      continue;
    }
    if (existingEquipmentIds.has(data.id)) { matchingEquipment++; continue; }
    if (takePool(poolsEquipment, equipmentKey(data.name, data.tariff, data.size))) { matchingEquipment++; continue; }
    const collision = codes.get(data.code);
    if (collision) {
      throw new Error(`Generated code ${data.code} already belongs to a different inventory item. Import halted safely.`);
    }
    equipment.push(data);
  }
  return {
    customers, equipment,
    existingCustomers: existingCustomers.length,
    existingEquipment: existingEquipment.length,
    matchingCustomers, matchingEquipment, unresolved,
  };
}

function displayPlan(source: Source, plan: Plan) {
  const blanks = source.customers.filter((r) => !r.phone).length;
  console.log("\nTOP RIDE — legacy import review");
  console.log("Source clients:             ", source.customers.length);
  console.log("Source inventory:           ", source.equipment.length);
  console.log("Clients without valid phone:", blanks);
  console.log("Existing clients matched:  ", plan.matchingCustomers);
  console.log("Existing inventory matched:", plan.matchingEquipment);
  console.log("New clients to create:     ", plan.customers.length);
  console.log("New inventory to create:   ", plan.equipment.length);
  console.log("Inventory awaiting review: ", plan.unresolved.length);
  console.log("New inventory status:      READY (old statuses discarded)");
  console.log("Existing records:          NEVER overwritten or deleted");
  console.log("Old debts and purchases:   NOT IMPORTED");
  for (const missing of plan.unresolved) console.log(`  REVIEW CSV row ${missing.row}: ${missing.name} — ${missing.reason}`);
  console.log("");
}

async function main() {
  const args = process.argv.slice(2);
  const fileIndex = args.indexOf("--file");
  const file = fileIndex >= 0 ? args[fileIndex + 1] : undefined;
  const apply = args.includes("--apply");
  const validate = args.includes("--validate-only");
  if (!file || (apply && validate)) {
    console.error('Usage: npm run import:legacy -- --file "C:\\Users\\...\\topride_import_clean_2026-11-04.json" [--validate-only | --apply]');
    process.exitCode = 2;
    return;
  }
  const source = await loadSource(file);
  const parsed = validatedData(source);
  const unresolved = parsed.equipment.filter((entry) => !entry.data);
  if (validate) {
    console.log(`Validated ${parsed.customers.length} customers and ${parsed.equipment.length - unresolved.length} inventory items; unresolved ${unresolved.length}.`);
    unresolved.forEach((entry) => console.log(`REVIEW CSV row ${entry.row.sourceRow}: ${entry.row.name}`));
    console.log("No database connection and no writes.");
    return;
  }

  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing; configure your local .env first.");
  const db = getDb();
  try {
    const [customers, equipment] = await Promise.all([
      db.customer.findMany({ select: { id: true, name: true, phone: true } }),
      db.equipment.findMany({ select: { id: true, code: true, name: true, tariff: true, size: true } }),
    ]);
    const plan = buildPlan(parsed, customers, equipment);
    displayPlan(source, plan);
    if (!apply) {
      console.log('DRY RUN: nothing was written. Back up your DB, then add --apply to import.');
      return;
    }
    if (!plan.customers.length && !plan.equipment.length) {
      console.log("Nothing new to insert.");
      return;
    }
    const inserted = await db.$transaction(async (tx) => {
      const customerResult = plan.customers.length
        ? await tx.customer.createMany({ data: plan.customers, skipDuplicates: true })
        : { count: 0 };
      const equipmentResult = plan.equipment.length
        ? await tx.equipment.createMany({ data: plan.equipment, skipDuplicates: true })
        : { count: 0 };
      return { customers: customerResult.count, equipment: equipmentResult.count };
    }, { timeout: 120000, maxWait: 30000 });
    console.log(`IMPORTED: ${inserted.customers} new customers and ${inserted.equipment} new equipment items.`);
    if (plan.unresolved.length) console.log("Unresolved inventory requires a manual category assignment; no entry has been invented.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
