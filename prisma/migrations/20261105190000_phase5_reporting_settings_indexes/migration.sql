-- Editable tariffs and non-financial workspace contact settings.
CREATE TABLE "TariffRate" (
  "code" VARCHAR(40) NOT NULL,
  "rate" INTEGER,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TariffRate_pkey" PRIMARY KEY ("code")
);

CREATE TABLE "TariffChange" (
  "id" UUID NOT NULL,
  "code" VARCHAR(40) NOT NULL,
  "actorId" TEXT NOT NULL,
  "previousRate" INTEGER,
  "newRate" INTEGER,
  "affectedItems" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TariffChange_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TariffChange_code_fkey" FOREIGN KEY ("code") REFERENCES "TariffRate"("code") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TariffChange_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "TariffChange_code_createdAt_idx" ON "TariffChange"("code","createdAt");

CREATE TABLE "WorkspaceSettings" (
  "id" VARCHAR(20) NOT NULL DEFAULT 'default',
  "businessName" VARCHAR(120) NOT NULL DEFAULT 'TOP RIDE',
  "contactPhone" VARCHAR(40) NOT NULL DEFAULT '',
  "contactAddress" VARCHAR(250) NOT NULL DEFAULT '',
  "customerNote" VARCHAR(1000) NOT NULL DEFAULT '',
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkspaceSettingsChange" (
  "id" UUID NOT NULL,
  "settingsId" VARCHAR(20) NOT NULL,
  "actorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkspaceSettingsChange_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WorkspaceSettingsChange_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "WorkspaceSettings"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "WorkspaceSettingsChange_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "WorkspaceSettingsChange_settingsId_createdAt_idx" ON "WorkspaceSettingsChange"("settingsId","createdAt");

-- Target query patterns for payment date ranges and rental history.
CREATE INDEX "Payment_createdAt_kind_method_idx" ON "Payment"("createdAt","kind","method");
CREATE INDEX "Booking_startDate_endDate_status_idx" ON "Booking"("startDate","endDate","status");
CREATE INDEX "Booking_createdAt_id_idx" ON "Booking"("createdAt" DESC,"id" DESC);
CREATE INDEX "BookingItem_equipmentId_bookingId_idx" ON "BookingItem"("equipmentId","bookingId");
CREATE INDEX "Equipment_tariff_status_idx" ON "Equipment"("tariff","status");
CREATE INDEX "Customer_createdAt_id_idx" ON "Customer"("createdAt" DESC,"id" DESC);

-- Every configured rate must remain a non-negative whole RSD amount.
ALTER TABLE "TariffRate" ADD CONSTRAINT "TariffRate_nonnegative_rate_chk"
  CHECK ("rate" IS NULL OR ("rate" BETWEEN 0 AND 1000000));
