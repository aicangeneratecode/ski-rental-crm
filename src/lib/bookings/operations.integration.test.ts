import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { getDb } from "@/lib/db";
import { createBookingRecord, BookingError } from "./repository";
import { changeBookingStatusRecord, StatusChangeError } from "./status-repository";
import { setBookingArchivedRecord, ArchiveBookingError } from "./archive-repository";
import { savePaymentRecord, PaymentOperationError } from "@/lib/payments/repository";

test("real PostgreSQL: create, issue, payment history, return, archive and restore", {
  skip: process.env.CI_TEST_DATABASE_URL !== "1",
}, async () => {
  const db = getDb();
  const token = randomUUID();
  const actorId = "ci-" + token;
  const equipmentCode = "CI" + token.slice(0, 12).replace(/-/g, "").toUpperCase();
  const bookingIds: string[] = [];
  let customerId: string | undefined;
  let equipmentId: string | undefined;

  try {
    await db.user.create({ data: {
      id: actorId, name: "Database test user", email: token + "@example.invalid", emailVerified: true,
    } });
    const customer = await db.customer.create({ data: {
      name: "Database test client", phone: "", email: "", notes: "",
    } });
    customerId = customer.id;
    const item = await db.equipment.create({ data: {
      code: equipmentCode, name: "Test ski", size: "170", tariff: "ski-premium",
      status: "READY", dailyRate: 2000, notes: "",
    } });
    equipmentId = item.id;

    const values = {
      customerId: customer.id,
      startDate: "2027-01-10",
      endDate: "2027-01-11",
      travelDay: false,
      discountPercent: 0,
      discountFixed: 0,
      notes: "",
      items: [{ equipmentId: item.id, complimentary: false }],
    };
    const bookingId = await createBookingRecord(values, actorId);
    bookingIds.push(bookingId);

    let booking = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });
    assert.equal(booking.status, "RESERVED");
    assert.equal(booking.total, 4000);
    assert.equal(booking.version, 1);

    await assert.rejects(
      changeBookingStatusRecord(bookingId, 1, "issue", actorId, "2027-01-08"),
      (error: unknown) => error instanceof StatusChangeError && error.code === "outsideDates",
    );
    await assert.rejects(
      changeBookingStatusRecord(bookingId, 1, "issue", actorId, "2027-01-09"),
      (error: unknown) => error instanceof StatusChangeError && error.code === "earlyReasonRequired",
    );
    assert.equal((await db.booking.findUniqueOrThrow({ where: { id: bookingId } })).status, "RESERVED");

    await changeBookingStatusRecord(bookingId, 1, "issue", actorId, values.startDate);
    booking = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });
    assert.equal(booking.status, "ISSUED");
    assert.equal(booking.version, 2);

    await assert.rejects(
      createBookingRecord(values, actorId),
      (error: unknown) => error instanceof BookingError && error.code === "datesUnavailable",
    );
    const payment = {
      bookingId,
      version: 2,
      requestId: randomUUID(),
      kind: "PAYMENT" as const,
      method: "CASH" as const,
      amount: 2000,
      note: "integration test",
    };
    const paymentId = await savePaymentRecord(payment, actorId);
    // A repeated network request must not charge a client twice.
    assert.equal(await savePaymentRecord(payment, actorId), paymentId);
    assert.equal(await db.payment.count({ where: { bookingId } }), 1);
    await assert.rejects(
      savePaymentRecord({ ...payment, requestId: randomUUID(), version: 3, amount: 3000 }, actorId),
      (error: unknown) => error instanceof PaymentOperationError && error.code === "overpayment",
    );
    await assert.rejects(
      savePaymentRecord({ ...payment, requestId: randomUUID(), version: 3, kind: "REFUND", amount: 3000 }, actorId),
      (error: unknown) => error instanceof PaymentOperationError && error.code === "refundTooLarge",
    );

    await changeBookingStatusRecord(bookingId, 3, "return", actorId, values.endDate);
    booking = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });
    assert.equal(booking.status, "RETURNED");
    assert.equal(booking.version, 4);

    await setBookingArchivedRecord(bookingId, 4, "archive", actorId);
    booking = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });
    assert.ok(booking.archivedAt);
    assert.equal(booking.version, 5);
    assert.equal(await db.payment.count({ where: { bookingId } }), 1);
    await assert.rejects(
      setBookingArchivedRecord(bookingId, 4, "archive", actorId),
      (error: unknown) => error instanceof ArchiveBookingError && error.code === "conflict",
    );

    await setBookingArchivedRecord(bookingId, 5, "restore", actorId);
    booking = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });
    assert.equal(booking.archivedAt, null);
    assert.equal(booking.version, 6);
    assert.deepEqual(
      (await db.bookingEvent.findMany({
        where: { bookingId }, orderBy: { bookingVersion: "asc" }, select: { kind: true },
      })).map((event) => event.kind),
      ["CREATED", "ISSUED", "RETURNED", "ARCHIVED", "RESTORED"],
    );
    assert.equal(await db.payment.count({ where: { bookingId } }), 1);

    const reserved = await createBookingRecord(values, actorId);
    bookingIds.push(reserved);
    await assert.rejects(
      setBookingArchivedRecord(reserved, 1, "archive", actorId),
      (error: unknown) => error instanceof ArchiveBookingError && error.code === "activeBooking",
    );
    await changeBookingStatusRecord(reserved, 1, "cancel", actorId, values.startDate);
    await setBookingArchivedRecord(reserved, 2, "archive", actorId);
    assert.ok((await db.booking.findUniqueOrThrow({ where: { id: reserved } })).archivedAt);

    // Early issue is a distinct, auditable exception limited to one calendar day.
    const early = await createBookingRecord({
      ...values, startDate: "2027-02-10", endDate: "2027-02-11",
    }, actorId);
    bookingIds.push(early);
    await changeBookingStatusRecord(
      early, 1, "issue", actorId, "2027-02-09",
      "Клиент уезжает на гору вечером",
    );
    const earlyEvent = await db.bookingEvent.findFirstOrThrow({
      where: { bookingId: early, kind: "ISSUED" }, select: { details: true },
    });
    assert.match(earlyEvent.details, /Досрочная выдача/);
    assert.match(earlyEvent.details, /Клиент уезжает/);
    await changeBookingStatusRecord(early, 2, "return", actorId, "2027-02-11");
  } finally {
    if (bookingIds.length) {
      await db.payment.deleteMany({ where: { bookingId: { in: bookingIds } } });
      await db.bookingEvent.deleteMany({ where: { bookingId: { in: bookingIds } } });
      await db.bookingItem.deleteMany({ where: { bookingId: { in: bookingIds } } });
      await db.booking.deleteMany({ where: { id: { in: bookingIds } } });
    }
    if (equipmentId) await db.equipment.deleteMany({ where: { id: equipmentId } });
    if (customerId) await db.customer.deleteMany({ where: { id: customerId } });
    await db.user.deleteMany({ where: { id: actorId } });
    await db.$disconnect();
  }
});
