import type { ReactNode } from "react";
import { accent } from "@/lib/accent";
import { Card } from "./Card";

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  accentToken?: string;
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  accentToken = "indigo",
}: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {value}
          </p>
          {hint && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
          )}
        </div>
        {icon && (
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent(
              accentToken,
            ).soft}`}
          >
            {icon}
          </span>
        )}
      </div>
    </Card>
  );
}
