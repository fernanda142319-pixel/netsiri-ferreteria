import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportToExcel(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Reporte");
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

export function exportToPdf(
  filename: string,
  title: string,
  dateLabel: string,
  columns: { header: string; key: string }[],
  rows: Record<string, unknown>[]
) {
  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFontSize(16);
  doc.text(title, 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(dateLabel, 14, 23);

  autoTable(doc, {
    startY: 28,
    head: [columns.map((c) => c.header)],
    body: rows.map((row) => columns.map((c) => String(row[c.key] ?? ""))),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 30, 30] },
  });

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
