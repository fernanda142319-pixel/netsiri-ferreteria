"use client";

import { Download } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { exportToCsv } from "@/lib/utils/csv";

export interface ReportColumn<T> {
  key: keyof T;
  label: string;
  align?: "left" | "right";
  format?: (value: T[keyof T], row: T) => string;
}

interface ReportTableProps<T> {
  title: string;
  columns: ReportColumn<T>[];
  rows: T[];
  emptyLabel: string;
  exportFilename?: string;
}

export function ReportTable<T extends object>({
  title,
  columns,
  rows,
  emptyLabel,
  exportFilename,
}: ReportTableProps<T>) {
  function handleExport() {
    const exportRows = rows.map((row) => {
      const record: Record<string, unknown> = {};
      for (const col of columns) {
        record[col.label] = col.format ? col.format(row[col.key], row) : row[col.key];
      }
      return record;
    });
    exportToCsv(exportFilename ?? title, exportRows);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        {exportFilename && rows.length > 0 && (
          <Button size="sm" variant="ghost" onClick={handleExport}>
            <Download size={16} /> CSV
          </Button>
        )}
      </CardHeader>
      <CardBody className="pt-0">
        {rows.length === 0 ? (
          <p className="py-4 text-sm text-gray-400">{emptyLabel}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 text-gray-500">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={String(col.key)}
                      className={`py-2 font-medium ${col.align === "right" ? "text-right" : ""}`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, i) => (
                  <tr key={i}>
                    {columns.map((col) => (
                      <td
                        key={String(col.key)}
                        className={`py-2 ${col.align === "right" ? "text-right" : ""}`}
                      >
                        {col.format ? col.format(row[col.key], row) : String(row[col.key] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
