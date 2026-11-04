"use client";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { flexRender, useTable, type ColumnDef } from "@tanstack/react-table";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import DeleteRecordButton from "@/components/common/delete-record-button";
import { formatRsd } from "@/lib/equipment/tariffs";
import type { EquipmentRow } from "@/lib/equipment/types";
interface EquipmentTableProps {
  rows: EquipmentRow[];
  onEdit: (item: EquipmentRow) => void;
  onView: (item: EquipmentRow) => void;
  readOnly: boolean;
}
export default function EquipmentTable({
  rows,
  onEdit,
  onView,
  readOnly,
}: EquipmentTableProps) {
  const t = useTranslations("inventory");
  const profileT = useTranslations("equipmentProfile");
  const columns = useMemo<ColumnDef<Record<string, never>, EquipmentRow>[]>(
    () => [
      { accessorKey: "code", header: t("fields.code") },
      { accessorKey: "name", header: t("fields.name") },
      {
        accessorKey: "tariff",
        header: t("fields.tariff"),
        cell: (info) => t(`tariffs.${info.row.original.tariff}`),
      },
      { accessorKey: "size", header: t("fields.size") },
      {
        accessorKey: "dailyRate",
        header: t("rateColumn"),
        cell: (info) => formatRsd(info.row.original.dailyRate),
      },
      {
        accessorKey: "status",
        header: t("fields.status"),
        cell: (info) => (
          <span
            className={
              info.row.original.status === "READY"
                ? "rounded-full bg-brand-50 px-3 py-1 text-brand-700 dark:bg-brand-950 dark:text-brand-200"
                : "rounded-full bg-gray-100 px-3 py-1 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
            }
          >
            {t(`statuses.${info.row.original.status}`)}
          </span>
        ),
      },
      {
        id: "actions",
        header: t("actions"),
        cell: (info) => (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onView(info.row.original)}
              aria-label={`${profileT("open")} ${info.row.original.code}`}
            >
              {profileT("open")}
            </Button>
      
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={readOnly}
              onClick={() => onEdit(info.row.original)}
              aria-label={`${t("edit")} ${info.row.original.code}`}
            >
              {t("edit")}
            </Button>
            <DeleteRecordButton
              kind="equipment"
              id={info.row.original.id}
              version={info.row.original.version}
              label={`${info.row.original.code} · ${info.row.original.name}`}
              disabled={readOnly}
            />
          </div>
        ),
      },
    ],
    [t, profileT, onEdit, onView, readOnly],
  );
  const table = useTable({
    features: {},
    data: rows,
    columns,
  });
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableCell
                  isHeader
                  key={header.id}
                  className="border-b border-gray-200 px-4 py-3 text-start text-xs font-medium whitespace-nowrap text-gray-500 dark:border-gray-800 dark:text-gray-400"
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              className="border-b border-gray-100 last:border-0 dark:border-gray-800"
            >
              {row.getAllCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className="px-4 py-4 text-sm whitespace-nowrap text-gray-800 dark:text-gray-200"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
