import type {
  CompOffRecord,
  Employee,
  LeaveRequest,
  LeaveType,
  RosterAssignment,
  Shift,
  ShiftId,
} from "./types";

// ---- Shifts -----------------------------------------------------------------

export const SHIFTS: Record<ShiftId, Shift> = {
  "shift-1": {
    id: "shift-1",
    label: "Day Shift",
    time: "9:00 AM – 6:00 PM",
    accent: "sky",
  },
  "shift-2": {
    id: "shift-2",
    label: "Noon Shift",
    time: "2:00 PM – 11:00 PM",
    accent: "violet",
  },
  off: { id: "off", label: "Week Off", time: "—", accent: "zinc" },
  leave: { id: "leave", label: "On Leave", time: "—", accent: "amber" },
  "holiday-duty": {
    id: "holiday-duty",
    label: "Holiday Duty",
    time: "Public holiday",
    accent: "rose",
  },
};

// ---- The signed-in employee (for the employee view) -------------------------

export const CURRENT_EMPLOYEE: Employee = {
  id: "e-01",
  name: "Ayesha Rahman",
  initials: "AR",
  department: "Customer Success",
  designation: "Support Specialist",
  joiningDate: "2024-02-12",
  probationCleared: true,
};

export const CURRENT_MANAGER: Employee = {
  id: "m-01",
  name: "Tanvir Hasan",
  initials: "TH",
  department: "Customer Success",
  designation: "Line Manager",
  joiningDate: "2021-06-01",
  probationCleared: true,
};

// ---- Team -------------------------------------------------------------------

export const TEAM: Employee[] = [
  CURRENT_EMPLOYEE,
  {
    id: "e-02",
    name: "Rakib Chowdhury",
    initials: "RC",
    department: "Customer Success",
    designation: "Support Specialist",
    joiningDate: "2023-09-01",
    probationCleared: true,
  },
  {
    id: "e-03",
    name: "Nusrat Jahan",
    initials: "NJ",
    department: "Customer Success",
    designation: "Senior Associate",
    joiningDate: "2022-04-18",
    probationCleared: true,
  },
  {
    id: "e-04",
    name: "Imran Kabir",
    initials: "IK",
    department: "Customer Success",
    designation: "Support Specialist",
    joiningDate: "2025-07-30",
    probationCleared: false,
  },
  {
    id: "e-05",
    name: "Farhana Akter",
    initials: "FA",
    department: "Customer Success",
    designation: "Associate",
    joiningDate: "2023-01-10",
    probationCleared: true,
  },
];

// ---- Leave balances for the current employee --------------------------------

export const LEAVE_TYPES: LeaveType[] = [
  {
    id: "annual",
    label: "Annual Leave",
    total: 20,
    used: 6,
    accent: "sky",
    policy: "1 day per 18 days worked (~20/year). Eligible after probation.",
  },
  {
    id: "casual",
    label: "Casual Leave",
    total: 10,
    used: 3,
    accent: "emerald",
    policy: "10 days per year. Eligible after probation.",
  },
  {
    id: "sick",
    label: "Sick Leave",
    total: 14,
    used: 2,
    accent: "rose",
    policy:
      "Up to 14 days/year (pro-rata). Medical proof required for 2+ consecutive days.",
  },
  {
    id: "comp-off",
    label: "Roster Duty Off",
    total: 4,
    used: 1,
    accent: "amber",
    policy: "1 holiday duty = 1 Roster Duty Off. Used like leave.",
  },
];

// ---- Leave requests ---------------------------------------------------------

export const LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: "lr-101",
    employeeId: "e-02",
    employeeName: "Rakib Chowdhury",
    employeeInitials: "RC",
    type: "casual",
    startDate: "2026-10-06",
    endDate: "2026-10-06",
    duration: "full",
    days: 1,
    reason: "Family event out of town.",
    status: "pending",
    appliedOn: "2026-09-28",
  },
  {
    id: "lr-102",
    employeeId: "e-03",
    employeeName: "Nusrat Jahan",
    employeeInitials: "NJ",
    type: "sick",
    startDate: "2026-10-02",
    endDate: "2026-10-03",
    duration: "full",
    days: 2,
    reason: "Fever, medical certificate attached.",
    status: "pending",
    appliedOn: "2026-09-29",
    hasAttachment: true,
  },
  {
    id: "lr-103",
    employeeId: "e-05",
    employeeName: "Farhana Akter",
    employeeInitials: "FA",
    type: "annual",
    startDate: "2026-10-13",
    endDate: "2026-10-15",
    duration: "full",
    days: 3,
    reason: "Planned vacation.",
    status: "pending",
    appliedOn: "2026-09-27",
  },
  {
    id: "lr-104",
    employeeId: "e-01",
    employeeName: "Ayesha Rahman",
    employeeInitials: "AR",
    type: "casual",
    startDate: "2026-09-22",
    endDate: "2026-09-22",
    duration: "half",
    days: 0.5,
    reason: "Bank work in the morning.",
    status: "approved",
    appliedOn: "2026-09-18",
  },
  {
    id: "lr-105",
    employeeId: "e-01",
    employeeName: "Ayesha Rahman",
    employeeInitials: "AR",
    type: "sick",
    startDate: "2026-08-11",
    endDate: "2026-08-12",
    duration: "full",
    days: 2,
    reason: "Flu.",
    status: "approved",
    appliedOn: "2026-08-10",
    hasAttachment: true,
  },
  {
    id: "lr-106",
    employeeId: "e-04",
    employeeName: "Imran Kabir",
    employeeInitials: "IK",
    type: "casual",
    startDate: "2026-09-15",
    endDate: "2026-09-15",
    duration: "full",
    days: 1,
    reason: "Personal.",
    status: "rejected",
    appliedOn: "2026-09-12",
  },
];

// ---- Comp-off tracking ------------------------------------------------------

export const COMP_OFF: CompOffRecord[] = [
  {
    employeeId: "e-01",
    employeeName: "Ayesha Rahman",
    employeeInitials: "AR",
    department: "Customer Success",
    holidayDutiesWorked: 4,
    earned: 4,
    used: 1,
    balance: 3,
  },
  {
    employeeId: "e-02",
    employeeName: "Rakib Chowdhury",
    employeeInitials: "RC",
    department: "Customer Success",
    holidayDutiesWorked: 2,
    earned: 2,
    used: 2,
    balance: 0,
  },
  {
    employeeId: "e-03",
    employeeName: "Nusrat Jahan",
    employeeInitials: "NJ",
    department: "Customer Success",
    holidayDutiesWorked: 3,
    earned: 3,
    used: 0,
    balance: 3,
  },
  {
    employeeId: "e-05",
    employeeName: "Farhana Akter",
    employeeInitials: "FA",
    department: "Customer Success",
    holidayDutiesWorked: 1,
    earned: 1,
    used: 0,
    balance: 1,
  },
];

// ---- Weekly roster ----------------------------------------------------------

export const WEEK_DATES: string[] = [
  "2026-09-28",
  "2026-09-29",
  "2026-09-30",
  "2026-10-01",
  "2026-10-02",
  "2026-10-03",
  "2026-10-04",
];

// Assignments keyed by `${employeeId}:${date}`
const rosterPattern: Record<string, ShiftId[]> = {
  "e-01": ["shift-1", "shift-1", "shift-1", "shift-2", "shift-2", "off", "off"],
  "e-02": ["shift-2", "shift-2", "shift-1", "shift-1", "shift-1", "off", "off"],
  "e-03": ["shift-1", "off", "shift-2", "shift-2", "shift-1", "shift-1", "off"],
  "e-04": ["off", "shift-1", "shift-1", "shift-1", "leave", "leave", "shift-2"],
  "e-05": ["shift-2", "shift-1", "off", "shift-1", "shift-2", "shift-2", "shift-1"],
};

export const ROSTER: RosterAssignment[] = TEAM.flatMap((emp) =>
  WEEK_DATES.map((date, i) => ({
    employeeId: emp.id,
    date,
    shift: rosterPattern[emp.id]?.[i] ?? "off",
  })),
);

export function shiftFor(employeeId: string, date: string): ShiftId {
  return (
    ROSTER.find((r) => r.employeeId === employeeId && r.date === date)?.shift ??
    "off"
  );
}

// ---- Helpers ----------------------------------------------------------------

export function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function weekday(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
  });
}

export function dayNum(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "2-digit",
  });
}
