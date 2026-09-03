"use client";

import { useEffect, useState } from "react";
import { FileSpreadsheet, FileText, Download, DollarSign, ShoppingBag, TrendingUp } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import {
  fetchReportData,
  getPeriodRange,
  ReportData,
  ReportPeriod,
} from "@/lib/services/reports.service";
import { listCashSessionsInRange } from "@/lib/services/cashSessions.service";
import { listProfileNames } from "@/lib/services/profiles.service";
import { fetchStockAlerts } from "@/lib/services/products.service";
import { CashSession, Product } from "@/types";
import { PeriodSelector } from "@/components/reports/PeriodSelector";
import { ReportTable } from "@/components/reports/ReportTable";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { Button } from "@/components/ui/Button";
import { formatCLP } from "@/lib/utils/format";
import { exportToCsv } from "@/lib/utils/csv";
import { exportToExcel, exportToPdf } from "@/lib/utils/export";

const CAN_ACCESS_ROLES = ["owner", "admin"];

const emptyReport: ReportData = {
  totalSales: 0,
  salesCount: 0,
  estimatedProfit: 0,
  byUser: [],
  topByQuantity: [],
  topByProfit: [],
  byCategory: [],
  noMovementProducts: [],
  rawSaleItems: [],
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function periodLabel(period: ReportPeriod, customFrom: string, customTo: string, month: number, year: number) {
  if (period === "today") return "Hoy";
  if (period === "7d") return "Últimos 7 días";
  if (period === "30d") return "Últimos 30 días";
  if (period === "month") return `${MONTH_NAMES[month]} ${year}`;
  if (customFrom && customTo) return customFrom === customTo ? customFrom : `${customFrom} al ${customTo}`;
  return "Rango personalizado";
}

export default function ReportesPage() {
  const { profile } = useAuth();
  const [supabase] = useState(() => createClient());

  const [period, setPeriod] = useState<ReportPeriod>("today");
  const [customFrom, setCustomFrom] = useState(todayStr);
  const [customTo, setCustomTo] = useState(todayStr);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [report, setReport] = useState<ReportData>(emptyReport);
  const [cashSessions, setCashSessions] = useState<CashSession[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [outOfStock, setOutOfStock] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const canAccess = !!profile && CAN_ACCESS_ROLES.includes(profile.role);

  useEffect(() => {
    if (!canAccess) return;
    if (period === "custom" && (!customFrom || !customTo)) return;
    if (period === "month" && (selectedMonth === undefined || !selectedYear)) return;

    async function load() {
      setIsLoading(true);
      const range = getPeriodRange(period, customFrom, customTo, selectedMonth, selectedYear);
      const { namesById } = await listProfileNames(supabase);
      const [reportData, sessionsRes, stockRes] = await Promise.all([
        fetchReportData(supabase, range, namesById),
        listCashSessionsInRange(supabase, range.fromIso, range.toIso),
        fetchStockAlerts(supabase),
      ]);
      setReport(reportData);
      setCashSessions(sessionsRes.sessions);
      setLowStock(stockRes.lowStock);
      setOutOfStock(stockRes.outOfStock);
      setIsLoading(false);
    }

    load();
  }, [supabase, canAccess, period, customFrom, customTo, selectedMonth, selectedYear]);

  if (profile && !canAccess) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
        <h1 className="text-xl font-bold text-gray-900">Acceso restringido</h1>
        <p className="mt-2 text-gray-500">Tu rol no tiene acceso a los reportes.</p>
      </div>
    );
  }

  const label = periodLabel(period, customFrom, customTo, selectedMonth, selectedYear);
  const fileSlug = period === "custom" ? `${customFrom}_${customTo}` : period === "month" ? `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}` : period;

  const rawSaleRows = report.rawSaleItems.map((r) => ({
    Fecha: new Date(r.date).toLocaleString("es-CL"),
    Producto: r.product,
    Categoría: r.category,
    Cantidad: r.quantity,
    "Precio unitario": r.unitPrice,
    Subtotal: r.subtotal,
  }));

  function handleExportCsv() {
    exportToCsv(`ventas-detalladas-${fileSlug}`, rawSaleRows);
  }

  function handleExportExcel() {
    exportToExcel(`ventas-detalladas-${fileSlug}`, rawSaleRows);
  }

  function handleExportPdf() {
    exportToPdf(
      `ventas-detalladas-${fileSlug}`,
      "Ventas detalladas",
      label,
      [
        { header: "Fecha", key: "Fecha" },
        { header: "Producto", key: "Producto" },
        { header: "Categoría", key: "Categoría" },
        { header: "Cantidad", key: "Cantidad" },
        { header: "Precio unitario", key: "Precio unitario" },
        { header: "Subtotal", key: "Subtotal" },
      ],
      rawSaleRows
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-500">Revisa el desempeño de tu negocio por período.</p>
        </div>
        <PeriodSelector
          period={period}
          onChange={setPeriod}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onMonthChange={setSelectedMonth}
          onYearChange={setSelectedYear}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Ventas totales"
          value={isLoading ? "..." : formatCLP(report.totalSales)}
          icon={DollarSign}
          tone="brand"
        />
        <SummaryCard
          label="Cantidad de ventas"
          value={isLoading ? "..." : report.salesCount.toString()}
          icon={ShoppingBag}
          tone="gray"
        />
        <SummaryCard
          label="Ganancia estimada"
          value={isLoading ? "..." : formatCLP(report.estimatedProfit)}
          icon={TrendingUp}
          tone="sky"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-600">Exportar ventas detalladas ({label}):</span>
        <Button size="sm" variant="secondary" onClick={handleExportCsv} disabled={report.rawSaleItems.length === 0}>
          <Download size={16} /> CSV
        </Button>
        <Button size="sm" variant="secondary" onClick={handleExportExcel} disabled={report.rawSaleItems.length === 0}>
          <FileSpreadsheet size={16} /> Excel
        </Button>
        <Button size="sm" variant="secondary" onClick={handleExportPdf} disabled={report.rawSaleItems.length === 0}>
          <FileText size={16} /> PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ReportTable
          title="Productos más vendidos"
          exportFilename={`productos-mas-vendidos-${fileSlug}`}
          emptyLabel="No hay ventas en este período."
          rows={report.topByQuantity}
          columns={[
            { key: "name", label: "Producto" },
            { key: "quantity", label: "Cantidad", align: "right" },
            { key: "revenue", label: "Ingresos", align: "right", format: (v) => formatCLP(Number(v)) },
          ]}
        />
        <ReportTable
          title="Productos con mayor ganancia"
          exportFilename={`productos-mayor-ganancia-${fileSlug}`}
          emptyLabel="No hay ventas en este período."
          rows={report.topByProfit}
          columns={[
            { key: "name", label: "Producto" },
            { key: "profit", label: "Ganancia", align: "right", format: (v) => formatCLP(Number(v)) },
          ]}
        />
        <ReportTable
          title="Ventas por categoría"
          exportFilename={`ventas-por-categoria-${fileSlug}`}
          emptyLabel="No hay ventas en este período."
          rows={report.byCategory}
          columns={[
            { key: "name", label: "Categoría" },
            { key: "quantity", label: "Unidades", align: "right" },
            { key: "total", label: "Total", align: "right", format: (v) => formatCLP(Number(v)) },
          ]}
        />
        <ReportTable
          title="Ventas por usuario"
          exportFilename={`ventas-por-usuario-${fileSlug}`}
          emptyLabel="No hay ventas en este período."
          rows={report.byUser}
          columns={[
            { key: "name", label: "Usuario" },
            { key: "count", label: "Ventas", align: "right" },
            { key: "total", label: "Total", align: "right", format: (v) => formatCLP(Number(v)) },
          ]}
        />
        <ReportTable
          title="Productos con bajo stock o sin stock"
          emptyLabel="Todos los productos tienen stock saludable."
          rows={[...outOfStock, ...lowStock].map((p) => ({
            name: p.name,
            stock: p.stock,
            minStock: p.minStock,
            estado: p.stock === 0 ? "Sin stock" : "Bajo stock",
          }))}
          columns={[
            { key: "name", label: "Producto" },
            { key: "stock", label: "Stock", align: "right" },
            { key: "minStock", label: "Mínimo", align: "right" },
            { key: "estado", label: "Estado" },
          ]}
        />
        <ReportTable
          title="Productos sin movimiento en el período"
          emptyLabel="Todos los productos activos tuvieron ventas en este período."
          rows={report.noMovementProducts.map((p) => ({ name: p.name, stock: p.stock }))}
          columns={[
            { key: "name", label: "Producto" },
            { key: "stock", label: "Stock actual", align: "right" },
          ]}
        />
      </div>

      <ReportTable
        title="Resumen de caja"
        exportFilename={`resumen-caja-${fileSlug}`}
        emptyLabel="No hay sesiones de caja en este período."
        rows={cashSessions.map((s) => ({
          openedAt: s.openedAt,
          status: s.status === "open" ? "Abierta" : "Cerrada",
          openingAmount: s.openingAmount,
          expectedCash: s.expectedCash,
          countedCash: s.countedCash,
          difference: s.difference,
        }))}
        columns={[
          { key: "openedAt", label: "Apertura", format: (v) => new Date(String(v)).toLocaleString("es-CL") },
          { key: "status", label: "Estado" },
          { key: "openingAmount", label: "Monto inicial", align: "right", format: (v) => formatCLP(Number(v)) },
          {
            key: "expectedCash",
            label: "Efectivo esperado",
            align: "right",
            format: (v) => (v === null ? "—" : formatCLP(Number(v))),
          },
          {
            key: "countedCash",
            label: "Efectivo contado",
            align: "right",
            format: (v) => (v === null ? "—" : formatCLP(Number(v))),
          },
          {
            key: "difference",
            label: "Diferencia",
            align: "right",
            format: (v) => (v === null ? "—" : formatCLP(Number(v))),
          },
        ]}
      />
    </div>
  );
}
