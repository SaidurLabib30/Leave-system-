import { NextResponse } from "next/server";
import { authorizeApiRole, databaseRequest, type ManagedUser } from "@/lib/server-auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  const auth = await authorizeApiRole("manager");
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const { employeeId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(employeeId)) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  try {
    const query = new URLSearchParams({
      id: `eq.${employeeId}`,
      role: "eq.employee",
      select: "id",
    });
    query.set("manager_id", `eq.${auth.user.databaseId}`);
    const deleted = await databaseRequest<Pick<ManagedUser, "id">[]>(
      `users?${query.toString()}`,
      {
        method: "DELETE",
        headers: { Prefer: "return=representation" },
      },
    );
    if (deleted.length === 0) {
      return NextResponse.json({ error: "Employee not found in your team." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Could not remove the employee account." }, { status: 503 });
  }
}