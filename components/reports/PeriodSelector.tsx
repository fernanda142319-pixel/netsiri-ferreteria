"use client";

import { ReportPeriod } from "@/lib/services/reports.service";
import { cn } from "@/lib/utils/cn";

interface PeriodSelectorProps {
  period: ReportPeriod;
  onChange: (period: ReportPeriod) => void;
  // Rango personalizado
  customFrom: string;
  customTo: string;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;
  // Mes específico
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}

const presets: { value: ReportPeriod; label: string }[] = [
  { value: "today", label: "Hoy" },
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
  { value: "month", label: "Por mes" },
  { value: "custom", label: "Rango de días" },
];

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function PeriodSelector({
  period,
  onChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
}: PeriodSelectorProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="flex flex-col items-end gap-3">
      {/* Botones de período */}
      <div className="flex flex-wrap gap-2">
        {presets.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              period === opt.value
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Selector de mes */}
      {period === "month" && (
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">Mes</label>
          <select
            value={selectedMonth}
            onChange={(e) => onMonthChange(Number(e.target.value))}
            className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-brand-500 focus:outline-none"
          >
            {MONTHS.map((name, idx) => (
              <option key={idx} value={idx}>{name}</option>
            ))}
          </select>
          <label className="text-sm text-gray-500">Año</label>
          <select
            value={selectedYear}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-brand-500 focus:outline-none"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      )}

      {/* Selector de rango de días */}
      {period === "custom" && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-gray-500">Desde</label>
          <input
            type="date"
            value={customFrom}
            onChange={(e) => onCustomFromChange(e.target.value)}
            className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-brand-500 focus:outline-none"
          />
          <label className="text-sm text-gray-500">Hasta</label>
          <input
            type="date"
            value={customTo}
            onChange={(e) => onCustomToChange(e.target.value)}
            className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-brand-500 focus:outline-none"
          />
          <span className="text-xs text-gray-400">(para un día, pon la misma fecha en ambos campos)</span>
        </div>
      )}
    </div>
  );
}
