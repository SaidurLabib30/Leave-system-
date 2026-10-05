"use client";

import { useRef, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { PaperclipIcon, PlusIcon } from "@/components/ui/icons";
import { accent } from "@/lib/accent";
import {
  LEAVE_TYPES,
  formatDate,
} from "@/lib/mock-data";
import type { Employee, LeaveDuration, LeaveRequest, LeaveTypeId } from "@/lib/types";

const APPLYABLE: LeaveTypeId[] = ["annual", "casual", "sick", "comp-off"];

export function LeaveView({
  employee,
  requests,
  onRequestsChange,
}: {
  employee: Employee;
  requests: LeaveRequest[];
  onRequestsChange: (requests: LeaveRequest[] | ((current: LeaveRequest[]) => LeaveRequest[])) => void;
}) {

  const [type, setType] = useState<LeaveTypeId>("annual");
  const [duration, setDuration] = useState<LeaveDuration>("full");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const attachmentInput = useRef<HTMLInputElement>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!start || !reason.trim() || (end && end < start)) return;
    const endDate = duration === "half" ? start : end || start;
    const days =
      duration === "half"
        ? 0.5
        : daysBetween(start, endDate);
    const next: LeaveRequest = {
      id: `lr-${Math.floor(Math.random() * 9000 + 1000)}`,
      employeeId: employee.id,
      employeeName: employee.name,
      employeeInitials: employee.initials,
      type,
      startDate: start,
      endDate,
      duration,
      days,
      reason: reason.trim(),
      status: "pending",
      appliedOn: "2026-09-30",
      hasAttachment: Boolean(attachment),
    };
    onRequestsChange((prev) => [next, ...prev]);
    setStart("");
    setEnd("");
    setReason("");
    setAttachment(null);
    if (attachmentInput.current) attachmentInput.current.value = "";
    setDuration("full");
    setMessage("Leave request submitted.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Application form */}
      <Card className="lg:col-span-2 h-fit">
        <CardHeader
          title="Apply for Leave"
          subtitle="Request goes to your line manager"
        />
        <CardBody>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Leave Type">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as LeaveTypeId)}
                className="input"
              >
                {APPLYABLE.map((id) => {
                  const t = LEAVE_TYPES.find((x) => x.id === id)!;
                  return (
                    <option key={id} value={id}>
                      {t.label}
                    </option>
                  );
                })}
              </select>
            </Field>

            <Field label="Duration">
              <div className="flex gap-2">
                {(["full", "half"] as LeaveDuration[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                      duration === d
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                        : "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {d === "full" ? "Full Day" : "Half Day (5h)"}
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label={duration === "half" ? "Date" : "From"}>
                <input
                  type="date"
                  value={start}
                  onChange={(e) => {
                    setStart(e.target.value);
                    if (end && e.target.value > end) setEnd(e.target.value);
                  }}
                  className="input"
                  required
                />
              </Field>
              {duration === "full" && (
                <Field label="To">
                  <input
                    type="date"
                    value={end}
                    min={start}
                    onChange={(e) => setEnd(e.target.value)}
                    className="input"
                  />
                </Field>
              )}
            </div>

            <Field label="Reason">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Briefly describe your reason…"
                className="input resize-none"
                required
              />
            </Field>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={Boolean(attachment)}
                onChange={(e) =>
                  e.target.checked
                    ? attachmentInput.current?.click()
                    : setAttachment(null)
                }
                className="h-4 w-4 rounded border-zinc-300 text-indigo-600"
              />
              <PaperclipIcon className="h-4 w-4" />
              Attach medical / supporting document
            </label>
            <input
              ref={attachmentInput}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              className="sr-only"
              onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
            />
            {attachment && (
              <p className="truncate text-xs text-zinc-500" title={attachment.name}>
                {attachment.name}
              </p>
            )}

            <Button type="submit" className="w-full">
              <PlusIcon className="h-4 w-4" /> Submit Request
            </Button>
            <p aria-live="polite" className="text-xs text-emerald-700 dark:text-emerald-400">
              {message}
            </p>
          </form>
        </CardBody>
      </Card>

      {/* My requests */}
      <Card className="lg:col-span-3">
        <CardHeader
          title="My Leave Applications"
          subtitle={`${requests.length} total · ${requests.filter((r) => r.status === "pending").length} pending`}
        />
        <CardBody className="space-y-3">
          {requests.map((r) => {
            const t = LEAVE_TYPES.find((x) => x.id === r.type);
            return (
              <div
                key={r.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-zinc-100 p-3.5 dark:border-zinc-800"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${accent(t?.accent ?? "zinc").bar}`}
                    />
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                      {t?.label ?? r.type}
                    </p>
                    <span className="text-xs text-zinc-400">
                      {r.days} day{r.days !== 1 && "s"}
                    </span>
                    {r.hasAttachment && (
                      <PaperclipIcon className="h-3.5 w-3.5 text-zinc-400" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {formatDate(r.startDate)}
                    {r.endDate !== r.startDate && ` – ${formatDate(r.endDate)}`}
                  </p>
                  <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {r.reason}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            );
          })}
        </CardBody>
      </Card>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
        {label}
      </span>
      {children}
    </label>
  );
}

function daysBetween(a: string, b: string): number {
  const start = new Date(a + "T00:00:00").getTime();
  const end = new Date(b + "T00:00:00").getTime();
  if (isNaN(start) || isNaN(end) || end < start) return 1;
  return Math.round((end - start) / 86400000) + 1;
}
