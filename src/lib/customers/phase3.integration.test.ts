import "dotenv/config";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import test from "node:test";

import {getDb} from "@/lib/db";
import {createBookingRecord,BookingError} from "@/lib/bookings/repository";
import {changeBookingStatusRecord} from "@/lib/bookings/status-repository";
import {savePaymentRecord} from "@/lib/payments/repository";
import {recordEquipmentInspection,MaintenanceError} from "@/lib/equipment/maintenance-repository";
import {mergeCustomerRecords,CustomerMergeError} from "./merge-repository";

test("real PostgreSQL: inspected return and merge clients retain rentals and payments",{
  skip:process.env.CI_TEST_DATABASE_URL!=="1",
},async()=>{
  const db=getDb();const token=randomUUID();
  const actor="phase3-"+token;
  let sourceId="";let targetId="";let gearId="";const bookings:string[]=[];
  try {
    await db.user.create({data:{id:actor,name:"Phase 3 CI",email:"phase3-"+token+"@example.invalid"}});
    const source=await db.customer.create({data:{name:"Duplicate",phone:"",notes:"Old notes"}});
    const target=await db.customer.create({data:{name:"Primary",phone:"",notes:"Main notes"}});
    sourceId=source.id;targetId=target.id;
    const gear=await db.equipment.create({data:{
      code:"CI3-"+token.slice(0,12).toUpperCase(),name:"Phase3 board",size:"159",tariff:"board-premium",
      dailyRate:2000,status:"READY",
    }});gearId=gear.id;
    const values={
      customerId:sourceId,startDate:"2027-04-12",endDate:"2027-04-13",travelDay:false,
      discountPercent:0,discountFixed:0,notes:"from duplicate",
      items:[{equipmentId:gearId,complimentary:false}],
    };
    const bookingId=await createBookingRecord(values,actor);bookings.push(bookingId);
    const paymentId=await savePaymentRecord({
      bookingId,version:1,requestId:randomUUID(),kind:"PAYMENT",method:"CASH",amount:1000,note:"CI payment",
    },actor);

    await changeBookingStatusRecord(bookingId,2,"issue",actor,values.startDate);
    const duringIssue=await db.equipment.findUniqueOrThrow({where:{id:gearId}});
    await assert.rejects(
      recordEquipmentInspection({equipmentId:gearId,version:duringIssue.version,kind:"INSPECTION",condition:"OK",note:""},actor),
      (e:unknown)=>e instanceof MaintenanceError&&e.code==="issued",
    );
    await changeBookingStatusRecord(bookingId,3,"return",actor,values.endDate);
    const afterReturn=await db.equipment.findUniqueOrThrow({where:{id:gearId}});
    assert.equal(afterReturn.status,"MAINTENANCE");
    assert.equal(await db.equipmentMaintenance.count({where:{equipmentId:gearId}}),2);
    await assert.rejects(
      createBookingRecord({...values,startDate:"2027-04-14",endDate:"2027-04-15"},actor),
      (e:unknown)=>e instanceof BookingError&&e.code==="equipmentUnavailable",
    );

    await recordEquipmentInspection({equipmentId:gearId,version:afterReturn.version,kind:"INSPECTION",condition:"OK",note:"Крепления проверены"},actor);
    assert.equal((await db.equipment.findUniqueOrThrow({where:{id:gearId}})).status,"READY");
    assert.equal(await db.equipmentMaintenance.count({where:{equipmentId:gearId}}),3);
    const moved=await mergeCustomerRecords({
      sourceId,sourceVersion:source.version,targetId,targetVersion:target.version,
    },actor);
    assert.equal(moved,1);
    assert.equal((await db.customer.findUniqueOrThrow({where:{id:sourceId}})).mergedIntoId,targetId);
    const history=await db.booking.findUniqueOrThrow({where:{id:bookingId},include:{payments:true,events:true,items:true}});
    assert.equal(history.customerId,targetId);
    assert.equal(history.payments.length,1);
    assert.equal(history.payments[0].id,paymentId);
    assert.equal(history.items.length,1);
    assert.ok(history.events.some(e=>e.kind==="CUSTOMER_MERGED"));
    assert.equal(await db.customerMerge.count({where:{sourceId,targetId}}),1);
    await assert.rejects(mergeCustomerRecords({
      sourceId,sourceVersion:source.version,targetId,targetVersion:target.version,
    },actor),(e:unknown)=>e instanceof CustomerMergeError&&["conflict","alreadyMerged"].includes(e.code));
    await assert.rejects(createBookingRecord({
      ...values,startDate:"2027-04-16",endDate:"2027-04-17",
    },actor),(e:unknown)=>e instanceof BookingError&&e.code==="customerMissing");
  }finally{
    if(bookings.length){
      const where={bookingId:{in:bookings}};
      await db.payment.deleteMany({where});
      await db.bookingEvent.deleteMany({where});
      await db.bookingItem.deleteMany({where});
      await db.booking.deleteMany({where:{id:{in:bookings}}});
    }
    if(gearId){
      await db.equipmentMaintenance.deleteMany({where:{equipmentId:gearId}});
      await db.equipment.deleteMany({where:{id:gearId}});
    }
    if(sourceId&&targetId){
      await db.customerMerge.deleteMany({where:{sourceId,targetId}});
      await db.customer.deleteMany({where:{id:sourceId}});
      await db.customer.deleteMany({where:{id:targetId}});
    }
    await db.user.deleteMany({where:{id:actor}});
    await db.$disconnect();
  }
});
