import "dotenv/config";
import { getDb } from "../src/lib/db";
import { classifyDatabaseError, logDatabaseError } from "../src/lib/db-errors";

/**
 * Read-only database diagnostics. Never prints credentials, customer data,
 * SQL values or the full DATABASE_URL.
 */
async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is missing from .env. No database was contacted.");
    process.exitCode = 1;
    return;
  }

  const db = getDb();
  try {
    const [connection] = await db.$queryRaw<
      Array<{ database_name: string; schema_name: string; read_only: string }>
    >`SELECT current_database() AS database_name,
      current_schema() AS schema_name,
      current_setting('transaction_read_only') AS read_only`;

    console.log("Connected to database:", connection.database_name);
    console.log("PostgreSQL schema:", connection.schema_name);
    console.log("Read-only transaction:", connection.read_only);

    const tables = await db.$queryRaw<Array<{ name: string; present: boolean }>>`
      SELECT tbl.name,
        to_regclass(format('%I.%I', current_schema(), tbl.name)) IS NOT NULL AS present
      FROM unnest(ARRAY['Customer', 'Equipment', 'Booking', 'BookingItem',
                        'Payment', 'BookingEvent', 'EquipmentMaintenance', 'CustomerMerge',
                        'TariffRate', 'TariffChange', 'WorkspaceSettings', 'WorkspaceSettingsChange']) AS tbl(name)
    `;

    let missing = false;
    for (const table of tables) {
      console.log(`${table.present ? "OK     " : "MISSING"} ${table.name}`);
      if (!table.present) missing = true;
    }
    if (missing) {
      console.error("\nMissing CRM tables. Run: npm run db:setup");
      process.exitCode = 1;
      return;
    }
    if (connection.read_only === "on") {
      console.error("\nThis database connection is read-only; issue/return/delete require write access.");
      process.exitCode = 1;
      return;
    }

    // Prisma transactions are used for status changes and delete operations.
    // This transaction only reads; it deliberately does not write or lock data.
    await db.$transaction(async (tx) => {
      await tx.booking.findFirst({ select: { id: true } });
      await tx.bookingEvent.findFirst({ select: { id: true, details: true } });
      await tx.payment.count();
      await tx.customer.findFirst({ select: { id: true, mergedIntoId: true } });
      await tx.equipmentMaintenance.count();
      await tx.customerMerge.count();
      await tx.tariffRate.count();
      await tx.tariffChange.count();
      await tx.workspaceSettings.count();
      await tx.workspaceSettingsChange.count();
    });

    console.log("\nTables and transaction queries are reachable. No data was changed.");
    console.log("If write actions still fail, inspect the TOP RIDE database error code in the Next.js server terminal.");
  } catch (error) {
    logDatabaseError("db:doctor", error);
    console.error("Diagnostic result:", classifyDatabaseError(error));
    console.error("Run npm run db:setup if your tables are outdated.");
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

void main();
