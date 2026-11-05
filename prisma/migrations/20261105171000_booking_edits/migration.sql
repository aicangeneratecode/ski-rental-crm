-- Log revisions and extensions without modifying payment history.
ALTER TYPE "BookingEventKind" ADD VALUE IF NOT EXISTS 'UPDATED';
ALTER TYPE "BookingEventKind" ADD VALUE IF NOT EXISTS 'EXTENDED';
ALTER TABLE "BookingEvent" ADD COLUMN "details" VARCHAR(2000) NOT NULL DEFAULT '';
