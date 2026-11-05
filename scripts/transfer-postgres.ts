/**
 * TOP RIDE: guarded full-data PostgreSQL transfer.
 * Always keep the local Docker database and a verified .dump backup.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { parse } from "dotenv";
import { Client } from "pg";

const backupDir = resolve(".topride-private-backups");
const tables = [
  "user", "session", "account", "verification",
  "Customer", "Equipment", "Booking", "BookingItem",
  "Payment", "BookingEvent", "EquipmentMaintenance", "CustomerMerge",
  "TariffRate", "TariffChange", "WorkspaceSettings", "WorkspaceSettingsChange",
] as const;

function parseDbUrl(input: string, source: "local" | "cloud") {
  let uri: URL;
  try { uri = new URL(input); } catch { throw Error("Invalid " + source + " PostgreSQL URL"); }
  if (!["postgres:","postgresql:"].includes(uri.protocol)) throw Error("Expected a direct PostgreSQL connection URI.");
  if (source === "local" && !["localhost","127.0.0.1","[::1]"].includes(uri.hostname))
    throw Error("Local .env must point to the computer's PostgreSQL, not a cloud database.");
  if (source === "cloud" && uri.hostname !== "db.prisma.io")
    throw Error("Target must be direct Prisma Postgres (db.prisma.io), not a local or pooled database.");
  uri.searchParams.delete("schema");
  return uri.toString();
}
function localUrl() {
  const envFile = resolve(".env");
  if (!existsSync(envFile)) throw Error("Local .env missing; cannot find your existing data.");
  const uri = parse(readFileSync(envFile, "utf8")).DATABASE_URL;
  if (!uri) throw Error("Missing DATABASE_URL in local .env.");
  return parseDbUrl(uri, "local");
}
function cloudUrl() {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw Error("Missing production DATABASE_URL. Run via vercel env run -e production.");
  if (!(process.env.BETTER_AUTH_URL ?? "").startsWith("https://ski-rental-crm"))
    throw Error("Wrong production environment: TOP RIDE BETTER_AUTH_URL not found.");
  return parseDbUrl(uri,"cloud");
}
function runDocker(args: string[], env: Record<string,string> = {}) {
  const r=spawnSync("docker",args,{env:{...process.env,...env},stdio:"inherit",shell:false});
  if (r.error) throw Error("Docker unavailable: "+r.error.message);
  if (r.status!==0) throw Error("Docker PostgreSQL command failed with status "+r.status);
}
function archivePath(value: string) {
  if(!value || !value.endsWith(".dump")) throw Error("Expected a private .dump file path.");
  const full=resolve(value);
  if(dirname(full)!==backupDir) throw Error("Backup must be inside .topride-private-backups.");
  if(!existsSync(full) || statSync(full).size<1024) throw Error("Backup file missing or unexpectedly small.");
  return full;
}
function validateArchive(full: string) {
  const r=spawnSync("docker",[
    "run","--rm","--mount","type=bind,source="+backupDir+",target=/out,readonly",
    "postgres:17","pg_restore","--list","/out/"+basename(full),
  ],{env:process.env,encoding:"utf8",maxBuffer:12*1024*1024});
  if (r.error || r.status!==0) throw Error("pg_restore could not verify backup archive.");
  const entries=r.stdout.split("\n");
  for(const name of ["Customer","Equipment","Booking","Payment","user","account"])
    if(!entries.some(row=>row.includes("TABLE DATA public "+name+" ")))
      throw Error("Archive missing essential table "+name+". Do not restore an incomplete backup.");
}
function backup() {
  const local=new URL(localUrl());
  mkdirSync(backupDir,{recursive:true});
  const file="topride-full-"+new Date().toISOString().replace(/[:.]/g,"-")+".dump";
  console.log("Backing up the LOCAL PostgreSQL to a private file; passwords will not be printed.");

  // Prefer pg_dump INSIDE the existing Compose database container.
  // compose.yaml exposes port 5432 only on 127.0.0.1, so trying to
  // reach it via host.docker.internal from another container can fail.
  const compose=spawnSync("docker",["compose","ps","-q","db"],{
    env:process.env,encoding:"utf8",
  });
  const matchesCompose=local.username==="ski_rental" &&
    local.pathname==="/ski_rental" && (!local.port||local.port==="5432");
  if (matchesCompose && compose.status===0 && compose.stdout.trim()) {
    const temp="/tmp/"+file;
    runDocker(["compose","exec","-T","db","pg_dump","-U","ski_rental",
      "-d","ski_rental","--format=custom","--no-owner","--no-privileges","--file="+temp]);
    runDocker(["compose","cp","db:"+temp,join(backupDir,file)]);
    runDocker(["compose","exec","-T","db","rm","-f",temp]);
  } else {
    // Fallback for a different local PostgreSQL server reachable from Docker.
    local.hostname="host.docker.internal";
    runDocker([
      "run","--rm","--mount","type=bind,source="+backupDir+",target=/out",
      "-e","PG_URL","-e","DUMP_FILE","postgres:17","sh","-c",
      'exec pg_dump --dbname="$PG_URL" --format=custom --no-owner --no-privileges --file="/out/$DUMP_FILE"',
    ],{PG_URL:local.toString(),DUMP_FILE:file});
  }
  const path=archivePath(join(backupDir,file));validateArchive(path);
  console.log("Verified complete private backup: "+path);
  console.log("Size: "+statSync(path).size+" bytes. Never share this backup publicly.");
}
async function connect(uri:string) {
  const client=new Client({connectionString:uri,connectionTimeoutMillis:10_000});
  await client.connect();return client;
}
async function counts(client:Client) {
  const result:Record<string,number>={};
  for (const table of tables) {
    const check=await client.query<{present:string|null}>(
      "SELECT to_regclass(format('%I.%I','public',$1))::text AS present",[table]);
    if (!check.rows[0].present) {result[table]=0;continue;}
    const safe=table.replaceAll('"','""');
    const rows=await client.query<{n:string}>('SELECT COUNT(*)::text AS n FROM public."'+safe+'"');
    result[table]=Number(rows.rows[0].n);
  }
  return result;
}
async function withDatabases(action:(local:Client,remote:Client)=>Promise<void>) {
  const local=await connect(localUrl());let remote:Client|undefined;
  try {remote=await connect(cloudUrl());await action(local,remote);}
  finally {await remote?.end();await local.end();}
}
async function restore(fileName:string) {
  const file=archivePath(fileName);validateArchive(file);
  await withDatabases(async(local,cloud)=>{
    const localRows=await counts(local);
    if(!localRows.Customer && !localRows.Equipment && !localRows.Booking)
      throw Error("Source database appears empty. Refusing to overwrite cloud with the wrong source.");
    const r=await cloud.query<{n:string}>(
      "SELECT COUNT(*)::text AS n FROM pg_tables WHERE schemaname = 'public'");
    if(Number(r.rows[0].n)>0)
      throw Error("Cloud already contains tables. STOP: do not reset production or overwrite them.");
    console.log("Local data: "+localRows.Customer+" customers, "+localRows.Equipment+
      " equipment, "+localRows.Booking+" bookings, "+localRows.Payment+" payments.");
    console.log("Cloud destination: db.prisma.io, verified EMPTY; archive: "+basename(file));
  });
  if(!process.stdin.isTTY) throw Error("Production restore requires interactive confirmation.");
  const {createInterface}=await import("node:readline/promises");
  const rl=createInterface({input:process.stdin,output:process.stdout});
  let answer="";
  try {answer=await rl.question("Type RESTORE TOP RIDE to proceed: ");}
  finally {rl.close();}
  if(answer.trim()!=="RESTORE TOP RIDE") throw Error("No confirmation; cloud unchanged.");
  console.log("Restoring all schema and data in ONE transaction.");
  runDocker([
    "run","--rm","--mount","type=bind,source="+backupDir+",target=/out,readonly",
    "-e","DATABASE_URL","-e","DUMP_FILE","postgres:17","sh","-c",
    'exec pg_restore --dbname="$DATABASE_URL" --no-owner --no-privileges --single-transaction --exit-on-error "/out/$DUMP_FILE"',
  ],{DATABASE_URL:cloudUrl(),DUMP_FILE:basename(file)});
  console.log("Restore completed; verify table counts and apply any newer migrations.");
}
async function verify() {
  await withDatabases(async(local,remote)=>{
    const before=await counts(local),after=await counts(remote);
    let mismatch=false;
    for(const name of tables){
      const match=before[name]===after[name];if(!match)mismatch=true;
      console.log((match?"OK ":"DIFF ")+name+": local "+before[name]+", Vercel "+after[name]);
    }
    if(mismatch) throw Error("Some table counts differ. Stop and reconcile before using production.");
    if(!before.Customer && !before.Equipment && !before.Booking)
      throw Error("The selected local database has no rental data.");
    console.log("All table row counts match.");
  });
}
try {
  const command=process.argv[2];
  if(command==="backup")backup();
  else if(command==="restore")await restore(process.argv[3]??"");
  else if(command==="verify")await verify();
  else throw Error("Expected backup, restore [archive] or verify.");
} catch(error){
  console.error("TRANSFER STOPPED: "+(error instanceof Error?error.message:"Unknown error"));
  process.exitCode=1;
}
