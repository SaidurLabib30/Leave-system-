// Static Tailwind class maps per accent token.
// Tailwind can only see complete class strings, so we enumerate them here
// instead of building names dynamically (e.g. `bg-${accent}-100`).

export type Accent =
  | "sky"
  | "violet"
  | "emerald"
  | "rose"
  | "amber"
  | "zinc"
  | "indigo";

interface AccentClasses {
  soft: string; // subtle chip / tag background + text
  bar: string; // solid bar fill
  dot: string; // small solid dot
  ring: string; // left border / ring
}

export const ACCENTS: Record<Accent, AccentClasses> = {
  sky: {
    soft: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
    bar: "bg-sky-500",
    dot: "bg-sky-500",
    ring: "border-sky-500",
  },
  violet: {
    soft: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    bar: "bg-violet-500",
    dot: "bg-violet-500",
    ring: "border-violet-500",
  },
  emerald: {
    soft: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    bar: "bg-emerald-500",
    dot: "bg-emerald-500",
    ring: "border-emerald-500",
  },
  rose: {
    soft: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    bar: "bg-rose-500",
    dot: "bg-rose-500",
    ring: "border-rose-500",
  },
  amber: {
    soft: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    bar: "bg-amber-500",
    dot: "bg-amber-500",
    ring: "border-amber-500",
  },
  zinc: {
    soft: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700/40 dark:text-zinc-300",
    bar: "bg-zinc-400",
    dot: "bg-zinc-400",
    ring: "border-zinc-400",
  },
  indigo: {
    soft: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
    bar: "bg-indigo-500",
    dot: "bg-indigo-500",
    ring: "border-indigo-500",
  },
};

export function accent(token: string): AccentClasses {
  return ACCENTS[(token as Accent)] ?? ACCENTS.zinc;
}
