import assert from "node:assert/strict";
import test from "node:test";
import { csvCell } from "./csv";

test("Excel CSV escapes formulas only in text cells, not negative financial numbers",()=>{
  assert.equal(csvCell(-1200),'"-1200"');
  assert.equal(csvCell('=HYPERLINK("bad")'),'"\'=HYPERLINK(""bad"")"');
  assert.equal(csvCell("+1234"),'"\'+1234"');
  assert.equal(csvCell("обычный текст"),'"обычный текст"');
  assert.equal(csvCell("Модель;Размер"),'"Модель;Размер"');
});
