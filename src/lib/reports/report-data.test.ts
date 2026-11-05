import assert from "node:assert/strict";
import test from "node:test";
import { buildDays, parseReportPeriod, utilizationPercent } from "./report-data";

test("report periods validate real inclusive dates, leap years and a 366-day limit",()=>{
  assert.deepEqual(parseReportPeriod({from:"2028-02-28",to:"2028-03-01"},"2028-02-28"),{
    from:"2028-02-28",to:"2028-03-01",days:3,
  });
  assert.equal(parseReportPeriod({from:"2027-02-30",to:"2027-03-03"}),null);
  assert.equal(parseReportPeriod({from:"2027-12-15",to:"2027-12-14"}),null);
  assert.equal(parseReportPeriod({from:"2027-01-01",to:"2028-12-31"}),null);
  const defaults = parseReportPeriod({},"2026-11-05");
  assert.deepEqual(defaults,{from:"2026-11-01",to:"2026-11-30",days:30});
});

test("daily buckets are DST-safe UTC calendar days",()=>{
  assert.deepEqual(buildDays({from:"2027-03-27",to:"2027-03-30",days:4}).map(x=>x.day),
    ["2027-03-27","2027-03-28","2027-03-29","2027-03-30"]);
});

test("utilization denominator is safe for empty catalogs",()=>{
  assert.equal(utilizationPercent(0,0),0);
  assert.equal(utilizationPercent(12,30),40);
  assert.equal(utilizationPercent(1,3),33.3);
});
