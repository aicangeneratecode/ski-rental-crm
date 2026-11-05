import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { qrMatrix } from "./qr-code";

test("QR generates a scanner-readable version 5 L matrix for inventory links", () => {
  const matrix=qrMatrix("https://topride.rs/q/123e4567-e89b-12d3-a456-426614174000");
  assert.equal(matrix.length,37);
  assert.ok(matrix.every(row=>row.length===37));
  const sha=createHash("sha256")
    .update(matrix.flat().map(value=>value?"1":"0").join(""))
    .digest("hex");
  // Known encoded matrix was verified independently with OpenCV's QR decoder.
  assert.equal(sha,"0567b77eabf725293d75b53da1fdb6fc8734a5968ef520b61d45e2affba318d7");
});

test("QR refuses links that exceed its fixed capacity",()=>{
  assert.throws(()=>qrMatrix("x".repeat(107)),/QR_TOO_LONG/);
});
