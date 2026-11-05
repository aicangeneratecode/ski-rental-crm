import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { getDb } from "@/lib/db";
import { BookingError, createBookingRecord } from "./repository";
import { rescheduleBookingRecord, rescheduleSchema, shiftRentalDates } from "./reschedule-repository";
import { savePaymentRecord } from "@/lib/payments/repository";
import { changeBookingStatusRecord } from "./status-repository";

test("calendar date shifts preserve the inclusive length and validate dates", () => {
  assert.deepEqual(shiftRentalDates("2027-08-10", "2027-08-12", "2027-09-01"),
    { startDate: "2027-09-01", endDate: "2027-09-03" });
  assert.deepEqual(shiftRentalDates("2028-02-28", "2028-02-29", "2028-03-10"),
    { startDate: "2028-03-10", endDate: "2028-03-11" });
  assert.equal(rescheduleSchema.safeParse({ id: randomUUID(), version: 1, startDate: "2027-02-30" }).success, false);
});

test("real PostgreSQL: reserved-only calendar move checks stock, retains payments and records audit", {
  skip: process.env.CI_TEST_DATABASE_URL !== "1",
}, async () => {
  const db = getDb();
  const token = randomUUID();
  const actorId = "move-" + token;
  let customerId = "", equipmentId = "";
  const bookings: string[] = [];
  try {
    await db.user.create({data: {id: actorId,name:"Calendar CI",email:token+"@example.invalid"}});
    const customer = await db.customer.create({data:{name:"Move test",phone:"",notes:""}});
    customerId = customer.id;
    const equipment = await db.equipment.create({data: {
      code:"MOVE"+token.slice(0,9).toUpperCase(), name:"Rental ski",size:"175",
      tariff:"ski-premium",status:"READY",dailyRate:2000,
    }});
    equipmentId = equipment.id;
    const values = {
      customerId, startDate:"2027-08-10",endDate:"2027-08-12",
      travelDay:false,discountPercent:0,discountFixed:500,notes:"booking note",
      items:[{equipmentId,complimentary:false}],
    };
    const main = await createBookingRecord(values,actorId);
    bookings.push(main);
    const other = await createBookingRecord({
      ...values,startDate:"2027-08-20",endDate:"2027-08-21",
    },actorId);
    bookings.push(other);
    const paymentId = await savePaymentRecord({
      bookingId:main,version:1,requestId:randomUUID(),kind:"PAYMENT",
      method:"CASH",amount:1000,note:"calendar test",
    },actorId);
    await assert.rejects(
      rescheduleBookingRecord({id:main,version:2,startDate:"2027-08-20"},actorId),
      (error:unknown)=>error instanceof BookingError && error.code==="datesUnavailable",
    );
    await assert.rejects(
      rescheduleBookingRecord({id:main,version:2,startDate:"2027-08-10"},actorId),
      (error:unknown)=>error instanceof BookingError && error.code==="invalid",
    );
    await rescheduleBookingRecord({id:main,version:2,startDate:"2027-08-14"},actorId);
    const updated=await db.booking.findUniqueOrThrow({where:{id:main},include:{payments:true,events:true,items:true}});
    assert.equal(updated.startDate.toISOString().slice(0,10),"2027-08-14");
    assert.equal(updated.endDate.toISOString().slice(0,10),"2027-08-16");
    assert.equal(updated.status,"RESERVED");
    assert.equal(updated.version,3);
    assert.equal(updated.total,5500);
    assert.equal(updated.items.length,1);
    assert.equal(updated.payments.length,1);
    assert.equal(updated.payments[0].id,paymentId);
    assert.equal(updated.events.find(e=>e.bookingVersion===3)?.kind,"UPDATED");
    await assert.rejects(
      rescheduleBookingRecord({id:main,version:2,startDate:"2027-08-17"},actorId),
      (error:unknown)=>error instanceof BookingError && error.code==="conflict",
    );
    await changeBookingStatusRecord(main,3,"issue",actorId,"2027-08-14");
    await assert.rejects(
      rescheduleBookingRecord({id:main,version:4,startDate:"2027-08-18"},actorId),
      (error:unknown)=>error instanceof BookingError && error.code==="notEditable",
    );
    await changeBookingStatusRecord(main,4,"return",actorId,"2027-08-16");
  } finally {
    if(bookings.length) {
      const where = {bookingId:{in:bookings}};
      await db.payment.deleteMany({where});
      await db.bookingEvent.deleteMany({where});
      await db.bookingItem.deleteMany({where});
      await db.booking.deleteMany({where:{id:{in:bookings}}});
    }
    if(equipmentId){
      await db.equipmentMaintenance.deleteMany({where:{equipmentId}});
      await db.equipment.deleteMany({where:{id:equipmentId}});
    }
    if(customerId) await db.customer.deleteMany({where:{id:customerId}});
    await db.user.deleteMany({where:{id:actorId}});
    await db.$disconnect();
  }
});
