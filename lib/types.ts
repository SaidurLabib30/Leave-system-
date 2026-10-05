// Domain types for the Employee Duty Roster & Leave Management System

export type Role = "employee" | "manager";

export type ShiftId = "shift-1" | "shift-2" | "off" | "leave" | "holiday-duty";

export interface Shift {
  id: ShiftId;
  label: string;
  time: string;
  accent: string; // tailwind color token used for chips/borders
}

export interface Employee {
  id: string;
  name: string;
  initials: string;
  department: string;
  designation: string;
  joiningDate: string; // ISO date
  probationCleared: boolean;
}

export type LeaveTypeId =
  | "annual"
  | "casual"
  | "sick"
  | "maternity"
  | "comp-off";

export interface LeaveType {
  id: LeaveTypeId;
  label: string;
  total: number; // entitlement for the year
  used: number;
  accent: string;
  policy: string;
}

export type LeaveDuration = "full" | "half";
export type LeaveStatus = "pending" | "approved" | "rejected";

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeInitials: string;
  type: LeaveTypeId;
  startDate: string; // ISO date
  endDate: string; // ISO date
  duration: LeaveDuration;
  days: number;
  reason: string;
  status: LeaveStatus;
  appliedOn: string; // ISO date
  hasAttachment?: boolean;
}

// A roster cell: which shift an employee is on for a given day
export interface RosterAssignment {
  employeeId: string;
  date: string; // ISO date (YYYY-MM-DD)
  shift: ShiftId;
}

export interface CompOffRecord {
  employeeId: string;
  employeeName: string;
  employeeInitials: string;
  department: string;
  holidayDutiesWorked: number;
  earned: number; // 1 holiday duty = 1 comp-off
  used: number;
  balance: number; // earned - used
}
