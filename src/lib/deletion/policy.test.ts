import assert from "node:assert/strict";
import test from "node:test";

import { isDeletableBookingStatus } from "./policy";

test("only closed or cancelled rentals are eligible for deletion", () => {
  assert.equal(isDeletableBookingStatus("RETURNED"), true);
  assert.equal(isDeletableBookingStatus("CANCELLED"), true);
  assert.equal(isDeletableBookingStatus("ISSUED"), false);
  assert.equal(isDeletableBookingStatus("RESERVED"), false);
  assert.equal(isDeletableBookingStatus(""), false);
  assert.equal(isDeletableBookingStatus("unknown"), false);
});
