"use client";

import { useEffect, useMemo, useState } from "react";
import { Sidebar, type NavItem } from "./Sidebar";
import { Topbar } from "./Topbar";
import { EmployeeDashboard } from "@/components/views/EmployeeDashboard";
import { ManagerDashboard } from "@/components/views/ManagerDashboard";
import { RosterView } from "@/components/views/RosterView";
import { LeaveView } from "@/components/views/LeaveView";
import { ApprovalsView } from "@/components/views/ApprovalsView";
import { CompOffView } from "@/components/views/CompOffView";
import { ReportsView } from "@/components/views/ReportsView";
import { AttendanceView } from "@/components/views/AttendanceView";
import {
  AddEmployeeView,
  EmployeeManagementView,
  type EmployeeDirectoryEntry,
  type EmployeeDraft,
} from "@/components/views/EmployeeManagementView";
import {
  CalendarIcon,
  CheckListIcon,
  ClockIcon,
  DashboardIcon,
  GiftIcon,
  LeaveIcon,
  ReportIcon,
  UsersIcon,
} from "@/components/ui/icons";
import {
  COMP_OFF,
  LEAVE_REQUESTS,
  ROSTER,
} from "@/lib/mock-data";
import type { AuthenticatedEmployee } from "@/lib/auth";
import type { LeaveRequest, LeaveStatus, Role, ShiftId } from "@/lib/types";

const SHIFT_CYCLE: ShiftId[] = ["shift-1", "shift-2", "off", "leave", "holiday-duty"];

const NAV: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: DashboardIcon,
    roles: ["employee", "manager"],
  },
  {
    id: "employees",
    label: "Employees",
    icon: UsersIcon,
    roles: ["manager"],
  },
  {
    id: "roster",
    label: "Duty Roster",
    icon: CalendarIcon,
    roles: ["employee", "manager"],
  },
  { id: "leave", label: "Apply / My Leave", icon: LeaveIcon, roles: ["employee"] },
  {
    id: "attendance",
    label: "Attendance",
    icon: ClockIcon,
    roles: ["employee", "manager"],
  },
  {
    id: "approvals",
    label: "Approvals",
    icon: CheckListIcon,
    roles: ["manager"],
  },
  {
    id: "comp-off",
    label: "Roster Duty Off",
    icon: GiftIcon,
    roles: ["employee", "manager"],
  },
  { id: "reports", label: "Reports", icon: ReportIcon, roles: ["manager"] },
];

const META: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Overview at a glance" },
  employees: { title: "Employees", subtitle: "Manage employee directory" },
  "add-employee": { title: "Add Employee", subtitle: "Create employee profile" },
  roster: { title: "Duty Roster", subtitle: "Shift-wise schedule" },
  leave: { title: "Leave", subtitle: "Apply and track your requests" },
  attendance: {
    title: "Attendance",
    subtitle: "Attendance history",
  },
  approvals: { title: "Approvals", subtitle: "Action your team's requests" },
  "comp-off": {
    title: "Roster Duty Off",
    subtitle: "Holiday duty & compensatory off",
  },
  reports: { title: "Reports", subtitle: "Attendance & leave analytics" },
};

export function AppShell({
  employee,
  role,
}: {
  employee: AuthenticatedEmployee;
  role: Role;
}) {
  const [active, setActive] = useState("dashboard");
  const [requests, setRequests] = useState<LeaveRequest[]>(LEAVE_REQUESTS);
  const [employees, setEmployees] = useState<EmployeeDirectoryEntry[]>([]);
  const [employeeDirectoryError, setEmployeeDirectoryError] = useState("");
  const [roster, setRoster] = useState<Record<string, ShiftId>>(() =>
    Object.fromEntries(
      ROSTER.map(({ employeeId, date, shift }) => [
        `${employeeId}:${date}`,
        shift,
      ]),
    ),
  );

  useEffect(() => {
    let cancelled = false;
    fetch(role === "manager" ? "/api/manager/dashboard" : "/api/employee/dashboard")
      .then(async (response) => {
        const result = (await response.json()) as {
          employees?: ManagedEmployeeRecord[];
          error?: string;
        };
        if (!response.ok) throw new Error(result.error ?? "Could not load employees.");
        if (!cancelled) setEmployees((result.employees ?? []).map(toDirectoryEntry));
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setEmployeeDirectoryError(
            error instanceof Error ? error.message : "Could not load employees.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [role]);

  const visibleEmployeeIds = new Set(employees.map((entry) => entry.employeeId));
  const visibleRequests = role === "manager"
    ? requests.filter((request) => visibleEmployeeIds.has(request.employeeId))
    : requests.filter((request) => request.employeeId === employee.id);
  const pendingCount = visibleRequests.filter(
    (r) => r.status === "pending",
  ).length;
  const alertCount =
    (role === "manager"
      ? pendingCount + COMP_OFF.filter(
          (record) => visibleEmployeeIds.has(record.employeeId) && record.balance > 0,
        ).length
      : visibleRequests.filter((r) => r.status === "pending").length);

  const nav = useMemo(
    () =>
      NAV.map((item) =>
        item.id === "approvals" && role === "manager"
          ? { ...item, badge: pendingCount }
          : item,
      ),
    [role, pendingCount],
  );

  function handleRequestStatusChange(id: string, status: LeaveStatus) {
    setRequests((current) =>
      current.map((request) =>
        request.id === id ? { ...request, status } : request,
      ),
    );
  }

  function handleRosterShiftCycle(employeeId: string, date: string) {
    const key = `${employeeId}:${date}`;
    setRoster((current) => {
      const index = SHIFT_CYCLE.indexOf(current[key] ?? "off");
      return {
        ...current,
        [key]: SHIFT_CYCLE[(index + 1) % SHIFT_CYCLE.length],
      };
    });
  }

  function handleEmployeeShiftChange(shiftId: "shift-1" | "shift-2") {
    const key = `${employee.id}:2026-09-30`;
    setRoster((current) => ({ ...current, [key]: shiftId }));
  }

  async function handleAddEmployee(draft: EmployeeDraft): Promise<void> {
    const response = await fetch("/api/manager/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: draft.employeeId,
        name: draft.name,
        email: draft.email,
        password: draft.password,
      }),
    });
    const result = (await response.json()) as {
      employee?: ManagedEmployeeRecord;
      error?: string;
    };
    if (!response.ok || !result.employee) {
      throw new Error(result.error ?? "Could not create employee.");
    }
    setEmployees((current) => [...current, toDirectoryEntry(result.employee!)]);
  }

  async function handleDeleteEmployee(id: string): Promise<void> {
    const response = await fetch(`/api/manager/employees/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(result.error ?? "Could not remove employee.");
    setEmployees((current) => current.filter((employee) => employee.id !== id));
  }

  const meta = META[active] ?? META.dashboard;
  const sidebarActive = active === "add-employee" ? "employees" : active;

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar items={nav} active={sidebarActive} role={role} onSelect={setActive} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={meta.title}
          subtitle={meta.subtitle}
          role={role}
          user={employee}
          alerts={alertCount}
          onLogout={() => {
            void fetch("/api/auth/logout", { method: "POST" })
              .catch(() => undefined)
              .finally(() => window.location.replace("/login"));
          }}
          onAlertsClick={() => setActive(role === "manager" ? "approvals" : "leave")}
        />

        {/* Mobile nav */}
        <MobileNav
          items={nav}
          active={sidebarActive}
          role={role}
          onSelect={setActive}
        />

        <main className="flex-1 p-5 lg:p-6">
            <View
            active={active}
            role={role}
            employee={employee}
            requests={visibleRequests}
            onRequestsChange={setRequests}
            onRequestStatusChange={handleRequestStatusChange}
            roster={roster}
            onRosterShiftCycle={handleRosterShiftCycle}
            onEmployeeShiftChange={handleEmployeeShiftChange}
            employees={employees}
            employeeDirectoryError={employeeDirectoryError}
            onAddEmployee={handleAddEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            onNavigateToAdd={() => setActive("add-employee")}
            onNavigateToEmployees={() => setActive("employees")}
          />
        </main>
      </div>
    </div>
  );
}

function View({
  active,
  role,
  employee,
  requests,
  onRequestsChange,
  onRequestStatusChange,
  roster,
  onRosterShiftCycle,
  onEmployeeShiftChange,
  employees,
  employeeDirectoryError,
  onAddEmployee,
  onDeleteEmployee,
  onNavigateToAdd,
  onNavigateToEmployees,
}: {
  active: string;
  role: Role;
  employee: AuthenticatedEmployee;
  requests: LeaveRequest[];
  onRequestsChange: (requests: LeaveRequest[] | ((current: LeaveRequest[]) => LeaveRequest[])) => void;
  onRequestStatusChange: (id: string, status: LeaveStatus) => void;
  roster: Record<string, ShiftId>;
  onRosterShiftCycle: (employeeId: string, date: string) => void;
  onEmployeeShiftChange: (shiftId: "shift-1" | "shift-2") => void;
  employees: EmployeeDirectoryEntry[];
  employeeDirectoryError: string;
  onAddEmployee: (employee: EmployeeDraft) => Promise<void>;
  onDeleteEmployee: (id: string) => Promise<void>;
  onNavigateToAdd: () => void;
  onNavigateToEmployees: () => void;
}) {
  if (active === "dashboard")
    return role === "manager" ? (
      <ManagerDashboard employees={employees} requests={requests} roster={roster} />
    ) : (
      <EmployeeDashboard employee={employee} requests={requests} roster={roster} />
    );
  if (active === "employees" && role === "manager")
    return (
      <EmployeeManagementView
        employees={employees}
        error={employeeDirectoryError}
        onDeleteEmployee={onDeleteEmployee}
        onNavigateToAdd={onNavigateToAdd}
      />
    );
  if (active === "add-employee" && role === "manager")
    return (
      <AddEmployeeView
        onAddEmployee={onAddEmployee}
        onCancel={onNavigateToEmployees}
        onCreated={onNavigateToEmployees}
      />
    );
  if (active === "roster")
    return (
      <RosterView
        employees={employees}
        roster={roster}
        onRosterShiftCycle={onRosterShiftCycle}
      />
    );
  if (active === "leave" && role === "employee")
    return (
      <LeaveView
        employee={employee}
        requests={requests}
        onRequestsChange={onRequestsChange}
      />
    );
  if (active === "attendance")
    return (
      <AttendanceView
        role={role}
        assignedShiftId={roster[`${employee.id}:2026-09-30`] ?? "shift-1"}
        onShiftChange={onEmployeeShiftChange}
      />
    );
  if (active === "approvals" && role === "manager")
    return (
      <ApprovalsView
        requests={requests}
        onStatusChange={onRequestStatusChange}
      />
    );
  if (active === "comp-off") return <CompOffView employees={employees} />;
  if (active === "reports" && role === "manager")
    return <ReportsView employees={employees} requests={requests} roster={roster} />;
  return null;
}

type ManagedEmployeeRecord = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "disabled";
  manager_id: string | null;
};

function toDirectoryEntry(user: ManagedEmployeeRecord): EmployeeDirectoryEntry {
  return {
    id: user.id,
    employeeId: user.user_id,
    name: user.name,
    email: user.email,
    category: user.role === "manager" ? "Manager" : "Employee",
  };
}

function MobileNav({
  items,
  active,
  role,
  onSelect,
}: {
  items: NavItem[];
  active: string;
  role: Role;
  onSelect: (id: string) => void;
}) {
  const visible = items.filter((i) => i.roles.includes(role));
  return (
    <div className="flex gap-1.5 overflow-x-auto border-b border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-950 lg:hidden">
      {visible.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            item.id === active
              ? "bg-indigo-600 text-white"
              : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
