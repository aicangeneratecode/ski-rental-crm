import { Prisma } from "@/generated/prisma/client";

export type DatabaseProblem = "schemaOutdated" | "databaseUnavailable" | "database";

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return;
  return typeof error.code === "string" ? error.code : undefined;
}

export function classifyDatabaseError(error: unknown): DatabaseProblem {
  const code = errorCode(error);
  if (code === "P2021" || code === "P2022") return "schemaOutdated";
  if (["P1001", "P1002", "P1017", "P2024", "ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND"].includes(code ?? "")) {
    return "databaseUnavailable";
  }
  if (error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED") return "databaseUnavailable";
  return "database";
}

/** Log only the error type and code: never include SQL, client data or DATABASE_URL. */
export function logDatabaseError(operation: string, error: unknown) {
  const name = error instanceof Error ? error.name : typeof error;
  const code = errorCode(error) ?? (error instanceof Prisma.PrismaClientInitializationError ? "PRISMA_INIT" : "UNKNOWN");
  console.error("[TOP RIDE database]", { operation, name, code });
}
