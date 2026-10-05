import { NextResponse } from "next/server";
import {
  authorizeApiRole,
  DatabaseError,
  databaseRequest,
} from "@/lib/server-auth";
import { getAttendanceDate } from "@/lib/attendance";

type AttendanceLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

type AttendanceBody = {
  location?: unknown;
  shiftId?: unknown;
};

function isLocation(value: unknown): value is AttendanceLocation {
  if (typeof value !== "object" || value === null) return false;
  if (!("latitude" in value) || !("longitude" in value) || !("accuracy" in value)) {
    return false;
  }
  return (
    typeof value.latitude === "number" &&
    Number.isFinite(value.latitude) &&
    value.latitude >= -90 &&
    value.latitude <= 90 &&
    typeof value.longitude === "number" &&
    Number.isFinite(value.longitude) &&
    value.longitude >= -180 &&
    value.longitude <= 180 &&
    typeof value.accuracy === "number" &&
    Number.isFinite(value.accuracy) &&
    value.accuracy >= 0
  );
}

function isShiftId(
  value: unknown,
): value is "shift-1" | "shift-2" | "off" | "leave" | "holiday-duty" {
  return (
    value === "shift-1" ||
    value === "shift-2" ||
    value === "off" ||
    value === "leave" ||
    value === "holiday-duty"
  );
}

function databaseFailure(error: unknown, action: string) {
  if (error instanceof DatabaseError) {
    console.error(
      `Attendance ${action} failed (status=${error.status}, code=${error.code ?? "none"})`,
    );
    if (error.status === 409) {
      return NextResponse.json(
        { error: "Attendance was updated in another request. Refresh and try again." },
        { status: 409 },
      );
    }
  } else {
    console.error(
      `Attendance ${action} failed (errorType=${error instanceof Error ? error.name : typeof error})`,
    );
  }
  return NextResponse.json(
    { error: "Could not update attendance. Try again shortly." },
    { status: 503 },
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  const auth = await authorizeApiRole("employee");
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const { action } = await params;
  if (action !== "check-in" && action !== "check-out") {
    return NextResponse.json({ error: "Attendance action not found." }, { status: 404 });
  }

  let body: AttendanceBody;
  try {
    body = (await request.json()) as AttendanceBody;
  } catch {
    return NextResponse.json({ error: "Invalid attendance request." }, { status: 400 });
  }
  if (!isLocation(body.location)) {
    return NextResponse.json(
      { error: "A valid device location is required for attendance." },
      { status: 400 },
    );
  }

  if (action === "check-in" && !isShiftId(body.shiftId)) {
    return NextResponse.json({ error: "Select a valid shift before checking in." }, { status: 400 });
  }

  const date = getAttendanceDate();
  try {
    if (action === "check-in") {
      await databaseRequest<{ id: string }[]>("attendance?select=id", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          user_id: auth.user.databaseId,
          attendance_date: date,
          shift_id: body.shiftId,
          check_in_latitude: body.location.latitude,
          check_in_longitude: body.location.longitude,
          check_in_accuracy_m: body.location.accuracy,
        }),
      });
    } else {
      const query = new URLSearchParams({
        user_id: `eq.${auth.user.databaseId}`,
        attendance_date: `eq.${date}`,
        check_out_at: "is.null",
        select: "id",
      });
      const rows = await databaseRequest<{ id: string }[]>(`attendance?${query.toString()}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          check_out_at: new Date().toISOString(),
          check_out_latitude: body.location.latitude,
          check_out_longitude: body.location.longitude,
          check_out_accuracy_m: body.location.accuracy,
          status: "completed",
        }),
      });
      if (rows.length === 0) {
        return NextResponse.json(
          { error: "No open check-in was found for today. Refresh attendance and try again." },
          { status: 409 },
        );
      }
    }
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return databaseFailure(error, action);
  }
}
