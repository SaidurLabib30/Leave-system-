"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { CheckIcon, PaperclipIcon, XIcon } from "@/components/ui/icons";
import { accent } from "@/lib/accent";
import { LEAVE_TYPES, formatDate } from "@/lib/mock-data";
import type { LeaveRequest, LeaveStatus } from "@/lib/types";

export function ApprovalsView({
  requests,
  onStatusChange,
}: {
  requests: LeaveRequest[];
  onStatusChange: (id: string, status: LeaveStatus) => void;
}) {
  const [filter, setFilter] = useState<LeaveStatus | "all">("pending");

  const counts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  const shown =
    filter === "all" ? requests : requests.filter((r) => r.status === filter);

  return (
    <Card>
      <CardHeader
        title="Leave Approvals"
        subtitle="Review and action requests from your team"
        action={
          <div className="flex flex-wrap gap-1.5">
            {(["pending", "approved", "rejected", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition ${
                  filter === f
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                {f} ({counts[f]})
              </button>
            ))}
          </div>
        }
      />
      <CardBody className="space-y-3">
        {shown.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-400">
            Nothing here right now.
          </p>
        )}
        {shown.map((r) => {
          const t = LEAVE_TYPES.find((x) => x.id === r.type);
          return (
            <div
              key={r.id}
              className="flex flex-col gap-3 rounded-xl border border-zinc-100 p-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <Avatar initials={r.employeeInitials} />
                <div>
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                    {r.employeeName}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1">
                      <span
                        className={`h-2 w-2 rounded-full ${accent(t?.accent ?? "zinc").bar}`}
                      />
                      {t?.label ?? r.type}
                    </span>
                    <span>·</span>
                    <span>
                      {formatDate(r.startDate)}
                      {r.endDate !== r.startDate &&
                        ` – ${formatDate(r.endDate)}`}
                    </span>
                    <span>·</span>
                    <span>
                      {r.days} day{r.days !== 1 && "s"}
                      {r.duration === "half" && " (half)"}
                    </span>
                    {r.hasAttachment && (
                      <span className="flex items-center gap-0.5 text-indigo-500">
                        <PaperclipIcon className="h-3.5 w-3.5" /> doc
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                    “{r.reason}”
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end lg:flex-row">
                {r.status === "pending" ? (
                  <>
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => onStatusChange(r.id, "approved")}
                    >
                      <CheckIcon className="h-4 w-4" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => onStatusChange(r.id, "rejected")}
                    >
                      <XIcon className="h-4 w-4" /> Reject
                    </Button>
                  </>
                ) : (
                  <StatusBadge status={r.status} />
                )}
              </div>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}
