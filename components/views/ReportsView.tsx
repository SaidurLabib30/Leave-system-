import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { DownloadIcon } from "@/components/ui/icons";
import { accent } from "@/lib/accent";
import {
  LEAVE_TYPES,
  SHIFTS,
  shiftFor,
} from "@/lib/mock-data";
import type { LeaveRequest, LeaveTypeId, ShiftId } from "@/lib/types";
import type { EmployeeDirectoryEntry } from "@/components/views/EmployeeManagementView";
import { downloadCsv } from "@/lib/download";

const TODAY = "2026-09-30";
const REPORT_TYPES: LeaveTypeId[] = ["annual", "casual", "sick", "comp-off"];

export function ReportsView({
  employees,
  requests,
  roster,
}: {
  employees: EmployeeDirectoryEntry[];
  requests: LeaveRequest[];
  roster: Record<string, ShiftId>;
}) {
  // Per-employee approved leave totals by type
  const summary = employees.map((emp) => {
    const taken: Record<string, number> = {};
    for (const id of REPORT_TYPES) taken[id] = 0;
    requests.filter(
      (r) => r.employeeId === emp.employeeId && r.status === "approved",
    ).forEach((r) => {
      taken[r.type] = (taken[r.type] ?? 0) + r.days;
    });
    const present = (roster[`${emp.employeeId}:${TODAY}`] ?? shiftFor(emp.employeeId, TODAY)) !== "leave";
    return { emp, taken, present };
  });

  const presentCount = summary.filter((s) => s.present).length;

  function exportReport() {
    downloadCsv("leave-management-report.csv", [
      ["Attendance Report"],
      ["Employee", "Today's Shift", "Status"],
      ...summary.map(({ emp, present }) => [
        emp.name,
        SHIFTS[roster[`${emp.employeeId}:${TODAY}`] ?? shiftFor(emp.employeeId, TODAY)].label,
        present ? "Present" : "On Leave",
      ]),
      [],
      ["Leave Report"],
      [
        "Employee",
        ...REPORT_TYPES.map(
          (id) => LEAVE_TYPES.find((t) => t.id === id)?.label ?? id,
        ),
        "Total",
      ],
      ...summary.map(({ emp, taken }) => [
        emp.name,
        ...REPORT_TYPES.map((id) => String(taken[id] ?? 0)),
        String(REPORT_TYPES.reduce((total, id) => total + (taken[id] ?? 0), 0)),
      ]),
    ]);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Reports for your assigned team
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <DownloadIcon className="h-4 w-4" /> Export PDF
          </Button>
          <Button variant="secondary" size="sm" onClick={exportReport}>
            <DownloadIcon className="h-4 w-4" /> Export Excel
          </Button>
        </div>
      </div>

      {/* Attendance report */}
      <Card>
        <CardHeader
          title="Attendance Report"
          subtitle="Today's presence and shift distribution"
          action={
            <Badge accentToken="emerald">
              {presentCount}/{employees.length} present
            </Badge>
          }
        />
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="px-5 py-3 font-medium">Employee</th>
                <th className="px-3 py-3 font-medium">Today's Shift</th>
                <th className="px-5 py-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {summary.map(({ emp, present }) => {
                const shift = SHIFTS[shiftFor(emp.employeeId, TODAY)];
                return (
                  <tr
                    key={emp.id}
                    className="border-b border-zinc-50 last:border-0 dark:border-zinc-800/60"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          initials={initials(emp.name)}
                          size="sm"
                        />
                        <span className="font-medium text-zinc-800 dark:text-zinc-100">
                          {emp.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-medium ${accent(shift.accent).soft}`}
                      >
                        {shift.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {present ? (
                        <Badge accentToken="emerald">Present</Badge>
                      ) : (
                        <Badge accentToken="amber">On Leave</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {/* Leave report */}
      <Card>
        <CardHeader
          title="Leave Report"
          subtitle="Approved leave taken per employee (this year)"
        />
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="px-5 py-3 font-medium">Employee</th>
                {REPORT_TYPES.map((id) => (
                  <th key={id} className="px-3 py-3 text-center font-medium">
                    {LEAVE_TYPES.find((t) => t.id === id)?.label}
                  </th>
                ))}
                <th className="px-5 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {summary.map(({ emp, taken }) => {
                const total = REPORT_TYPES.reduce(
                  (s, id) => s + (taken[id] ?? 0),
                  0,
                );
                return (
                  <tr
                    key={emp.id}
                    className="border-b border-zinc-50 last:border-0 dark:border-zinc-800/60"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar initials={initials(emp.name)} size="sm" />
                        <span className="font-medium text-zinc-800 dark:text-zinc-100">
                          {emp.name}
                        </span>
                      </div>
                    </td>
                    {REPORT_TYPES.map((id) => (
                      <td
                        key={id}
                        className="px-3 py-3 text-center text-zinc-600 dark:text-zinc-300"
                      >
                        {taken[id] || "–"}
                      </td>
                    ))}
                    <td className="px-5 py-3 text-right font-semibold text-zinc-800 dark:text-zinc-100">
                      {total || "–"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardBody>
      </Card>
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
