import assert from "node:assert/strict";
import test from "node:test";

import { normalizeEquipmentModelName, normalizeLegacyInventoryCode } from "./normalize-legacy";

test("shorten only legacy four-digit inventory identifiers and preserve leading zeroes", () => {
  assert.equal(normalizeLegacyInventoryCode("TRLEG26-0064"), "0064");
  assert.equal(normalizeLegacyInventoryCode("TRLEG26-0137"), "0137");
  assert.equal(normalizeLegacyInventoryCode("0064"), "0064");
  assert.equal(normalizeLegacyInventoryCode("TRLEG26-ABC1"), "TRLEG26-ABC1");
  assert.equal(normalizeLegacyInventoryCode("ANOTHER-0064"), "ANOTHER-0064");
  assert.equal(normalizeLegacyInventoryCode("TRLEG26-10000"), "TRLEG26-10000");
});

test("remove a repeated ski or snowboard length without deleting the model number", () => {
  assert.equal(normalizeEquipmentModelName("Salomon Super 8 160", "160 см"), "Salomon Super 8");
  assert.equal(normalizeEquipmentModelName("Salomon N Stance 102 183", "183 см"), "Salomon N Stance 102");
  assert.equal(normalizeEquipmentModelName("Atomic Redster X7 176", "176 см"), "Atomic Redster X7");
  assert.equal(normalizeEquipmentModelName("Vantage X80 166 cm", "166 см"), "Vantage X80");
  assert.equal(normalizeEquipmentModelName("Salomon Sight 158W", "158W см"), "Salomon Sight");
  assert.equal(normalizeEquipmentModelName("Ride 147", "147 см"), "Ride");
});

test("remove repeated boot sizes, including decimal comma and size ranges", () => {
  assert.equal(normalizeEquipmentModelName("Ride White HERA 23.5", "23.5"), "Ride White HERA");
  assert.equal(normalizeEquipmentModelName("HAWX 100 blue 27,5", "27.5"), "HAWX 100 blue");
  assert.equal(normalizeEquipmentModelName("Hawx Prime R85 26/26.5", "26/26.5"), "Hawx Prime R85");
  assert.equal(normalizeEquipmentModelName("Nitro 29.0", "29.0"), "Nitro");
});

test("never strip model numbers when sizes do not exactly match", () => {
  assert.equal(normalizeEquipmentModelName("Salomon Super 8 157", "160 см"), "Salomon Super 8 157");
  assert.equal(normalizeEquipmentModelName("Salomon Super 8", "8"), "Salomon Super 8");
  assert.equal(normalizeEquipmentModelName("Nordica 30 - 31", "31"), "Nordica 30 - 31");
  assert.equal(normalizeEquipmentModelName("Burton 162w Custom", "162w см"), "Burton 162w Custom");
  assert.equal(normalizeEquipmentModelName("Burton 25.0 Pink", "25.0"), "Burton 25.0 Pink");
  assert.equal(normalizeEquipmentModelName("HIGHLANDER black M", "M"), "HIGHLANDER black M");
  assert.equal(normalizeEquipmentModelName("Mask Savor white", "Не указан"), "Mask Savor white");
  assert.equal(normalizeEquipmentModelName("Atomic 180", ""), "Atomic 180");
});
