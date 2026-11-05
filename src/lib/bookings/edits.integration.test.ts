import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { getDb } from "@/lib/db";
import { BookingError, createBookingRecord } from "./repository";
import { updateBookingRecord } from "./update-repository";
import { savePaymentRecord } from "@/lib/payments/repository";
import { changeBookingStatusRecord } from "./status-repository";

test("real PostgreSQL: modify reservation, swap equipment, extend issued rental, preserve payments", {
  skip: process.env.CI_TEST_DATABASE_URL !== "1",
}, async () => {
  const db = getDb();
  const token = randomUUID();
  const actorId = "edit-ci-" + token;
  const clients: string[] = [];
  const inventory: string[] = [];
  const bookingIds: string[] = [];
  try {
    await db.user.create({ data: {
      id: actorId,
      name: "Booking edit integration user",
      email: "edit-" + token + "@example.invalid",
    } });
    for (const name of ["First test customer", "Second test customer"]) {
      const client = await db.customer.create({ data: { name, phone: "", notes: "" } });
      clients.push(client.id);
    }
    for (const [index, price] of [2000, 500, 400].entries()) {
      const item = await db.equipment.create({ data: {
        code: "EDIT" + token.slice(0, 8).toUpperCase() + index,
        name: "Test equipment " + index,
        tariff: index === 0 ? "ski-premium" : "helmet",
        size: "M",
        status: "READY",
        dailyRate: price,
      } });
      inventory.push(item.id);
    }

    const initial = {
      customerId: clients[0],
      startDate: "2027-03-10",
      endDate: "2027-03-11",
      travelDay: false,
      discountPercent: 0,
      discountFixed: 0,
      notes: "Initial",
      items: [{ equipmentId: inventory[0], complimentary: false }],
    };
    const mainId = await createBookingRecord(initial, actorId);
    bookingIds.push(mainId);
    await db.equipment.update({
      where: { id: inventory[0] },
      data: { dailyRate: 3000 },
    });

    await savePaymentRecord({
      bookingId: mainId, version: 1, requestId: randomUUID(),
      kind: "PAYMENT", method: "CASH", amount: 1000, note: "Initial payment",
    }, actorId);
    const afterPayment = await db.booking.findUniqueOrThrow({ where: { id: mainId } });
    assert.equal(afterPayment.version, 2);

    await assert.rejects(
      updateBookingRecord({
        id: mainId, version: 2,
        values: { ...initial, discountPercent: 100 },
      }, actorId, "2027-03-10"),
      (error: unknown) => error instanceof BookingError && error.code === "refundRequired",
    );
    assert.equal((await db.booking.findUniqueOrThrow({ where: { id: mainId } })).version, 2);

    const changed = {
      ...initial,
      customerId: clients[1],
      endDate: "2027-03-12",
      discountFixed: 1000,
      notes: "New customer, extra item, three days",
      items: [
        { equipmentId: inventory[0], complimentary: false },
        { equipmentId: inventory[1], complimentary: false },
      ],
    };
    await updateBookingRecord({ id: mainId, version: 2, values: changed }, actorId, "2027-03-10");

    let booking = await db.booking.findUniqueOrThrow({
      where: { id: mainId },
      include: { items: true, payments: true, events: true },
    });
    assert.equal(booking.version, 3);
    assert.equal(booking.customerId, clients[1]);
    assert.equal(booking.paidDays, 3);
    assert.equal(booking.subtotal, 7500);
    assert.equal(booking.discountAmount, 1000);
    assert.equal(booking.total, 6500);
    assert.equal(booking.items.length, 2);
    assert.equal(booking.items.find((item) => item.equipmentId === inventory[0])?.dailyRate, 2000);
    assert.equal(booking.items.find((item) => item.equipmentId === inventory[1])?.dailyRate, 500);
    assert.equal(booking.payments.length, 1);
    assert.equal(booking.events.find((event) => event.bookingVersion === booking.version)?.kind, "EXTENDED");

    const reservedOther = await createBookingRecord({
      ...initial,
      startDate: "2027-03-13",
      endDate: "2027-03-14",
      items: [{ equipmentId: inventory[1], complimentary: false }],
    }, actorId);
    bookingIds.push(reservedOther);
    await assert.rejects(
      updateBookingRecord({
        id: mainId, version: 3,
        values: { ...changed, endDate: "2027-03-13" },
      }, actorId, "2027-03-10"),
      (error: unknown) => error instanceof BookingError && error.code === "datesUnavailable",
    );
    assert.equal((await db.booking.findUniqueOrThrow({ where: { id: mainId } })).version, 3);

    await changeBookingStatusRecord(reservedOther, 1, "cancel", actorId, "2027-03-10");
    await changeBookingStatusRecord(mainId, 3, "issue", actorId, "2027-03-10");

    await assert.rejects(
      updateBookingRecord({
        id: mainId, version: 4,
        values: { ...changed, customerId: clients[0], endDate: "2027-03-13" },
      }, actorId, "2027-03-10"),
      (error: unknown) => error instanceof BookingError && error.code === "issuedRestriction",
    );

    await updateBookingRecord({
      id: mainId, version: 4,
      values: { ...changed, endDate: "2027-03-13", notes: "Extended after issue" },
    }, actorId, "2027-03-10");

    booking = await db.booking.findUniqueOrThrow({
      where: { id: mainId },
      include: { items: true, payments: true, events: true },
    });
    assert.equal(booking.version, 5);
    assert.equal(booking.status, "ISSUED");
    assert.equal(booking.endDate.toISOString().slice(0, 10), "2027-03-13");
    assert.equal(booking.total, 9000);
    assert.equal(booking.payments.length, 1);
    assert.equal(booking.events.at(-1)?.kind, "EXTENDED");
    assert.match(booking.events.find((event) => event.bookingVersion === booking.version)?.details ?? "", /Даты:/);

    await assert.rejects(
      updateBookingRecord({
        id: mainId, version: 4,
        values: { ...changed, endDate: "2027-03-14" },
      }, actorId, "2027-03-10"),
      (error: unknown) => error instanceof BookingError && error.code === "conflict",
    );

    await changeBookingStatusRecord(mainId, 5, "return", actorId, "2027-03-13");
    assert.equal((await db.booking.findUniqueOrThrow({ where: { id: mainId } })).status, "RETURNED");
  } finally {
    if (bookingIds.length) {
      const where = { bookingId: { in: bookingIds } };
      await db.payment.deleteMany({ where });
      await db.bookingEvent.deleteMany({ where });
      await db.bookingItem.deleteMany({ where });
      await db.booking.deleteMany({ where: { id: { in: bookingIds } } });
    }
    await db.equipmentMaintenance.deleteMany({ where: { equipmentId: { in: inventory } } });
    await db.equipment.deleteMany({ where: { id: { in: inventory } } });
    await db.customer.deleteMany({ where: { id: { in: clients } } });
    await db.user.deleteMany({ where: { id: actorId } });
    await db.$disconnect();
  }
});
