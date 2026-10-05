import { AppShell } from "@/components/layout/AppShell";
import { requirePageRole, toPublicUser } from "@/lib/server-auth";

export default async function ManagerDashboardPage() {
  const user = await requirePageRole("manager");
  return <AppShell employee={toPublicUser(user)} role="manager" />;
}