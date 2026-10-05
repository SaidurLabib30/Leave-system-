import { NextResponse } from "next/server";
import {
  authorizeApiRole,
  getManagedUsers,
  toPublicUser,
} from "@/lib/server-auth";

export async function GET() {
  const auth = await authorizeApiRole("manager");
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }
  try {
    const employees = await getManagedUsers(auth.user.databaseId);
    return NextResponse.json({
      user: toPublicUser(auth.user),
      employees,
      stats: { teamSize: employees.length },
    });
  } catch {
    return NextResponse.json({ error: "Could not load manager dashboard data." }, { status: 503 });
  }
}