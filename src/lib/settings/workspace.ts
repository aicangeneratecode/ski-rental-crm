import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { z } from "zod";

export const workspaceInput = z.object({
  version: z.number().int().nonnegative(),
  businessName: z.string().trim().min(2).max(120),
  contactPhone: z.string().trim().max(40),
  contactAddress: z.string().trim().max(250),
  customerNote: z.string().trim().max(1000),
});

export type WorkspaceInput = z.infer<typeof workspaceInput>;
export type WorkspaceSnapshot = WorkspaceInput;
export class WorkspaceError extends Error {
  constructor(public readonly code: "conflict") { super(code); }
}

export async function readWorkspaceSettings(): Promise<WorkspaceSnapshot> {
  const settings = await getDb().workspaceSettings.findUnique({ where: { id: "default" } });
  return {
    version: settings?.version ?? 0,
    businessName: settings?.businessName ?? "TOP RIDE",
    contactPhone: settings?.contactPhone ?? "",
    contactAddress: settings?.contactAddress ?? "",
    customerNote: settings?.customerNote ?? "",
  };
}

export async function writeWorkspaceSettings(input: WorkspaceInput, actorId: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await getDb().$transaction(async tx => {
        const existing = await tx.workspaceSettings.findUnique({
          where: { id: "default" }, select: { version: true },
        });
        if ((existing?.version ?? 0) !== input.version) throw new WorkspaceError("conflict");
        const { version, ...data } = input;
        if (existing) {
          const result = await tx.workspaceSettings.updateMany({
            where: { id: "default", version },
            data: { ...data, version: { increment: 1 } },
          });
          if (result.count !== 1) throw new WorkspaceError("conflict");
        } else {
          await tx.workspaceSettings.create({ data: { id: "default", ...data } });
        }
        await tx.workspaceSettingsChange.create({
          data: { settingsId: "default", actorId },
        });
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000, timeout: 12000,
      });
      return;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2034" || error.code === "P2002")) {
        if (attempt < 2) continue;
        throw new WorkspaceError("conflict");
      }
      throw error;
    }
  }
}
