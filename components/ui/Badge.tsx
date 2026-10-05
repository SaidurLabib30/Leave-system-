import type { ReactNode } from "react";
import { accent } from "@/lib/accent";
import type { LeaveStatus } from "@/lib/types";

interface BadgeProps {
  children: ReactNode;
  accentToken?: string;
  className?: string;
}

export function Badge({ children, accentToken = "zinc", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${accent(
        accentToken,
      ).soft} ${className}`}
    >
      {children}
    </span>
  );
}

const STATUS_ACCENT: Record<LeaveStatus, string> = {
  pending: "amber",
  approved: "emerald",
  rejected: "rose",
};

const STATUS_LABEL: Record<LeaveStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export function StatusBadge({ status }: { status: LeaveStatus }) {
  return (
    <Badge accentToken={STATUS_ACCENT[status]}>
      <span className={`h-1.5 w-1.5 rounded-full ${accent(STATUS_ACCENT[status]).bar}`} />
      {STATUS_LABEL[status]}
    </Badge>
  );
}
