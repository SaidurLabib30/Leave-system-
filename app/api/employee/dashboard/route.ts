import { NextResponse } from "next/server";
import {
  authorizeApiRole,
  getManagedUsers,
  toPublicUser,
  type ManagedUser,
} from "@/lib/server-auth";

export async function GET() {
  const auth = await authorizeApiRole("employee");
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }
  try {
    const team = auth.user.manager_id
      ? await getManagedUsers(auth.user.manager_id)
      : [];
    const employee: ManagedUser = {
      id: auth.user.databaseId,
      user_id: auth.user.user_id,
      name: auth.user.name,
      email: auth.user.email,
      role: auth.user.role,
      status: auth.user.status,
      manager_id: auth.user.manager_id,
    };
    const teamMembers = team.some((member) => member.id === employee.id)
      ? team
      : [...team, employee];
    const employees = teamMembers.map((member) => ({
      id: member.user_id,
      user_id: member.user_id,
      name: member.name,
      email: "",
      role: member.role,
      status: member.status,
      manager_id: null,
    }));
    return NextResponse.json({ user: toPublicUser(auth.user), employees });
  } catch {
    return NextResponse.json({ error: "Could not load employee dashboard data." }, { status: 503 });
  }
}