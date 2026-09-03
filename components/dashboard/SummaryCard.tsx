import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

type Tone = "brand" | "sky" | "violet" | "amber" | "red" | "gray";

const toneClasses: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-700",
  sky: "bg-sky-50 text-sky-700",
  violet: "bg-violet-50 text-violet-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  gray: "bg-gray-100 text-gray-700",
};

interface SummaryCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: Tone;
  hint?: string;
}

export function SummaryCard({
  label,
  value,
  icon: Icon,
  tone = "gray",
  hint,
}: SummaryCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
        </div>
        <span className={cn("rounded-xl p-2.5", toneClasses[tone])}>
          <Icon size={22} />
        </span>
      </div>
    </Card>
  );
}
