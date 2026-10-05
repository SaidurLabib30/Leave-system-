import type { ReactNode } from "react";
import type { Role } from "@/lib/types";
import { CalendarIcon } from "@/components/ui/icons";

export interface NavItem {
  id: string;
  label: string;
  icon: (p: { className?: string }) => ReactNode;
  roles: Role[];
  badge?: number;
}

interface SidebarProps {
  items: NavItem[];
  active: string;
  role: Role;
  onSelect: (id: string) => void;
}

export function Sidebar({ items, active, role, onSelect }: SidebarProps) {
  const visible = items.filter((i) => i.roles.includes(role));
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-zinc-200 bg-white px-4 py-5 dark:border-zinc-800 dark:bg-zinc-950 lg:flex">
      <div className="flex items-center gap-2.5 px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
          <CalendarIcon className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            DutyRoster
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Leave & Attendance
          </p>
        </div>
      </div>

      <nav className="mt-6 flex flex-1 flex-col gap-1">
        {visible.map((item) => {
          const isActive = item.id === active;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/60"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge ? (
                <span className="rounded-full bg-rose-500 px-1.5 text-[11px] font-semibold text-white">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <p className="px-3 text-[11px] text-zinc-400 dark:text-zinc-600">
        Prototype · mock data
      </p>
    </aside>
  );
}
