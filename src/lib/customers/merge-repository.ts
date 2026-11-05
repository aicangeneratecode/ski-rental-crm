import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";

export type MergeErrorCode = "missing" | "conflict" | "same" | "alreadyMerged";
export class CustomerMergeError extends Error {
  constructor(public readonly code: MergeErrorCode) { super(code); this.name = "CustomerMergeError"; }
}

export type MergeInput = {
  sourceId: string; sourceVersion: number;
  targetId: string; targetVersion: number;
};

/**
 * Retain the original customer as a hidden alias, not a deleted record.
 * All bookings keep their IDs, payment rows and equipment associations.
 * Each moved booking receives a revision + audit event.
 */
export async function mergeCustomerRecords(input: MergeInput, actorId: string): Promise<number> {
  if (input.sourceId === input.targetId) throw new CustomerMergeError("same");
  const db = getDb();
  for(let attempt=0;attempt<3;attempt++) {
    try {
      return await db.$transaction(async tx => {
        const [source,target] = await Promise.all([
          tx.customer.findUnique({where:{id:input.sourceId},select:{id:true,name:true,version:true,mergedIntoId:true}}),
          tx.customer.findUnique({where:{id:input.targetId},select:{id:true,name:true,version:true,mergedIntoId:true}}),
        ]);
        if (!source || !target) throw new CustomerMergeError("missing");
        if (source.version !== input.sourceVersion || target.version !== input.targetVersion)
          throw new CustomerMergeError("conflict");
        if (source.mergedIntoId || target.mergedIntoId) throw new CustomerMergeError("alreadyMerged");
        // Keep target stable; merge only a standalone source, not an alias with aliases.
        const aliasCount = await tx.customer.count({where:{mergedIntoId:source.id}});
        if(aliasCount) throw new CustomerMergeError("alreadyMerged");

        const moved = await tx.booking.findMany({
          where:{customerId:source.id},
          select:{id:true,version:true},
          orderBy:{id:"asc"},
        });
        const changedSource = await tx.customer.updateMany({
          where:{id:source.id,version:input.sourceVersion,mergedIntoId:null},
          data:{mergedIntoId:target.id,version:{increment:1}},
        });
        const changedTarget = await tx.customer.updateMany({
          where:{id:target.id,version:input.targetVersion,mergedIntoId:null},
          data:{version:{increment:1}},
        });
        if(changedSource.count!==1||changedTarget.count!==1) throw new CustomerMergeError("conflict");

        for(const booking of moved) {
          const updated = await tx.booking.updateMany({
            where:{id:booking.id,customerId:source.id,version:booking.version},
            data:{customerId:target.id,version:{increment:1}},
          });
          if(updated.count!==1) throw new CustomerMergeError("conflict");
          await tx.bookingEvent.create({
            data:{
              bookingId:booking.id,actorId,kind:"CUSTOMER_MERGED",
              bookingVersion:booking.version+1,
              details:"Клиент объединён с основной карточкой. Исходная карточка сохранена в истории.",
            },
          });
        }
        await tx.customerMerge.create({
          data:{sourceId:source.id,targetId:target.id,actorId,bookingsMoved:moved.length},
        });
        return moved.length;
      },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:5000,timeout:30000});
    } catch(error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        if(attempt<2) continue;
        throw new CustomerMergeError("conflict");
      }
      throw error;
    }
  }
  throw new CustomerMergeError("conflict");
}
