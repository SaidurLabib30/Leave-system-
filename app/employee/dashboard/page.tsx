import { AppShell } from "@/components/layout/AppShell";
import { requirePageRole, toPublicUser } from "@/lib/server-auth";

export default async function EmployeeDashboardPage() {
  const user = await requirePageRole("employee");
  return <AppShell employee={toPublicUser(user)} role="employee" />;
}