import assert from "node:assert/strict";
import test from "node:test";
import { paymentSchema } from "./schema";

const valid = {
  bookingId: "0c8315c9-7043-441e-8d2e-4e172b0f1b11",
  requestId: "4530b745-35e9-4e70-a85f-dad1c65bb3a5",
  version: 1, kind: "PAYMENT", method: "CASH", amount: 2000,
};
test("payment requires positive whole dinars within PostgreSQL Int range", () => {
  for (const amount of [0, -1, 1.5, NaN, Infinity, 2147483648, "2000"]) {
    assert.equal(paymentSchema.safeParse({ ...valid, amount }).success, false);
  }
  assert.equal(paymentSchema.safeParse(valid).success, true);
});
test("payment validates operation identity and concurrency version", () => {
  for (const patch of [{ bookingId: "bad" }, { requestId: "" }, { version: 0 }, { kind: "OTHER" }, { method: "OTHER" }]) {
    assert.equal(paymentSchema.safeParse({ ...valid, ...patch }).success, false);
  }
});
test("refund shares validation and trims its optional comment", () => {
  const result = paymentSchema.parse({ ...valid, kind: "REFUND", note: "  corrected  " });
  assert.equal(result.note, "corrected");
  assert.equal(paymentSchema.parse(valid).note, "");
  assert.equal(paymentSchema.safeParse({ ...valid, note: "a".repeat(1001) }).success, false);
});
