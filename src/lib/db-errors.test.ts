import assert from "node:assert/strict";
import test from "node:test";

import { classifyDatabaseError } from "./db-errors";

test("missing tables and columns require migrations", () => {
  assert.equal(classifyDatabaseError({ code: "P2021" }), "schemaOutdated");
  assert.equal(classifyDatabaseError({ code: "P2022" }), "schemaOutdated");
});
test("connectivity errors have a distinct message", () => {
  for (const code of ["P1001", "P1002", "P1017", "P2024", "ECONNREFUSED", "ETIMEDOUT"]) {
    assert.equal(classifyDatabaseError({ code }), "databaseUnavailable");
  }
  assert.equal(classifyDatabaseError(new Error("DATABASE_NOT_CONFIGURED")), "databaseUnavailable");
});
test("other errors retain generic behavior", () => {
  assert.equal(classifyDatabaseError({ code: "P2002" }), "database");
  assert.equal(classifyDatabaseError(new Error("other")), "database");
});
