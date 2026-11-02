import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getDb } from "../db";
import { saveEquipmentRecord } from "./repository";
test(
  "persists, rejects duplicates and stale edits, archives and restores",
  { skip: !process.env.DATABASE_URL },
  async () => {
    const db = getDb();
    const code = `TEST-${randomUUID().slice(0, 12).toUpperCase()}`;
    const values = {
      code,
      name: "Integration test",
      tariff: "ski-premium",
      size: "170",
      dailyRate: 2000,
      status: "READY",
      notes: "",
    };
    try {
      assert.deepEqual(await saveEquipmentRecord({ values }), { ok: true });
      const item = await db.equipment.findUniqueOrThrow({ where: { code } });
      assert.equal(item.dailyRate, 2000);
      await db.$disconnect();
      assert.equal(
        (await db.equipment.findUniqueOrThrow({ where: { code } })).name,
        values.name,
      );
      assert.deepEqual(
        await saveEquipmentRecord({
          values: { ...values, code: code.toLowerCase() },
        }),
        { ok: false, error: "duplicate" },
      );
      const results = await Promise.all([
        saveEquipmentRecord({
          id: item.id,
          version: item.version,
          values: { ...values, dailyRate: 2500 },
        }),
        saveEquipmentRecord({
          id: item.id,
          version: item.version,
          values: { ...values, dailyRate: 3000 },
        }),
      ]);
      assert.equal(results.filter((r) => r.ok).length, 1);
      assert.equal(
        results.filter((r) => !r.ok && r.error === "conflict").length,
        1,
      );
      const current = await db.equipment.findUniqueOrThrow({ where: { code } });
      assert.deepEqual(
        await saveEquipmentRecord({
          id: item.id,
          version: current.version,
          values: { ...values, status: "ARCHIVED" },
        }),
        { ok: true },
      );
      const archived = await db.equipment.findUniqueOrThrow({
        where: { code },
      });
      assert.equal(archived.status, "ARCHIVED");
      assert.deepEqual(
        await saveEquipmentRecord({
          id: item.id,
          version: archived.version,
          values,
        }),
        { ok: true },
      );
      assert.equal(
        (await db.equipment.findUniqueOrThrow({ where: { code } })).status,
        "READY",
      );
      assert.deepEqual(
        await saveEquipmentRecord({ values: { ...values, dailyRate: -1 } }),
        { ok: false, error: "invalid" },
      );
    } finally {
      await db.equipment.deleteMany({ where: { code } });
      await db.$disconnect();
    }
  },
);
