import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  authorizeApiRole,
  databaseRequest,
  sessionCookieOptions,
} from "@/lib/server-auth";

export async function POST() {
  const auth = await authorizeApiRole();
  if (auth.user) {
    try {
      const query = new URLSearchParams({ id: `eq.${auth.user.databaseId}` });
      await databaseRequest(`users?${query.toString()}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ session_version: auth.user.session_version + 1 }),
      });
    } catch {
      const failure = NextResponse.json(
        { error: "Could not revoke the session. Please try again." },
        { status: 503 },
      );
      failure.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
      return failure;
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}