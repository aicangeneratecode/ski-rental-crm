-- Closed rental archival retains payment entries and event history.
ALTER TABLE "Booking" ADD COLUMN "archivedAt" TIMESTAMP(3);

ALTER TYPE "BookingEventKind" ADD VALUE IF NOT EXISTS 'ARCHIVED';
ALTER TYPE "BookingEventKind" ADD VALUE IF NOT EXISTS 'RESTORED';

CREATE INDEX "Booking_archivedAt_status_idx" ON "Booking"("archivedAt", "status");
