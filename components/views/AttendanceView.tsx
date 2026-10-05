"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SHIFTS } from "@/lib/mock-data";
import type { Role, Shift, ShiftId } from "@/lib/types";

const TIME_ZONE = "Asia/Dhaka";

interface AttendanceRecord {
  id: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  dutyTimeMinutes: number | null;
  status: string;
  shiftId?: ShiftId | null;
  shift?: Shift | null;
  employeeName?: string;
  employeeCode?: string;
  checkInLocation?: AttendanceLocation;
  checkOutLocation?: AttendanceLocation | null;
}

interface AttendanceLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface AttendanceResponse {
  today: AttendanceRecord | null;
  history: AttendanceRecord[];
  employees?: { employeeCode: string; name: string }[];
}

const MONTHS = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1).padStart(2, "0"),
  label: new Intl.DateTimeFormat("en-US", { month: "long" }).format(
    new Date(2020, index, 1),
  ),
}));

async function requestAttendance(
  url: string,
  init?: RequestInit,
): Promise<AttendanceResponse> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = (await response.json().catch(() => null)) as
    | AttendanceResponse
    | { message?: string; error?: string }
    | null;

  if (!response.ok) {
    const message =
      body && "message" in body && typeof body.message === "string"
        ? body.message
        : body && "error" in body && typeof body.error === "string"
          ? body.error
          : undefined;
    throw new Error(message || `Attendance request failed (${response.status}).`);
  }

  return body as AttendanceResponse;
}

function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(new Date(Date.UTC(year, month - 1, day, 6)));
}

function formatTime(value: string | null): string {
  if (!value) return "Not checked out";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: TIME_ZONE,
  }).format(date);
}

function formatDuration(totalMinutes: number): string {
  const minutes = Math.max(0, Math.floor(totalMinutes));
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

function liveDuration(checkInTime: string | null, now: number): string {
  if (!checkInTime || !now) return "--";
  const startedAt = new Date(checkInTime).getTime();
  if (Number.isNaN(startedAt)) return "--";
  return formatDuration((now - startedAt) / 60000);
}

function statusAccent(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "completed") return "emerald";
  if (normalized === "late") return "amber";
  if (normalized === "working") return "sky";
  return "zinc";
}

function statusLabel(record: AttendanceRecord | null): string {
  if (!record) return "Not checked in";
  if (record.checkInTime && !record.checkOutTime) {
    return record.status.toLowerCase() === "late" ? "Working · Late" : "Working";
  }
  return record.status.charAt(0).toUpperCase() + record.status.slice(1);
}

function getCurrentLocation(): Promise<AttendanceLocation> {
  if (!window.isSecureContext) {
    return Promise.reject(
      new Error("Location access requires HTTPS (or localhost). Open this app over a secure connection."),
    );
  }
  if (!navigator.geolocation) {
    return Promise.reject(new Error("This browser does not support device location."));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        });
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Location permission is denied. Allow location access for this site in your browser or device settings, then try again."
            : error.code === error.POSITION_UNAVAILABLE
              ? "Your device could not determine its location. Turn on location services and try again."
              : "Getting your location took too long. Move to an area with a clearer signal and try again.";
        reject(new Error(message));
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 },
    );
  });
}

function formatLocation(location?: AttendanceLocation | null): string {
  if (!location) return "Not recorded";
  return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)} (±${Math.round(location.accuracy)} m)`;
}

export function AttendanceView({
  role,
  assignedShiftId,
  onShiftChange,
}: {
  role: Role;
  assignedShiftId: ShiftId;
  onShiftChange: (shiftId: "shift-1" | "shift-2") => void;
}) {
  const [data, setData] = useState<AttendanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(0);
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  useEffect(() => {
    let active = true;
    requestAttendance("/api/attendance")
      .then((result) => {
        if (active) setData(result);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load attendance.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const initialUpdate = window.setTimeout(() => setNow(Date.now()), 0);
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(interval);
    };
  }, []);

  async function refresh() {
    setError("");
    setData(await requestAttendance("/api/attendance"));
  }

  async function recordAction(action: "check-in" | "check-out") {
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const location = await getCurrentLocation();
      await requestAttendance(`/api/attendance/${action}`, {
        method: "POST",
        body: JSON.stringify({
          location,
          ...(action === "check-in" ? { shiftId: assignedShiftId } : {}),
        }),
      });
      await refresh();
      setNotice(action === "check-in" ? "Check-in recorded." : "Check-out recorded.");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to update attendance.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const today = data?.today ?? null;
  const assignedShift = SHIFTS[assignedShiftId];
  const isWorking = Boolean(today?.checkInTime && !today.checkOutTime);
  const canCheckIn = Boolean(data && !today?.checkInTime);
  const canCheckOut = Boolean(today?.checkInTime && !today?.checkOutTime);

  if (role === "manager") {
    const records = data?.history ?? [];
    const employees = data?.employees?.length
      ? data.employees.map((employee) => ({
          key: employee.employeeCode,
          name: employee.name,
        }))
      : records.reduce<{ key: string; name: string }[]>((list, record) => {
          const key = record.employeeCode || record.employeeName || "";
          if (key && !list.some((employee) => employee.key === key)) {
            list.push({ key, name: record.employeeName || key });
          }
          return list;
        }, []);
    const filteredRecords = records.filter((record) => {
      const employeeKey = record.employeeCode || record.employeeName || "";
      return (
        (!filterEmployee || employeeKey === filterEmployee) &&
        (!filterMonth || record.date.slice(5, 7) === filterMonth)
      );
    });

    return (
      <Card>
        <CardHeader
          title="Employee Attendance"
          subtitle="Attendance history for all employees"
        />
        <CardBody className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                Employee
              </span>
              <select
                value={filterEmployee}
                onChange={(event) => setFilterEmployee(event.target.value)}
                className="input"
              >
                <option value="">All Employees</option>
                {employees.map((employee) => (
                  <option key={employee.key} value={employee.key}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                Monthly
              </span>
              <select
                value={filterMonth}
                onChange={(event) => setFilterMonth(event.target.value)}
                className="input"
              >
                <option value="">All Months</option>
                {MONTHS.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error && (
            <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
              {error}
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="px-3 py-3 font-medium">Employee</th>
                  <th className="px-3 py-3 font-medium">Employee ID</th>
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Shift</th>
                  <th className="px-3 py-3 font-medium">Check In</th>
                  <th className="px-3 py-3 font-medium">Check-in GPS</th>
                  <th className="px-3 py-3 font-medium">Check Out</th>
                  <th className="px-3 py-3 font-medium">Check-out GPS</th>
                  <th className="px-3 py-3 font-medium">Duty Time</th>
                  <th className="px-3 py-3 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => {
                  const recordShift = record.shift ?? (record.shiftId ? SHIFTS[record.shiftId] : null);
                  return (
                    <tr
                      key={record.id}
                      className="border-b border-zinc-50 last:border-0 dark:border-zinc-800/60"
                    >
                      <td className="px-3 py-3 font-medium text-zinc-800 dark:text-zinc-100">
                        {record.employeeName || "--"}
                      </td>
                      <td className="px-3 py-3 text-zinc-600 dark:text-zinc-300">
                        {record.employeeCode || "--"}
                      </td>
                      <td className="px-3 py-3 text-zinc-600 dark:text-zinc-300">
                        {formatDate(record.date)}
                      </td>
                      <td className="px-3 py-3 text-zinc-600 dark:text-zinc-300">
                        {recordShift?.label ?? "--"}
                      </td>
                      <td className="px-3 py-3 text-zinc-600 dark:text-zinc-300">
                        {record.checkInTime ? formatTime(record.checkInTime) : "--"}
                      </td>
                      <td className="px-3 py-3 text-xs text-zinc-600 dark:text-zinc-300">
                        {formatLocation(record.checkInLocation)}
                      </td>
                      <td className="px-3 py-3 text-zinc-600 dark:text-zinc-300">
                        {record.checkOutTime ? formatTime(record.checkOutTime) : "--"}
                      </td>
                      <td className="px-3 py-3 text-xs text-zinc-600 dark:text-zinc-300">
                        {formatLocation(record.checkOutLocation)}
                      </td>
                      <td className="px-3 py-3 text-zinc-600 dark:text-zinc-300">
                        {record.dutyTimeMinutes == null ? "--" : formatDuration(record.dutyTimeMinutes)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Badge accentToken={statusAccent(record.status)}>
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
                {!loading && filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-5 py-8 text-center text-sm text-zinc-400">
                      No attendance records match these filters.
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={10} className="px-5 py-8 text-center text-sm text-zinc-400">
                      Loading attendance history...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Today's Attendance"
          subtitle={today ? formatDate(today.date) : "Check in to start your workday"}
          action={
            <div className="flex flex-wrap items-center justify-end gap-3">
              {role === "employee" && (
                <label className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  <span>Shift</span>
                  <select
                    value={assignedShiftId}
                    onChange={(event) => {
                      const shiftId = event.target.value;
                      if (shiftId === "shift-1" || shiftId === "shift-2") {
                        onShiftChange(shiftId);
                      }
                    }}
                    aria-label="Assigned shift"
                    className="input min-w-48"
                  >
                    {assignedShiftId !== "shift-1" &&
                      assignedShiftId !== "shift-2" && (
                        <option value={assignedShiftId} disabled>
                          {SHIFTS[assignedShiftId].label} — {SHIFTS[assignedShiftId].time}
                        </option>
                      )}
                    {(["shift-1", "shift-2"] as const).map((shiftId) => (
                      <option key={shiftId} value={shiftId}>
                        {SHIFTS[shiftId].label} — {SHIFTS[shiftId].time}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <Badge
                accentToken={statusAccent(
                  isWorking ? "working" : today?.status ?? "zinc",
                )}
              >
                {loading ? "Loading" : statusLabel(today)}
              </Badge>
            </div>
          }
        />
        <CardBody className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AttendanceFact label="Shift" value={assignedShift?.label ?? "Not assigned"} />
            <AttendanceFact label="Shift Time" value={assignedShift?.time ?? "--"} />
            <AttendanceFact label="Check In" value={formatTime(today?.checkInTime ?? null)} />
            <AttendanceFact label="Check Out" value={formatTime(today?.checkOutTime ?? null)} />
            <AttendanceFact label="Check-in GPS" value={formatLocation(today?.checkInLocation)} />
            <AttendanceFact label="Check-out GPS" value={formatLocation(today?.checkOutLocation)} />
            <AttendanceFact
              label={isWorking ? "Current Duty Time" : "Duty Time"}
              value={
                isWorking
                  ? liveDuration(today?.checkInTime ?? null, now)
                  : today?.dutyTimeMinutes == null
                    ? "--"
                    : formatDuration(today.dutyTimeMinutes)
              }
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
              {notice}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {canCheckIn && (
              <Button
                type="button"
                onClick={() => void recordAction("check-in")}
                disabled={loading || submitting}
              >
                {submitting ? "Checking In..." : "Check In"}
              </Button>
            )}
            {canCheckOut && (
              <Button
                type="button"
                variant="danger"
                onClick={() => void recordAction("check-out")}
                disabled={loading || submitting}
              >
                {submitting
                  ? "Checking Out..."
                  : today?.checkOutTime
                    ? "Update Check Out"
                    : "Check Out"}
              </Button>
            )}
            {!loading && today?.checkOutTime && (
              <p className="self-center text-sm text-zinc-500 dark:text-zinc-400">
                Attendance completed for today.
              </p>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Attendance History" subtitle="Your previous attendance records" />
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full min-w-[850px] text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-3 py-3 font-medium">Shift</th>
                <th className="px-3 py-3 font-medium">Check In</th>
                <th className="px-3 py-3 font-medium">Check-in GPS</th>
                <th className="px-3 py-3 font-medium">Check Out</th>
                <th className="px-3 py-3 font-medium">Check-out GPS</th>
                <th className="px-3 py-3 font-medium">Duty Time</th>
                <th className="px-5 py-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.history.map((record) => (
                <tr
                  key={record.id}
                  className="border-b border-zinc-50 last:border-0 dark:border-zinc-800/60"
                >
                  <td className="px-5 py-3 font-medium text-zinc-800 dark:text-zinc-100">
                    {formatDate(record.date)}
                  </td>
                  <td className="px-3 py-3 text-zinc-600 dark:text-zinc-300">
                    {(record.shift ?? (record.shiftId ? SHIFTS[record.shiftId] : null))?.label ?? "--"}
                  </td>
                  <td className="px-3 py-3 text-zinc-600 dark:text-zinc-300">
                    {record.checkInTime ? formatTime(record.checkInTime) : "--"}
                  </td>
                  <td className="px-3 py-3 text-xs text-zinc-600 dark:text-zinc-300">
                    {formatLocation(record.checkInLocation)}
                  </td>
                  <td className="px-3 py-3 text-zinc-600 dark:text-zinc-300">
                    {record.checkOutTime ? formatTime(record.checkOutTime) : "--"}
                  </td>
                  <td className="px-3 py-3 text-xs text-zinc-600 dark:text-zinc-300">
                    {formatLocation(record.checkOutLocation)}
                  </td>
                  <td className="px-3 py-3 text-zinc-600 dark:text-zinc-300">
                    {record.dutyTimeMinutes == null
                      ? record.checkInTime && !record.checkOutTime
                        ? liveDuration(record.checkInTime, now)
                        : "--"
                      : formatDuration(record.dutyTimeMinutes)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Badge accentToken={statusAccent(record.status)}>
                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </Badge>
                  </td>
                </tr>
              ))}
              {!loading && data?.history.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-sm text-zinc-400">
                    No attendance records yet.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-sm text-zinc-400">
                    Loading attendance history...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}

function AttendanceFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-100 px-3 py-3 dark:border-zinc-800">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
        {value}
      </p>
    </div>
  );
}