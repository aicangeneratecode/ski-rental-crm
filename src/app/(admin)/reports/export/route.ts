import { getStaffSession } from "@/lib/require-staff";
import { getBelgradeDate } from "@/lib/bookings/today";
import { loadReportData, parseReportPeriod } from "@/lib/reports/report-data";

export const dynamic = "force-dynamic";

function cell(value: string | number) {
  // Escape formula-injection characters when Excel opens a user-derived field.
  let text = String(value);
  if (/^[=+@\-\t\r]/.test(text)) text = "'"+text;
  return '"'+text.replaceAll('"','""')+'"';
}
function line(...cells: (string|number)[]) {
  return cells.map(cell).join(";")+"\r\n";
}

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
    let csv="\uFEFF";
    csv+=line("TOP RIDE — финансовый отчёт");
    csv+=line("Начало",period.from,"Конец",period.to);
    csv+=line("Получено",report.received,"Возвращено",report.refunded,"Чистые поступления",report.net);
    csv+=line("Платёжных операций",report.transactions,"Оплаченных броней",report.paidBookings);
    csv+=line();
    csv+=line("Дата","Получено, RSD","Возвращено, RSD","Чистые поступления, RSD");
    for(const day of report.days) csv+=line(day.day,day.received,day.refunded,day.net);
    csv+=line();
    csv+=line("Способ оплаты","Получено, RSD","Возвращено, RSD","Чистые поступления, RSD");
    for(const row of report.methods) csv+=line(row.method,row.received,row.refunded,row.net);
    csv+=line();
    csv+=line("Тариф","Кол-во аренд","Экземпляров в текущем каталоге","Единиц-дней занятости","Процент расчётной загрузки");
    for(const item of report.categories) csv+=line(item.tariff,item.rentals,item.units,item.unitDays,item.utilization);
    csv+=line();
    csv+=line("Экземпляр","Модель","Размер","Число аренд","Единиц-дней");
    for(const item of report.popular) csv+=line(item.code,item.name,item.size,item.bookings,item.unitDays);
    csv+=line();
    csv+=line("Примечание","Показатели загрузки основаны на плановых датах и текущем активном каталоге; удалённые архивные платежи не учитываются.");
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
