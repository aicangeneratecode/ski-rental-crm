import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import type { ReportPeriod } from "./report-data";

export type LedgerFilters = {
  kind: "" | "PAYMENT" | "REFUND";
  method: "" | "CASH" | "CARD" | "TRANSFER";
  query: string;
  cursor: string;
};

export type LedgerRow = {
  id: string; bookingId: string; createdAt: string;
  amount: number; kind: "PAYMENT"|"REFUND"; method: "CASH"|"CARD"|"TRANSFER";
  customerName: string; customerPhone: string; employeeName: string; note: string;
};

type LedgerRaw = Omit<LedgerRow,"createdAt"> & {createdAt:Date};

export type LedgerPage = {
  rows: LedgerRow[]; hasMore: boolean; nextCursor: string | null;
};
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const LIMIT = 50;

function decodeCursor(value: string): {timestamp: Date; id: string} | null {
  if (!value || value.length > 100) return null;
  const sep = value.indexOf("~");
  if (sep<0) return null;
  const rawTime=value.slice(0,sep),id=value.slice(sep+1);
  const timestamp=new Date(rawTime);
  if(!UUID.test(id)||!Number.isFinite(timestamp.getTime())||timestamp.toISOString()!==rawTime) return null;
  return {timestamp,id};
}

export function normalizeLedgerFilters(query:{
  kind?:string;method?:string;query?:string;cursor?:string;
}): LedgerFilters {
  return {
    kind:query.kind==="PAYMENT"||query.kind==="REFUND"?query.kind:"",
    method:["CASH","CARD","TRANSFER"].includes(query.method??"")
      ? query.method as LedgerFilters["method"]:"",
    query:(query.query??"").trim().slice(0,100),
    cursor:decodeCursor(query.cursor??"") ? query.cursor!:"",
  };
}

export async function loadLedgerPage(period: ReportPeriod, filter: LedgerFilters): Promise<LedgerPage> {
  const {from,to}=period;
  const after=decodeCursor(filter.cursor);
  const conditionKind=filter.kind ? Prisma.sql`AND p.kind::text = ${filter.kind}` : Prisma.empty;
  const conditionMethod=filter.method ? Prisma.sql`AND p.method::text = ${filter.method}` : Prisma.empty;
  const conditionSearch=filter.query ? Prisma.sql`
    AND (
      POSITION(LOWER(${filter.query}) IN LOWER(c.name))>0
      OR POSITION(${filter.query} IN c.phone)>0
      OR POSITION(LOWER(${filter.query}) IN LOWER(b.id::text))>0
    )` : Prisma.empty;
  const conditionCursor=after ? Prisma.sql`
    AND (p."createdAt" < ${after.timestamp} OR
      (p."createdAt" = ${after.timestamp} AND p.id < ${after.id}::uuid))`
    : Prisma.empty;
  const rows = await getDb().$queryRaw<LedgerRaw[]>`
    SELECT p.id, p."bookingId" AS "bookingId",
      (p."createdAt" AT TIME ZONE 'UTC') AS "createdAt",
      p.amount,p.kind::text AS kind,p.method::text AS method,p.note,
      c.name AS "customerName",c.phone AS "customerPhone",
      u.name AS "employeeName"
    FROM "Payment" p
    INNER JOIN "Booking" b ON b.id=p."bookingId"
    INNER JOIN "Customer" c ON c.id=b."customerId"
    INNER JOIN "user" u ON u.id=p."createdById"
    WHERE p."createdAt" >= ((${from}::date::timestamp AT TIME ZONE 'Europe/Belgrade') AT TIME ZONE 'UTC')
      AND p."createdAt" < (((${to}::date + INTERVAL '1 day')::timestamp AT TIME ZONE 'Europe/Belgrade') AT TIME ZONE 'UTC')
      ${conditionKind}
      ${conditionMethod}
      ${conditionSearch}
      ${conditionCursor}
    ORDER BY p."createdAt" DESC, p.id DESC
    LIMIT ${LIMIT+1}
  `;
  const visible=rows.slice(0,LIMIT).map(r=>({...r,createdAt:r.createdAt.toISOString()}));
  const last=visible.at(-1);
  return {
    rows:visible, hasMore:rows.length>LIMIT,
    nextCursor:last&&rows.length>LIMIT ? last.createdAt+"~"+last.id : null,
  };
}
