-- Equipment condition history and non-destructive duplicate customer merging.
CREATE TYPE "EquipmentMaintenanceKind" AS ENUM ('CHECK_OUT','CHECK_IN','INSPECTION','SERVICE','DAMAGE');
ALTER TYPE "BookingEventKind" ADD VALUE IF NOT EXISTS 'CUSTOMER_MERGED';

ALTER TABLE "Customer" ADD COLUMN "mergedIntoId" UUID;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_mergedIntoId_fkey"
  FOREIGN KEY ("mergedIntoId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Customer_mergedIntoId_idx" ON "Customer"("mergedIntoId");

CREATE TABLE "EquipmentMaintenance" (
  "id" UUID NOT NULL,
  "equipmentId" UUID NOT NULL,
  "actorId" TEXT NOT NULL,
  "kind" "EquipmentMaintenanceKind" NOT NULL,
  "condition" VARCHAR(30) NOT NULL DEFAULT '',
  "note" VARCHAR(1500) NOT NULL DEFAULT '',
  "bookingId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EquipmentMaintenance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EquipmentMaintenance_equipmentId_fkey"
    FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "EquipmentMaintenance_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "EquipmentMaintenance_equipmentId_createdAt_idx" ON "EquipmentMaintenance"("equipmentId","createdAt");
CREATE INDEX "EquipmentMaintenance_bookingId_idx" ON "EquipmentMaintenance"("bookingId");

CREATE TABLE "CustomerMerge" (
  "id" UUID NOT NULL,
  "sourceId" UUID NOT NULL,
  "targetId" UUID NOT NULL,
  "actorId" TEXT NOT NULL,
  "bookingsMoved" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerMerge_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CustomerMerge_sourceId_fkey"
    FOREIGN KEY ("sourceId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CustomerMerge_targetId_fkey"
    FOREIGN KEY ("targetId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CustomerMerge_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "CustomerMerge_targetId_createdAt_idx" ON "CustomerMerge"("targetId","createdAt");
CREATE INDEX "CustomerMerge_sourceId_idx" ON "CustomerMerge"("sourceId");
