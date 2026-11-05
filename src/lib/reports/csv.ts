import type { ReportData } from "./report-data";

export function csvCell(value:string|number):string {
  // Keep numbers numeric, including negatives. Only neutralize potentially
  // executable spreadsheet formula prefixes in strings from users or inventory.
  const raw=String(value);
  const safe=typeof value==="string" && /^[=+@\-\t\r]/.test(raw) ? "'"+raw : raw;
  return '"'+safe.replaceAll('"','""')+'"';
}
const row=(...values:(string|number)[])=>values.map(csvCell).join(";")+"\r\n";

export function reportToCsv(report:ReportData):string {
  const {period}=report;
  let csv="\uFEFF";
  csv+=row("TOP RIDE — финансовый отчёт");
  csv+=row("Начало",period.from,"Конец",period.to);
  csv+=row("Получено",report.received,"Возвращено",report.refunded,"Чистые поступления",report.net);
  csv+=row("Платёжных операций",report.transactions,"Оплаченных броней",report.paidBookings);
  csv+=row();
  csv+=row("Дата","Получено, RSD","Возвращено, RSD","Чистые поступления, RSD");
  for(const item of report.days)csv+=row(item.day,item.received,item.refunded,item.net);
  csv+=row();
  csv+=row("Способ оплаты","Получено, RSD","Возвращено, RSD","Чистые поступления, RSD");
  for(const item of report.methods)csv+=row(item.method,item.received,item.refunded,item.net);
  csv+=row();
  csv+=row("Тариф","Аренд","Экземпляров в каталоге","Единиц-дней","Расчётная загрузка, %");
  for(const item of report.categories)csv+=row(item.tariff,item.rentals,item.units,item.unitDays,item.utilization);
  csv+=row();
  csv+=row("Экземпляр","Модель","Размер","Аренд","Единиц-дней");
  for(const item of report.popular)csv+=row(item.code,item.name,item.size,item.bookings,item.unitDays);
  csv+=row();
  csv+=row("Примечание","Расчётная загрузка по датам броней и текущему каталогу. Безвозвратно удалённые архивные платежи исключены.");
  return csv;
}
