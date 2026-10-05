"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DownloadIcon } from "@/components/ui/icons";
import { accent } from "@/lib/accent";
import { SHIFTS, WEEK_DATES } from "@/lib/mock-data";
import { downloadCsv } from "@/lib/download";
import type { EmployeeDirectoryEntry } from "@/components/views/EmployeeManagementView";
import type { ShiftId } from "@/lib/types";

type ViewMode = "day" | "week";
const TODAY = "2026-09-30";
const DISPLAY_SHIFTS: ShiftId[] = ["shift-1", "shift-2", "off", "leave", "holiday-duty"];

export function RosterView({
  employees,
  roster,
  onRosterShiftCycle,
}: {
  employees: EmployeeDirectoryEntry[];
  roster: Record<string, ShiftId>;
  onRosterShiftCycle: (employeeId: string, date: string) => void;
}) {
  const [mode, setMode] = useState<ViewMode>("week");
  const [day, setDay] = useState(TODAY);
  const getShift = (employeeId: string, date: string) =>
    roster[`${employeeId}:${date}`] ?? "off";

  function exportRoster() {
    downloadCsv("duty-roster.csv", [
      ["Employee", ...WEEK_DATES],
      ...employees.map((employee) => [
        employee.name,
        ...WEEK_DATES.map((date) => SHIFTS[getShift(employee.employeeId, date)].label),
      ]),
    ]);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Duty Roster"
          subtitle={`${employees.length} assigned team members`}
          action={
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-700">
                {(["day", "week"] as ViewMode[]).map((viewMode) => (
                  <button
                    key={viewMode}
                    onClick={() => setMode(viewMode)}
                    className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                      mode === viewMode
                        ? "bg-indigo-600 text-white"
                        : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                    }`}
                  >
                    {viewMode}
                  </button>
                ))}
              </div>
              <Button variant="secondary" size="sm" onClick={exportRoster}>
                <DownloadIcon className="h-4 w-4" /> Export
              </Button>
            </div>
          }
        />
        <CardBody>
          {mode === "week" ? (
            <WeekGrid employees={employees} getShift={getShift} onCycleShift={onRosterShiftCycle} />
          ) : (
            <DayView employees={employees} day={day} onDayChange={setDay} getShift={getShift} />
          )}
        </CardBody>
      </Card>
      <ShiftLegend />
    </div>
  );
}

function WeekGrid({
  employees,
  getShift,
  onCycleShift,
}: {
  employees: EmployeeDirectoryEntry[];
  getShift: (employeeId: string, date: string) => ShiftId;
  onCycleShift: (employeeId: string, date: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-y-1 text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 bg-white px-3 py-2 text-left text-xs font-medium text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">Employee</th>
            {WEEK_DATES.map((date) => {
              const currentDate = new Date(`${date}T00:00:00`);
              return (
                <th key={date} className={`px-2 py-2 text-center text-xs font-medium ${date === TODAY ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-500 dark:text-zinc-400"}`}>
                  <div>{currentDate.toLocaleDateString("en-US", { weekday: "short" })}</div>
                  <div className="font-normal">{currentDate.toLocaleDateString("en-GB", { day: "2-digit" })}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => (
            <tr key={employee.id}>
              <td className="sticky left-0 bg-white px-3 py-2 dark:bg-zinc-900">
                <div className="flex items-center gap-2">
                  <Avatar initials={initials(employee.name)} size="sm" />
                  <div className="leading-tight">
                    <p className="whitespace-nowrap text-sm font-medium text-zinc-800 dark:text-zinc-100">{employee.name}</p>
                    <p className="text-[11px] text-zinc-400">{employee.employeeId}</p>
                  </div>
                </div>
              </td>
              {WEEK_DATES.map((date) => {
                const shift = SHIFTS[getShift(employee.employeeId, date)];
                return (
                  <td key={date} className="px-1 py-2 text-center">
                    <button
                      type="button"
                      title={`${employee.name}: ${shift.label} (${shift.time}). Click to change.`}
                      aria-label={`${employee.name}, ${date}: ${shift.label}. Change assignment.`}
                      onClick={() => onCycleShift(employee.employeeId, date)}
                      className={`inline-block w-full rounded-md px-2 py-1.5 text-[11px] font-medium transition hover:ring-2 hover:ring-indigo-300 ${accent(shift.accent).soft}`}
                    >
                      {shift.id === "shift-1" ? "S1" : shift.id === "shift-2" ? "S2" : shift.label}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {employees.length === 0 && <p className="py-8 text-center text-sm text-zinc-400">No assigned employees.</p>}
      <p className="mt-3 text-xs text-zinc-400">Select a shift cell to cycle its assignment.</p>
    </div>
  );
}

function DayView({
  employees,
  day,
  onDayChange,
  getShift,
}: {
  employees: EmployeeDirectoryEntry[];
  day: string;
  onDayChange: (day: string) => void;
  getShift: (employeeId: string, date: string) => ShiftId;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {WEEK_DATES.map((date) => {
          const currentDate = new Date(`${date}T00:00:00`);
          const active = date === day;
          return (
            <button key={date} onClick={() => onDayChange(date)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${active ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300" : "border-zinc-200 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"}`}>
              {currentDate.toLocaleDateString("en-US", { weekday: "short" })} {currentDate.toLocaleDateString("en-GB", { day: "2-digit" })}
            </button>
          );
        })}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {DISPLAY_SHIFTS.map((shiftId) => {
          const shift = SHIFTS[shiftId];
          const assigned = employees.filter((employee) => getShift(employee.employeeId, day) === shiftId);
          return (
            <div key={shiftId} className={`rounded-xl border-l-4 border border-zinc-100 dark:border-zinc-800 ${accent(shift.accent).ring}`}>
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{shift.label}</p>
                  <p className="text-xs text-zinc-500">{shift.time}</p>
                </div>
                <Badge accentToken={shift.accent}>{assigned.length} staff</Badge>
              </div>
              <div className="space-y-1.5 px-4 pb-4">
                {assigned.length === 0 && <p className="text-xs text-zinc-400">No one assigned.</p>}
                {assigned.map((employee) => (
                  <div key={employee.id} className="flex items-center gap-2 rounded-lg bg-zinc-50 px-2 py-1.5 dark:bg-zinc-800/50">
                    <Avatar initials={initials(employee.name)} size="sm" />
                    <span className="text-sm text-zinc-700 dark:text-zinc-200">{employee.name}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function ShiftLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs dark:border-zinc-800 dark:bg-zinc-900">
      <span className="font-medium text-zinc-500">Legend:</span>
      {Object.values(SHIFTS).map((shift) => (
        <span key={shift.id} className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${accent(shift.accent).bar}`} />
          <span className="text-zinc-600 dark:text-zinc-300">{shift.label}</span>
        </span>
      ))}
    </div>
  );
}