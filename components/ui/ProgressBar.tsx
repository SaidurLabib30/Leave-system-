import { accent } from "@/lib/accent";

interface ProgressBarProps {
  value: number;
  max: number;
  accentToken?: string;
}

export function ProgressBar({ value, max, accentToken = "indigo" }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
      <div
        className={`h-full rounded-full transition-all ${accent(accentToken).bar}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
