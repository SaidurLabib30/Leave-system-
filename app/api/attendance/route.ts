import { NextResponse } from "next/server";
import {
  authorizeApiRole,
  DatabaseError,
  databaseRequest,
  getManagedUsers,
} from "@/lib/server-auth";
import { getAttendanceDate } from "@/lib/attendance";
import type { ShiftId } from "@/lib/types";

type AttendanceRow = {
  id: string;
  user_id: string;
  attendance_date: string;
  shift_id: ShiftId;
  check_in_at: string;
  check_in_latitude: number;
  check_in_longitude: number;
  check_in_accuracy_m: number;
  check_out_at: string | null;
  check_out_latitude: number | null;
  check_out_longitude: number | null;
  check_out_accuracy_m: number | null;
  status: string;
  user?: { user_id: string; name: string } | null;
};

function toAttendanceRecord(row: AttendanceRow) {
  const dutyTimeMinutes = row.check_out_at
    ? Math.max(
        0,
        Math.floor(
          (new Date(row.check_out_at).getTime() - new Date(row.check_in_at).getTime()) /
            60_000,
        ),
      )
    : null;
  return {
    id: row.id,
    date: row.attendance_date,
    checkInTime: row.check_in_at,
    checkOutTime: row.check_out_at,
    dutyTimeMinutes,
    status: row.status,
    shiftId: row.shift_id,
    employeeName: row.user?.name,
    employeeCode: row.user?.user_id,
    checkInLocation: {
      latitude: row.check_in_latitude,
      longitude: row.check_in_longitude,
      accuracy: row.check_in_accuracy_m,
    },
    checkOutLocation:
      row.check_out_latitude === null ||
      row.check_out_longitude === null ||
      row.check_out_accuracy_m === null
        ? null
        : {
            latitude: row.check_out_latitude,
            longitude: row.check_out_longitude,
            accuracy: row.check_out_accuracy_m,
          },
  };
}

export async function GET() {
  const auth = await authorizeApiRole();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  try {
    const employees =
      auth.user.role === "manager"
        ? await getManagedUsers(auth.user.databaseId)
        : [];
    const userIds =
      auth.user.role === "manager"
        ? employees.map((employee) => employee.id)
        : [auth.user.databaseId];

    let rows: AttendanceRow[] = [];
    if (userIds.length > 0) {
      const query = new URLSearchParams({
        select:
          "id,user_id,attendance_date,shift_id,check_in_at,check_in_latitude,check_in_longitude,check_in_accuracy_m,check_out_at,check_out_latitude,check_out_longitude,check_out_accuracy_m,status,user:users!attendance_user_id_fkey(user_id,name)",
        user_id: `in.(${userIds.join(",")})`,
        order: "attendance_date.desc,check_in_at.desc",
        limit: "500",
      });
      rows = await databaseRequest<AttendanceRow[]>(`attendance?${query.toString()}`);
    }

    const today = getAttendanceDate();
    const history = rows.map(toAttendanceRecord);
    const todayRecord =
      auth.user.role === "employee"
        ? history.find((record) => record.date === today) ?? null
        : null;

    return NextResponse.json(
      {
        today: todayRecord,
        history,
        employees: employees.map((employee) => ({
          employeeCode: employee.user_id,
          name: employee.name,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      console.error(
        `Attendance lookup failed (status=${error.status}, code=${error.code ?? "none"})`,
      );
    } else {
      console.error(
        `Attendance lookup failed (errorType=${error instanceof Error ? error.name : typeof error})`,
      );
    }
    return NextResponse.json(
      { error: "Could not load attendance. Try again shortly." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
