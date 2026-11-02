import test from "node:test";
import assert from "node:assert/strict";
import { equipmentSchema, saveEquipmentSchema } from "./schema";
import { tariffs } from "./tariffs";
const valid = {
  code: " ski-001 ",
  name: "Test skis",
  tariff: "ski-premium",
  size: "170",
  dailyRate: 2000,
  status: "READY",
  notes: "",
};
test("normalizes inventory codes and rejects invalid input", () => {
  assert.equal(equipmentSchema.parse(valid).code, "SKI-001");
  for (const change of [
    { code: "" },
    { code: "A B" },
    { name: " " },
    { dailyRate: -1 },
    { dailyRate: 1.5 },
    { dailyRate: NaN },
    { dailyRate: 1000001 },
    { tariff: "unknown" },
    { status: "RENTED" },
  ])
    assert.equal(
      equipmentSchema.safeParse({ ...valid, ...change }).success,
      false,
    );
  assert.equal(
    equipmentSchema.safeParse({ ...valid, dailyRate: 0 }).success,
    true,
  );
});
test("edits require the version originally read by the employee", () => {
  assert.equal(
    saveEquipmentSchema.safeParse({
      id: "00000000-0000-4000-8000-000000000001",
      values: valid,
    }).success,
    false,
  );
  assert.equal(
    saveEquipmentSchema.safeParse({
      id: "00000000-0000-4000-8000-000000000001",
      version: 1,
      values: valid,
    }).success,
    true,
  );
});
test("tariffs are unique and do not apply free bundle rules", () => {
  assert.equal(new Set(tariffs.map((t) => t.code)).size, tariffs.length);
  assert.equal(tariffs.find((t) => t.code === "poles")?.rate, 250);
  assert.equal(tariffs.find((t) => t.code === "bindings")?.rate, 250);
  assert.equal(tariffs.find((t) => t.code === "case")?.rate, null);
});
