import assert from "node:assert/strict";
import test from "node:test";
import { firstAvailableUnit, groupEquipmentFamilies } from "./equipment-families";
import type { BookingEquipment } from "./types";

const make = (id:string,code:string,size:string,status:"READY"|"MAINTENANCE"|"ARCHIVED"="READY",dailyRate=2000):BookingEquipment => ({
  id,code,name:"Atomic Redster",size,tariff:"ski-premium",dailyRate,status,reservations:[],
});

test("group the same model and size without conflating sizes or prices",()=>{
  const result=groupEquipmentFamilies([
    make("a","A-01","170"),
    make("b","A-02","170"),
    make("c","A-03","175"),
    make("d","A-04","170","READY",2200),
  ]);
  assert.equal(result.length,3);
  assert.deepEqual(result.map(x=>x.units.length).sort(),[1,1,2]);
});

test("choose next free matching unit without selecting maintenance, reserved or selected units",()=>{
  const family=groupEquipmentFamilies([
    make("a","A-01","170","MAINTENANCE"),
    make("b","A-02","170"),
    make("c","A-03","170"),
    make("d","A-04","170"),
  ])[0];
  assert.equal(firstAvailableUnit(family,new Set(["c"]),item=>item.id==="b")?.id,"d");
  assert.equal(firstAvailableUnit(family,new Set(["c","d"]),item=>item.id==="b"),undefined);
});
