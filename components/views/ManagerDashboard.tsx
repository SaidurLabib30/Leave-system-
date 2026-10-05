import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import {
  UsersIcon,
  CheckListIcon,
  GiftIcon,
  ClockIcon,
  BellIcon,
} from "@/components/ui/icons";
import { accent } from "@/lib/accent";
import {
  COMP_OFF,
  LEAVE_TYPES,
  SHIFTS,
  formatDate,
  shiftFor,
} from "@/lib/mock-data";
import type { LeaveRequest, ShiftId } from "@/lib/types";
import type { EmployeeDirectoryEntry } from "@/components/views/EmployeeManagementView";

const TODAY = "2026-09-30";

export function ManagerDashboard({
  employees,
  requests,
  roster,
}: {
  employees: EmployeeDirectoryEntry[];
  requests: LeaveRequest[];
  roster: Record<string, ShiftId>;
}) {
  const pending = requests.filter((r) => r.status === "pending");
  const getShift = (employeeId: string, date: string) =>
    roster[`${employeeId}:${date}`] ?? shiftFor(employeeId, date);
  const employeeIds = new Set(employees.map((employee) => employee.employeeId));
  const onLeaveToday = employees.filter(
    (employee) => getShift(employee.employeeId, TODAY) === "leave",
  ).length;
  const unusedCompOff = COMP_OFF.filter(
    (record) => employeeIds.has(record.employeeId) && record.balance > 0,
  );

  const shiftCounts = (["shift-1", "shift-2", "off"] as ShiftId[]).map(
    (id) => ({
      shift: SHIFTS[id],
      count: employees.filter((employee) => getShift(employee.employeeId, TODAY) === id).length,
    }),
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Team Size"
          value={employees.length}
          hint="Assigned employees"
          accentToken="indigo"
          icon={<UsersIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Pending Approvals"
          value={pending.length}
          hint="Needs your action"
          accentToken="amber"
          icon={<CheckListIcon className="h-5 w-5" />}
        />
        <StatCard
          label="On Leave Today"
          value={onLeaveToday}
          hint={`${employees.length - onLeaveToday} present`}
          accentToken="rose"
          icon={<ClockIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Unused Duty Off"
          value={unusedCompOff.length}
          hint="Employees to follow up"
          accentToken="emerald"
          icon={<GiftIcon className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Today's roster */}
        <Card className="lg:col-span-3">
          <CardHeader
            title="Today's Roster"
            subtitle={formatDate(TODAY)}
            action={
              <div className="flex gap-1.5">
                {shiftCounts.map(({ shift, count }) => (
                  <Badge key={shift.id} accentToken={shift.accent}>
                    {shift.label}: {count}
                  </Badge>
                ))}
              </div>
            }
          />
          <CardBody className="space-y-2">
            {employees.map((emp) => {
              const shift = SHIFTS[getShift(emp.employeeId, TODAY)];
              return (
                <div
                  key={emp.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-100 px-3 py-2 dark:border-zinc-800"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar initials={initials(emp.name)} size="sm" />
                    <div className="leading-tight">
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                        {emp.name}
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        {emp.employeeId}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${accent(shift.accent).soft}`}
                  >
                    {shift.label}
                    {shift.time !== "—" && (
                      <span className="ml-1 hidden opacity-70 sm:inline">
                        {shift.time}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
            {employees.length === 0 && (
              <p className="py-8 text-center text-sm text-zinc-400">
                No employees are assigned to your team.
              </p>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          {/* Pending approvals */}
          <Card>
            <CardHeader
              title="Pending Approvals"
              subtitle={`${pending.length} awaiting review`}
            />
            <CardBody className="space-y-2.5">
              {pending.length === 0 && (
                <p className="text-sm text-zinc-400">All caught up.</p>
              )}
              {pending.map((r) => (
                <div key={r.id} className="flex items-center gap-2.5">
                  <Avatar initials={r.employeeInitials} size="sm" />
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
                      {r.employeeName}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      {LEAVE_TYPES.find((t) => t.id === r.type)?.label} ·{" "}
                      {formatDate(r.startDate)}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </CardBody>
          </Card>

          {/* Holiday duty alerts */}
          <Card>
            <CardHeader title="Holiday Duty Alerts" />
            <CardBody className="space-y-2.5">
              {unusedCompOff.map((c) => (
                <div
                  key={c.employeeId}
                  className="flex items-center gap-2.5 rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-500/10"
                >
                  <BellIcon className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    <span className="font-medium">{c.employeeName}</span> has{" "}
                    {c.balance} unused Roster Duty Off day
                    {c.balance !== 1 && "s"}.
                  </p>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
