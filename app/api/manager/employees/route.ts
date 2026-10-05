import { NextResponse } from "next/server";
import {
  authorizeApiRole,
  databaseRequest,
  createSupabaseAuthUser,
  deleteSupabaseAuthUser,
  getManagedUsers,
  hashPassword,
  SupabaseAdminError,
  type ManagedUser,
} from "@/lib/server-auth";

type CreateEmployeeBody = {
  user_id?: unknown;
  name?: unknown;
  email?: unknown;
  password?: unknown;
};

export async function GET() {
  const auth = await authorizeApiRole("manager");
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }
  try {
    return NextResponse.json({
      employees: await getManagedUsers(auth.user.databaseId),
    });
  } catch {
    return NextResponse.json({ error: "Could not load assigned employees." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await authorizeApiRole("manager");
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  let body: CreateEmployeeBody;
  try {
    body = (await request.json()) as CreateEmployeeBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const userId = typeof body.user_id === "string" ? body.user_id.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (
    !/^[A-Za-z0-9._-]{1,64}$/.test(userId) ||
    !name || name.length > 120 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
    password.length < 8 || password.length > 128
  ) {
    return NextResponse.json(
      { error: "Enter a valid employee ID, name, email, and password (8-128 characters)." },
      { status: 400 },
    );
  }

  try {
    const passwordHash = await hashPassword(password);
    const authUser = await createSupabaseAuthUser(email, password, name);
    let created: ManagedUser[];
    try {
      created = await databaseRequest<ManagedUser[]>("users", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          auth_user_id: authUser.id,
          user_id: userId,
          name,
          email,
          password_hash: passwordHash,
          role: "employee",
          status: "active",
          manager_id: auth.user.databaseId,
        }),
      });
    } catch (error) {
      try {
        await deleteSupabaseAuthUser(authUser.id);
      } catch (cleanupError) {
        console.error(
          `Failed to clean up Supabase Auth user after application account creation failed (userId=${authUser.id}, errorType=${cleanupError instanceof Error ? cleanupError.name : typeof cleanupError})`,
        );
        throw new Error("Could not clean up the Supabase Auth user after account creation failed.", {
          cause: cleanupError,
        });
      }
      throw error;
    }
    return NextResponse.json({ employee: created[0] }, { status: 201 });
  } catch (error) {
    if (
      error instanceof SupabaseAdminError &&
      (error.code === "email_exists" || error.code === "user_already_exists")
    ) {
      return NextResponse.json(
        { error: "That employee ID or email is already in use." },
        { status: 409 },
      );
    }
    if (error instanceof Error && "status" in error && error.status === 409) {
      return NextResponse.json(
        { error: "That employee ID or email is already in use." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Could not create the employee account." }, { status: 503 });
  }
}