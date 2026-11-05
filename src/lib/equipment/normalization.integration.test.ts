import "dotenv/config";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import test from "node:test";

import { getDb } from "@/lib/db";

const migrationPath = resolve(
  "prisma/migrations/20261105191500_normalize_legacy_inventory/migration.sql",
);

test("real PostgreSQL: old inventory codes and matching size suffixes update atomically and only once", {
  skip: process.env.CI_TEST_DATABASE_URL !== "1",
}, async () => {
  const db = getDb();
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  const suffix = randomUUID().slice(0, 6).toUpperCase();
  const items = [
    { code:"TRLEG26-0064", name:"Salomon Super 8 160", size:"160 см", expectedCode:"0064", expectedName:"Salomon Super 8" },
    { code:"TRLEG26-0065", name:"Vantage X80 166 cm", size:"166 см", expectedCode:"0065", expectedName:"Vantage X80" },
    { code:"TRLEG26-0066", name:"Hawx Prime R85 26/26.5", size:"26/26.5", expectedCode:"0066", expectedName:"Hawx Prime R85" },
    { code:"TRLEG26-0067", name:"Salomon Sight 158W", size:"158W см", expectedCode:"0067", expectedName:"Salomon Sight" },
    { code:"TRLEG26-0068", name:"Nordica 30 - 31", size:"31", expectedCode:"0068", expectedName:"Nordica 30 - 31" },
    { code:"TRLEG26-0069", name:"Burton 162w Custom", size:"162w см", expectedCode:"0069", expectedName:"Burton 162w Custom" },
    { code:"TEST-"+suffix, name:"Atomic Redster X7 176", size:"176 см", expectedCode:"TEST-"+suffix, expectedName:"Atomic Redster X7" },
  ];
  const ids: string[] = [];
  const sql = await readFile(migrationPath, "utf8");

  async function runMigration() {
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  try {
    await client.connect();
    for (const item of items) {
      const saved = await db.equipment.create({ data: {
        code:item.code, name:item.name, size:item.size,
        tariff:"ski-premium",dailyRate:2000,status:"READY",
      } });
      ids.push(saved.id);
    }
    await runMigration();
    const updated = await db.equipment.findMany({ where:{id:{in:ids}} });
    for (const item of items) {
      const row = updated.find(r => r.code === item.expectedCode);
      assert.ok(row, "code: " + item.expectedCode);
      assert.equal(row.name, item.expectedName);
      assert.equal(row.size, item.size);
      assert.equal(row.dailyRate, 2000);
      assert.equal(row.status, "READY");
      assert.equal(row.version, item.expectedName !== item.name || item.code !== item.expectedCode ? 2 : 1);
    }
    const revisions = new Map(updated.map(item=>[item.id,item.version]));
    await runMigration();
    const repeated = await db.equipment.findMany({where:{id:{in:ids}}});
    for (const row of repeated) assert.equal(row.version,revisions.get(row.id), "migration must be idempotent");

    const source = await db.equipment.create({data:{
      code:"TRLEG26-0200",name:"Salomon Lotus 155",size:"155 см",tariff:"board-premium",dailyRate:2000,
    }});
    const conflict = await db.equipment.create({data:{
      code:"0200",name:"Other equipment",size:"150 см",tariff:"board-premium",dailyRate:2000,
    }});
    ids.push(source.id,conflict.id);
    await assert.rejects(runMigration(),/INVENTORY_CODE_CONFLICT/);
    const after = await db.equipment.findUniqueOrThrow({where:{id:source.id}});
    assert.equal(after.code,"TRLEG26-0200");
    assert.equal(after.name,"Salomon Lotus 155");
    assert.equal(after.version,1);
  } finally {
    if (ids.length) await db.equipment.deleteMany({where:{id:{in:ids}}});
    await db.$disconnect();
    await client.end().catch(()=>{});
  }
});
