import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  ClockIcon,
  GiftIcon,
  LeaveIcon,
  CalendarIcon,
} from "@/components/ui/icons";
import { accent } from "@/lib/accent";
import {
  LEAVE_TYPES,
  SHIFTS,
  WEEK_DATES,
  formatDate,
  shiftFor,
} from "@/lib/mock-data";
import type { Employee, LeaveRequest, ShiftId } from "@/lib/types";

const TODAY = "2026-09-30";

export function EmployeeDashboard({
  employee,
  requests,
  roster,
}: {
  employee: Employee;
  requests: LeaveRequest[];
  roster: Record<string, ShiftId>;
}) {
  const getShift = (employeeId: string, date: string) =>
    roster[`${employeeId}:${date}`] ?? shiftFor(employeeId, date);
  const todayShift = SHIFTS[getShift(employee.id, TODAY)];
  const myRequests = requests.filter(
    (r) => r.employeeId === employee.id,
  );
  const compOff = LEAVE_TYPES.find((t) => t.id === "comp-off")!;
  const totalRemaining = LEAVE_TYPES.filter((t) => t.id !== "comp-off").reduce(
    (sum, t) => sum + (t.total - t.used),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today's Shift"
          value={todayShift.label}
          hint={todayShift.time}
          accentToken={todayShift.accent}
          icon={<ClockIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Leave Balance"
          value={`${totalRemaining} days`}
          hint="Across annual, casual & sick"
          accentToken="sky"
          icon={<LeaveIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Roster Duty Off"
          value={`${compOff.total - compOff.used} days`}
          hint={`${compOff.used} used of ${compOff.total} earned`}
          accentToken="amber"
          icon={<GiftIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Pending Requests"
          value={myRequests.filter((r) => r.status === "pending").length}
          hint="Awaiting manager action"
          accentToken="violet"
          icon={<CalendarIcon className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Leave balances */}
        <Card className="lg:col-span-3">
          <CardHeader
            title="Leave Balance"
            subtitle="Auto-calculated from your joining date and policy"
          />
          <CardBody className="space-y-5">
            {LEAVE_TYPES.map((t) => {
              const remaining = t.total - t.used;
              return (
                <div key={t.id}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-200">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${accent(t.accent).bar}`}
                      />
                      {t.label}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-100">
                        {remaining}
                      </span>{" "}
                      / {t.total} left
                    </span>
                  </div>
                  <ProgressBar value={t.used} max={t.total} accentToken={t.accent} />
                </div>
              );
            })}
          </CardBody>
        </Card>

        {/* Leave status */}
        <Card className="lg:col-span-2">
          <CardHeader title="My Leave Status" subtitle="Recent applications" />
          <CardBody className="space-y-3">
            {myRequests.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-zinc-100 px-3 py-2.5 dark:border-zinc-800"
              >
                <div>
                  <p className="text-sm font-medium capitalize text-zinc-800 dark:text-zinc-100">
                    {r.type.replace("-", " ")}
                    {r.duration === "half" && (
                      <span className="ml-1 text-xs text-zinc-400">
                        (half day)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatDate(r.startDate)}
                    {r.endDate !== r.startDate && ` – ${formatDate(r.endDate)}`}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* This week's shifts */}
      <Card>
        <CardHeader
          title="Your Week"
          subtitle="Shift assignments for the current week"
          action={<Badge accentToken="indigo">{employee.department}</Badge>}
        />
        <CardBody>
          <MyWeekStrip employeeId={employee.id} getShift={getShift} />
        </CardBody>
      </Card>
    </div>
  );
}

function MyWeekStrip({
  employeeId,
  getShift,
}: {
  employeeId: string;
  getShift: (employeeId: string, date: string) => ShiftId;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {WEEK_DATES.map((date) => {
        const shift = SHIFTS[getShift(employeeId, date)];
        const d = new Date(date + "T00:00:00");
        const isToday = date === TODAY;
        return (
          <div
            key={date}
            className={`rounded-xl border p-3 text-center ${
              isToday
                ? "border-indigo-300 bg-indigo-50/50 dark:border-indigo-500/40 dark:bg-indigo-500/10"
                : "border-zinc-100 dark:border-zinc-800"
            }`}
          >
            <p className="text-[11px] font-medium uppercase text-zinc-400">
              {d.toLocaleDateString("en-US", { weekday: "short" })}
            </p>
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              {d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
            </p>
            <span
              className={`mt-2 inline-block rounded-md px-2 py-0.5 text-[11px] font-medium ${accent(shift.accent).soft}`}
            >
              {shift.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
