import assert from "node:assert/strict";
import test from "node:test";

import { canArchiveBookingStatus } from "./policy";

test("only closed or cancelled rentals are eligible for archival", () => {
  assert.equal(canArchiveBookingStatus("RETURNED"), true);
  assert.equal(canArchiveBookingStatus("CANCELLED"), true);
  assert.equal(canArchiveBookingStatus("ISSUED"), false);
  assert.equal(canArchiveBookingStatus("RESERVED"), false);
  assert.equal(canArchiveBookingStatus(""), false);
  assert.equal(canArchiveBookingStatus("unknown"), false);
});
