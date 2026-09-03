const colorMap: Record<string, { bg: string; text: string; activeBg: string }> = {
  sky: { bg: "bg-sky-50", text: "text-sky-700", activeBg: "bg-sky-600" },
  amber: { bg: "bg-amber-50", text: "text-amber-700", activeBg: "bg-amber-600" },
  violet: { bg: "bg-violet-50", text: "text-violet-700", activeBg: "bg-violet-600" },
  orange: { bg: "bg-orange-50", text: "text-orange-700", activeBg: "bg-orange-600" },
  lime: { bg: "bg-lime-50", text: "text-lime-700", activeBg: "bg-lime-600" },
  yellow: { bg: "bg-yellow-50", text: "text-yellow-700", activeBg: "bg-yellow-600" },
  cyan: { bg: "bg-cyan-50", text: "text-cyan-700", activeBg: "bg-cyan-600" },
  slate: { bg: "bg-slate-50", text: "text-slate-700", activeBg: "bg-slate-600" },
  gray: { bg: "bg-gray-100", text: "text-gray-700", activeBg: "bg-gray-700" },
};

export function getCategoryColor(color: string) {
  return colorMap[color] ?? colorMap.gray;
}
