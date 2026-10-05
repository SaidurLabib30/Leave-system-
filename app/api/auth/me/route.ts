import { NextResponse } from "next/server";
import { authorizeApiRole, toPublicUser } from "@/lib/server-auth";

export async function GET() {
  const auth = await authorizeApiRole();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }
  return NextResponse.json({ user: toPublicUser(auth.user) });
}