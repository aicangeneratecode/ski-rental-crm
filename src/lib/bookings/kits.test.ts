import assert from "node:assert/strict";
import test from "node:test";
import { kitPartCategory, kitProgress, matchesKitPart } from "./kits";

test("ski kit requires ski, boots and helmet, not random substitutes", () => {
  assert.deepEqual(kitProgress("ski", ["ski-premium", "helmet"]).map((p) => p.selected), [true,false,true]);
  assert.deepEqual(kitProgress("ski", ["ski-extreme", "boots", "helmet"]).map((p) => p.selected), [true,true,true]);
  assert.equal(matchesKitPart("board-extreme", "skis"), false);
  assert.equal(kitPartCategory("helmet"), "protection");
  assert.equal(kitPartCategory("boots"), "equipment");
});

test("snowboard kit accepts all board tariffs and appropriate safety gear", () => {
  assert.deepEqual(kitProgress("snowboard", ["board-premium", "boots", "helmet"]).map((p)=>p.selected),[true,true,true]);
});
