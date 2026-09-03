import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface ComingSoonProps {
  title: string;
  description: string;
  stage: string;
  icon: LucideIcon;
}

export function ComingSoon({ title, description, stage, icon: Icon }: ComingSoonProps) {
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="rounded-2xl bg-brand-50 p-4 text-brand-700">
        <Icon size={32} />
      </span>
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="max-w-md text-gray-500">{description}</p>
      <span className="mt-2 rounded-full bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-600">
        Próximamente · {stage}
      </span>
    </Card>
  );
}
