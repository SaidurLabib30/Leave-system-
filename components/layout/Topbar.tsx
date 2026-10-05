import type { Employee, Role } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { BellIcon } from "@/components/ui/icons";

interface TopbarProps {
  title: string;
  subtitle: string;
  role: Role;
  user: Employee;
  alerts: number;
  onLogout: () => void;
  onAlertsClick: () => void;
}

export function Topbar({
  title,
  subtitle,
  role,
  user,
  alerts,
  onLogout,
  onAlertsClick,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white/80 px-5 py-3.5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onAlertsClick}
          aria-label={`View notifications (${alerts})`}
          title="View notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          <BellIcon className="h-5 w-5" />
          {alerts > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
              {alerts}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 pl-1">
          <Avatar initials={user.initials} />
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {user.name}
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {role} · {user.designation}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
