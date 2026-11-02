CREATE TABLE "Equipment" (
  "id" UUID NOT NULL,
  "code" VARCHAR(40) NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "tariff" VARCHAR(40) NOT NULL,
  "size" VARCHAR(40) NOT NULL,
  "dailyRate" INTEGER NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'READY',
  "notes" VARCHAR(2000) NOT NULL DEFAULT '',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Equipment_dailyRate_check" CHECK ("dailyRate" BETWEEN 0 AND 1000000),
  CONSTRAINT "Equipment_status_check" CHECK ("status" IN ('READY', 'MAINTENANCE', 'ARCHIVED')),
  CONSTRAINT "Equipment_version_check" CHECK ("version" > 0)
);
CREATE UNIQUE INDEX "Equipment_code_key" ON "Equipment"("code");
CREATE INDEX "Equipment_status_tariff_idx" ON "Equipment"("status", "tariff");
