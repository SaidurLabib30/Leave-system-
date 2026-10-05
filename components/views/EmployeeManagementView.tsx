"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PlusIcon, XIcon } from "@/components/ui/icons";

export type EmployeeCategory = "Employee" | "Manager";

export interface EmployeeDirectoryEntry {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  category: EmployeeCategory;
}

export interface EmployeeDraft {
  employeeId: string;
  name: string;
  email: string;
  password: string;
  category: EmployeeCategory;
}

interface EmployeeManagementViewProps {
  employees: EmployeeDirectoryEntry[];
  error: string;
  onDeleteEmployee: (id: string) => Promise<void>;
  onNavigateToAdd: () => void;
}

export function EmployeeManagementView({
  employees,
  error,
  onDeleteEmployee,
  onNavigateToAdd,
}: EmployeeManagementViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [category, setCategory] = useState<"All" | EmployeeCategory>("All");
  const [notice, setNotice] = useState("");
  const [noticeIsError, setNoticeIsError] = useState(false);
  const selectedEmployee = employees.find((employee) => employee.id === selectedId);
  const filteredEmployees = employees.filter(
    (employee) => category === "All" || employee.category === category,
  );

  async function deleteEmployee(employee: EmployeeDirectoryEntry) {
    if (!window.confirm(`Delete ${employee.name} from the employee directory?`)) {
      return;
    }
    try {
      await onDeleteEmployee(employee.id);
      if (selectedId === employee.id) setSelectedId(null);
      setNoticeIsError(false);
      setNotice(`${employee.name} was removed from your team.`);
    } catch (requestError) {
      setNoticeIsError(true);
      setNotice(
        requestError instanceof Error ? requestError.message : "Could not remove employee.",
      );
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Employee Directory"
          subtitle={`Manage employee information · ${employees.length} employees`}
          action={
            <Button
              type="button"
              size="md"
              onClick={onNavigateToAdd}
            >
              <PlusIcon className="h-4 w-4" /> Add Employee
            </Button>
          }
        />
        <CardBody className="space-y-4">
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
            >
              {error}
            </p>
          )}
          {notice && (
            <p
              role="status"
              className={`rounded-lg border px-3 py-2 text-sm ${noticeIsError ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300" : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"}`}
            >
              {notice}
            </p>
          )}
          <label className="block max-w-xs">
            <span className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Employee Category
            </span>
            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as "All" | EmployeeCategory)
              }
              className="input"
            >
              <option value="All">All</option>
              <option value="Employee">Employee</option>
              <option value="Manager">Manager</option>
            </select>
          </label>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Employee ID</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => (
                  <tr
                    key={employee.id}
                    className="border-b border-zinc-50 last:border-0 dark:border-zinc-800/60"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar initials={initials(employee.name)} size="md" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-zinc-800 dark:text-zinc-100">
                            {employee.name}
                          </p>
                          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                            {employee.email || "Email not provided"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {employee.employeeId}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-zinc-600 dark:text-zinc-300">
                      {employee.category}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <EmployeeActions
                        employee={employee}
                        selected={selectedId === employee.id}
                        onView={() =>
                          setSelectedId((current) =>
                            current === employee.id ? null : employee.id,
                          )
                        }
                        onDelete={() => deleteEmployee(employee)}
                      />
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-sm text-zinc-400">
                      No employees in the directory.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="space-y-2 md:hidden">
            {filteredEmployees.map((employee) => (
              <div
                key={employee.id}
                className="rounded-xl border border-zinc-100 p-3 dark:border-zinc-800"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <Avatar initials={initials(employee.name)} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
                      {employee.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {employee.email || "Email not provided"}
                    </p>
                    <span className="mt-2 inline-flex rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {employee.employeeId}
                    </span>
                    <span className="ml-2 inline-flex rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {employee.category}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex justify-end border-t border-zinc-100 pt-2 dark:border-zinc-800">
                  <EmployeeActions
                    employee={employee}
                    selected={selectedId === employee.id}
                    onView={() =>
                      setSelectedId((current) =>
                        current === employee.id ? null : employee.id,
                      )
                    }
                    onDelete={() => deleteEmployee(employee)}
                  />
                </div>
              </div>
            ))}
            {employees.length === 0 && (
              <p className="py-10 text-center text-sm text-zinc-400">
                No employees in the directory.
              </p>
            )}
          </div>
        </CardBody>
      </Card>

      {selectedEmployee && (
        <Card>
          <CardHeader title="Employee Information" subtitle={selectedEmployee.name} />
          <CardBody className="grid gap-4 sm:grid-cols-3">
            <Detail label="Employee Name" value={selectedEmployee.name} />
            <Detail label="Employee ID" value={selectedEmployee.employeeId} />
            <Detail label="Employee Email" value={selectedEmployee.email || "--"} />
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function EmployeeActions({
  employee,
  selected,
  onView,
  onDelete,
}: {
  employee: EmployeeDirectoryEntry;
  selected: boolean;
  onView: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        aria-expanded={selected}
        aria-label={`${selected ? "Hide" : "View"} ${employee.name} details`}
        onClick={onView}
      >
        {selected ? "Hide details" : "View details"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
        aria-label={`Delete ${employee.name}`}
        onClick={onDelete}
      >
        Delete
      </Button>
    </div>
  );
}

function FormField({
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-100">
        {value}
      </p>
    </div>
  );
}

export function AddEmployeeView({
  onAddEmployee,
  onCancel,
  onCreated,
}: {
  onAddEmployee: (employee: EmployeeDraft) => Promise<void>;
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [draft, setDraft] = useState<EmployeeDraft>({
    employeeId: "",
    name: "",
    email: "",
    password: "",
    category: "Employee",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await onAddEmployee(draft);
      setDraft({
        employeeId: "",
        name: "",
        email: "",
        password: "",
        category: "Employee",
      });
      onCreated();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Could not create employee.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          <XIcon className="h-4 w-4" /> Cancel
        </Button>
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Add Employee
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Enter the new employee&apos;s details
          </p>
        </div>
      </div>
      <Card>
        <CardHeader title="Employee Information" subtitle="All fields are required" />
        <CardBody>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <FormField label="Employee Name">
              <input
                required
                autoComplete="name"
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                className="input"
              />
            </FormField>
            <FormField label="Employee Email">
              <input
                required
                type="email"
                autoComplete="email"
                value={draft.email}
                onChange={(event) => setDraft({ ...draft, email: event.target.value })}
                className="input"
              />
            </FormField>
            <FormField label="Employee ID">
              <input
                required
                value={draft.employeeId}
                onChange={(event) => setDraft({ ...draft, employeeId: event.target.value })}
                className="input"
              />
            </FormField>
            <FormField label="Role / Category">
              <input value="Employee" readOnly className="input" />
            </FormField>
            <FormField label="Password">
              <input
                required
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={draft.password}
                onChange={(event) => setDraft({ ...draft, password: event.target.value })}
                className="input"
              />
            </FormField>
            {error && (
              <p role="alert" className="text-sm text-rose-600 dark:text-rose-400 sm:col-span-2">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="secondary" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                <PlusIcon className="h-4 w-4" /> {submitting ? "Creating..." : "Create Employee"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}