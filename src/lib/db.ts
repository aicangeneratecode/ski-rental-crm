import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
const globalForDb = globalThis as unknown as { rentalDb?: PrismaClient };
export function getDb() {
  const url = process.env.DATABASE_URL_POOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_NOT_CONFIGURED");
  if (!globalForDb.rentalDb) {
    globalForDb.rentalDb = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: url,
        connectionTimeoutMillis: 5000,
        max: 5,
      }),
    });
  }
  return globalForDb.rentalDb;
}
