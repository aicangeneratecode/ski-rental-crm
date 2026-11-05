import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { getDb } from "@/lib/db";
import { createBookingRecord } from "@/lib/bookings/repository";
import { savePaymentRecord } from "@/lib/payments/repository";
import { loadReportData, parseReportPeriod } from "@/lib/reports/report-data";
import { loadLedgerPage, normalizeLedgerFilters } from "@/lib/reports/ledger";
import { readTariffRates, updateTariffRate, TariffUpdateError } from "@/lib/equipment/tariff-settings";
import { readWorkspaceSettings, writeWorkspaceSettings, WorkspaceError } from "@/lib/settings/workspace";

test("real PostgreSQL: Belgrade payment dates, refunds, retained tariff pricing and audited settings", {
  skip: process.env.CI_TEST_DATABASE_URL !== "1",
}, async () => {
  const db=getDb();
  const uid=randomUUID(),actor="phase5-"+uid;
  const payments:string[]=[];
  const bookings:string[]=[];
  let customerId="",skiId="",helmetId="";
  try {
    await db.user.create({data:{id:actor,name:"Phase 5 reports",email:uid+"@example.invalid"}});
    const c=await db.customer.create({data:{name:"Report fixture",phone:"",notes:""}});
    customerId=c.id;
    const ski=await db.equipment.create({data:{
      code:"REPORT-"+uid.slice(0,10).toUpperCase(),name:"Report ski",size:"170",
      tariff:"ski-premium",dailyRate:2000,status:"READY",
    }});
    skiId=ski.id;
    const skiBooking=await createBookingRecord({
      customerId,startDate:"2027-02-10",endDate:"2027-02-12",
      travelDay:false,discountPercent:0,discountFixed:0,notes:"",
      items:[{equipmentId:skiId,complimentary:false}],
    },actor);
    bookings.push(skiBooking);
    const paymentId=await savePaymentRecord({
      bookingId:skiBooking,version:1,requestId:randomUUID(),
      kind:"PAYMENT",method:"CASH",amount:1700,note:"Payment test",
    },actor);
    payments.push(paymentId);
    const refundId=await savePaymentRecord({
      bookingId:skiBooking,version:2,requestId:randomUUID(),
      kind:"REFUND",method:"CASH",amount:200,note:"Refund test",
    },actor);
    payments.push(refundId);
    // 23:30Z on February 9 is already February 10 in Belgrade (CET).
    await db.payment.update({where:{id:paymentId},data:{createdAt:new Date("2027-02-09T23:30:00.000Z")}});
    await db.payment.update({where:{id:refundId},data:{createdAt:new Date("2027-02-10T09:30:00.000Z")}});
    const period=parseReportPeriod({from:"2027-02-10",to:"2027-02-10"});
    assert.ok(period);
    const report=await loadReportData(period);
    assert.equal(report.received,1700);
    assert.equal(report.refunded,200);
    assert.equal(report.net,1500);
    assert.equal(report.paidBookings,1);
    assert.equal(report.averagePaidBooking,1500);
    assert.equal(report.methods.find(row=>row.method==="CASH")?.net,1500);
    assert.deepEqual(report.days.map(row=>[row.day,row.received,row.refunded,row.net]),[
      ["2027-02-10",1700,200,1500],
    ]);
    assert.equal(report.bookingCount,1);
    assert.equal(report.categories.find(row=>row.tariff==="ski-premium")?.unitDays,1);
    assert.equal(report.popular.find(row=>row.equipmentId===skiId)?.bookings,1);

    const ledgerFilters=normalizeLedgerFilters({
      kind:"PAYMENT",method:"CASH",query:"Report fixture",
    });
    const first=await loadLedgerPage(period,ledgerFilters);
    assert.equal(first.rows.length,1);
    assert.equal(first.rows[0].id,paymentId);
    assert.equal(first.rows[0].employeeName,"Phase 5 reports");

    // >50 records exercises keyset cursor paging and server-side kind filtering.
    await db.payment.createMany({data:Array.from({length:51},(_,i)=>({
      bookingId:skiBooking,createdById:actor,requestId:randomUUID(),
      kind:"PAYMENT" as const,method:"CASH" as const,amount:1,note:"ledger paging",
      createdAt:new Date(Date.parse("2027-02-10T09:00:00.000Z")-i*60_000),
    }))});
    const ledgerA=await loadLedgerPage(period,ledgerFilters);
    assert.equal(ledgerA.rows.length,50);
    assert.equal(ledgerA.hasMore,true);
    assert.ok(ledgerA.nextCursor);
    const ledgerB=await loadLedgerPage(period,{...ledgerFilters,cursor:ledgerA.nextCursor!});
    assert.equal(ledgerB.rows.length,2);
    assert.equal(ledgerB.hasMore,false);
    assert.equal(new Set([...ledgerA.rows,...ledgerB.rows].map(row=>row.id)).size,52);
    const refunds=await loadLedgerPage(period,normalizeLedgerFilters({
      kind:"REFUND",query:"Report fixture",
    }));
    assert.equal(refunds.rows.length,1);
    assert.equal(refunds.rows[0].id,refundId);


    const initial=(await readTariffRates()).find(row=>row.code==="helmet");
    assert.ok(initial);
    assert.equal(initial.version,0);
    const helmet=await db.equipment.create({data:{
      code:"RATE-"+uid.slice(0,10).toUpperCase(),name:"Rate helmet",size:"M",
      tariff:"helmet",dailyRate:500,status:"READY",
    }});
    helmetId=helmet.id;
    const second=await createBookingRecord({
      customerId,startDate:"2027-04-03",endDate:"2027-04-04",
      travelDay:false,discountPercent:0,discountFixed:0,notes:"",
      items:[{equipmentId:helmetId,complimentary:false}],
    },actor);
    bookings.push(second);
    await updateTariffRate({code:"helmet",rate:725,version:0,applyToReady:false},actor);
    assert.equal((await db.equipment.findUniqueOrThrow({where:{id:helmetId}})).dailyRate,500);
    const affected=await updateTariffRate({code:"helmet",rate:850,version:1,applyToReady:true},actor);
    assert.equal(affected,1);
    assert.equal((await db.equipment.findUniqueOrThrow({where:{id:helmetId}})).dailyRate,850);
    const originalLine=await db.bookingItem.findFirstOrThrow({where:{bookingId:second}});
    assert.equal(originalLine.dailyRate,500);
    assert.equal((await db.booking.findUniqueOrThrow({where:{id:second}})).total,1000);
    await assert.rejects(
      updateTariffRate({code:"helmet",rate:900,version:1,applyToReady:false},actor),
      (e:unknown)=>e instanceof TariffUpdateError && e.code==="conflict",
    );
    assert.equal(await db.tariffChange.count({where:{code:"helmet"}}),2);

    const start=await readWorkspaceSettings();
    assert.equal(start.version,0);
    await writeWorkspaceSettings({...start,businessName:"TOP RIDE TEST",contactPhone:"+381 11 555"},actor);
    const updated=await readWorkspaceSettings();
    assert.equal(updated.businessName,"TOP RIDE TEST");
    assert.equal(updated.contactPhone,"+381 11 555");
    assert.equal(updated.version,1);
    await assert.rejects(
      writeWorkspaceSettings({...start,businessName:"STALE"},actor),
      (e:unknown)=>e instanceof WorkspaceError && e.code==="conflict",
    );
  }finally{
    if(bookings.length)await db.payment.deleteMany({where:{bookingId:{in:bookings}}});
    if(bookings.length) {
      const where={bookingId:{in:bookings}};
      await db.bookingEvent.deleteMany({where});
      await db.bookingItem.deleteMany({where});
      await db.booking.deleteMany({where:{id:{in:bookings}}});
    }
    if(skiId)await db.equipment.deleteMany({where:{id:skiId}});
    if(helmetId)await db.equipment.deleteMany({where:{id:helmetId}});
    await db.tariffChange.deleteMany({where:{code:"helmet"}});
    await db.tariffRate.deleteMany({where:{code:"helmet"}});
    await db.workspaceSettingsChange.deleteMany({where:{settingsId:"default"}});
    await db.workspaceSettings.deleteMany({where:{id:"default"}});
    if(customerId)await db.customer.deleteMany({where:{id:customerId}});
    await db.user.deleteMany({where:{id:actor}});
    await db.$disconnect();
  }
});
