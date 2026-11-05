/**
 * Provision the sole production login without storing plaintext credentials
 * in GitHub, source files, shell history or Vercel build logs.
 *
 * Run ONLY after restoring and verifying the full source PostgreSQL database:
 * npx vercel env run -e production -- npm run owner:setup -- YOUR_EMAIL
 *
 * Other historical users are kept for foreign keys and audit but cannot login.
 */
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { Prisma } from "../src/generated/prisma/client";
import { getDb } from "../src/lib/db";

const email=(process.argv[2]??"").trim().toLowerCase();
function checkTarget() {
  const raw=process.env.DATABASE_URL;
  if(!raw) throw Error("Missing production DATABASE_URL (vercel env run -e production)");
  const uri=new URL(raw);
  if(uri.hostname!=="db.prisma.io") throw Error("Refusing to alter any database except direct Prisma Postgres.");
  if(!(process.env.BETTER_AUTH_URL??"").startsWith("https://ski-rental-crm"))
    throw Error("BETTER_AUTH_URL does not match TOP RIDE production.");
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw Error("Supply a valid owner email.");
}
function hiddenPassword():Promise<string> {
  if(!process.stdin.isTTY || !process.stdin.setRawMode)
    return Promise.reject(Error("Run this command in an interactive PowerShell terminal."));
  return new Promise((resolve,reject)=>{
    let result="";
    const input=process.stdin;
    const wasRaw=input.isRaw??false;
    input.setEncoding("utf8");
    input.setRawMode(true);
    input.resume();
    process.stdout.write("New owner password (not displayed): ");
    const cleanup=()=>{input.off("data",onData);input.setRawMode(wasRaw);input.pause();};
    function onData(chunk:string) {
      for(const char of chunk) {
        if(char==="\u0003"){cleanup();process.stdout.write("\n");reject(Error("Canceled"));return;}
        if(char==="\r"||char==="\n"){cleanup();process.stdout.write("\n");resolve(result);return;}
        if(char==="\u007f"||char==="\b"){result=result.slice(0,-1);continue;}
        if(char.charCodeAt(0)>=32 && result.length<128)result+=char;
      }
    }
    input.on("data",onData);
  });
}

try {
  checkTarget();
  const db=getDb();
  try {
    const numCustomers=await db.customer.count();
    const numInventory=await db.equipment.count();
    const numBookings=await db.booking.count();
    if(numCustomers===0&&numInventory===0&&numBookings===0)
      throw Error("Cloud has no transferred rental records. Restore the local backup FIRST.");
    console.log("Production database has "+numCustomers+" customers, "+numInventory+
      " equipment units and "+numBookings+" bookings.");
    console.log("Create/update sole login for: "+email);
    console.log("Historical user records will remain for payment/booking audit.");
    const pass=await hiddenPassword();
    if(pass.length<12||pass.length>128) throw Error("Password must contain 12-128 characters.");
    if(/qwerty|123456|password|admin/i.test(pass))
      console.warn("SECURITY WARNING: this password is easy to guess. Change it to a unique 16+ character secret.");
    const passwordHash=await hashPassword(pass);
    const {createInterface}=await import("node:readline/promises");
    const rl=createInterface({input:process.stdin,output:process.stdout});
    let answer="";
    try {answer=await rl.question("Type SET OWNER to update the login and disable other logins: ");}
    finally{rl.close();}
    if(answer.trim()!=="SET OWNER") throw Error("No confirmation; login unchanged.");
    await db.$transaction(async tx=>{
      let owner=await tx.user.findUnique({where:{email}});
      if(!owner) {
        owner=await tx.user.create({data:{
          id:randomUUID(),email,name:"TOP RIDE Owner",
          emailVerified:true,role:"admin",banned:false,
        }});
      } else {
        owner=await tx.user.update({where:{id:owner.id},data:{
          role:"admin",banned:false,banReason:null,banExpires:null,emailVerified:true,
        }});
      }
      const updated=await tx.account.updateMany({
        where:{userId:owner.id,providerId:"credential"},
        data:{password:passwordHash},
      });
      if(!updated.count) await tx.account.create({data:{
        id:randomUUID(),accountId:owner.id,providerId:"credential",
        userId:owner.id,password:passwordHash,
      }});
      await tx.user.updateMany({
        where:{id:{not:owner.id}},data:{banned:true},
      });
      await tx.session.deleteMany({});
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:15000});
    console.log("Login provisioned. All prior sessions revoked; other users disabled without deleting history.");
  }finally{await db.$disconnect();}
}catch(error){
  console.error("OWNER SETUP STOPPED: "+(error instanceof Error?error.message:"Unknown error"));
  process.exitCode=1;
}
