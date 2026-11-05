import assert from "node:assert/strict";
import test from "node:test";

import { sortEquipmentRows, toggleEquipmentSort, type EquipmentSortKey } from "./sort";
import type { EquipmentRow } from "./types";

type Sample = Pick<EquipmentRow, "id" | "code" | "name" | "tariff" | "size" | "dailyRate" | "status">;
const rows: Sample[] = [
  { id:"1",code:"B-10",name:"Model 10",tariff:"ski-premium",size:"170",dailyRate:2500,status:"READY" },
  { id:"2",code:"B-2",name:"Model 2",tariff:"boots",size:"42",dailyRate:300,status:"ARCHIVED" },
  { id:"3",code:"B-3",name:"Model 3",tariff:"ski-premium",size:"160",dailyRate:1200,status:"MAINTENANCE" },
];
const labels = {
  tariff:(value: Sample["tariff"])=>value==="boots" ? "Ботинки" : "Лыжи · Premium",
  status:(value: Sample["status"])=>({
    READY:"Готово к выдаче", MAINTENANCE:"На обслуживании", ARCHIVED:"В архиве",
  })[value],
};
const ids = (sorted: Sample[]) => sorted.map(row=>row.id);

test("clicking one header toggles ascending and descending; a new column starts ascending",()=>{
  let sort = toggleEquipmentSort(null,"name");
  assert.deepEqual(sort,{key:"name",direction:"asc"});
  sort = toggleEquipmentSort(sort,"name");
  assert.deepEqual(sort,{key:"name",direction:"desc"});
  sort = toggleEquipmentSort(sort,"dailyRate");
  assert.deepEqual(sort,{key:"dailyRate",direction:"asc"});
});

test("all five equipment columns sort by displayed text or numeric price, both ways",()=>{
  const expected: Record<EquipmentSortKey, string[]> = {
    name:["2","3","1"], // natural numeric model names
    tariff:["2","1","3"], // Russian displayed tariff labels
    size:["2","3","1"], // numeric shoe size and ski height
    dailyRate:["2","3","1"], // numeric RSD, not alphabetic strings
    status:["2","1","3"], // displayed status text
  };
  const expectedDescending: Record<EquipmentSortKey, string[]> = {
    name:["1","3","2"],
    tariff:["1","3","2"], // identical tariff rows retain their relative order
    size:["1","3","2"],
    dailyRate:["1","3","2"],
    status:["3","1","2"],
  };
  for (const key of Object.keys(expected) as EquipmentSortKey[]) {
    const asc = sortEquipmentRows(rows,{key,direction:"asc"},labels);
    const desc = sortEquipmentRows(rows,{key,direction:"desc"},labels);
    assert.deepEqual(ids(asc),expected[key],key+" ascending");
    assert.deepEqual(ids(desc),expectedDescending[key],key+" descending");
  }
});

test("sorting never mutates the filtered source list, preserves equal-value order",()=>{
  const twoRows = [rows[0],{...rows[0],id:"another",code:"B-11"}];
  const sorted=sortEquipmentRows(twoRows,{key:"dailyRate",direction:"desc"},labels);
  assert.deepEqual(ids(sorted),["1","another"]);
  assert.deepEqual(ids(twoRows),["1","another"]);
  assert.notStrictEqual(sorted,twoRows);
  assert.deepEqual(ids(sortEquipmentRows(rows,null,labels)),["1","2","3"]);
});
