import { getStaffSession } from "@/lib/require-staff";
import { getBelgradeDate } from "@/lib/bookings/today";
import { loadReportData, parseReportPeriod } from "@/lib/reports/report-data";
import { reportToCsv } from "@/lib/reports/csv";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const staff = await getStaffSession();
  if (!staff) return new Response("Unauthorized", { status: 401 });
  const query = new URL(request.url).searchParams;
  const period = parseReportPeriod({
    from: query.get("from") ?? undefined,
    to: query.get("to") ?? undefined,
  }, getBelgradeDate());
  if (!period) return new Response("Invalid reporting period", { status: 400 });
  try {
    const report = await loadReportData(period);
    const csv=reportToCsv(report);
    return new Response(csv,{
      headers:{
        "Content-Type":"text/csv; charset=utf-8",
        "Content-Disposition":`attachment; filename="top-ride-report-${period.from}-${period.to}.csv"`,
        "Cache-Control":"private, no-store",
      },
    });
  } catch(error) {
    console.error("[TOP RIDE reports/export] Database query failed",error);
    return new Response("Report unavailable", {status:503});
  }
}
