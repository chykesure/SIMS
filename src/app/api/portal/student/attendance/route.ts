// src/app/api/portal/student/attendance/route.ts
// Student portal — my attendance records + summary

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/cbt";

export async function GET(request: Request) {
  try {
    const auth = await requireStudent(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
    }
    const { student } = auth;

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Record<string, unknown> = { tenantId: student.tenantId, studentId: student.id };
    if (from || to) {
      where.session = { date: {} } as Record<string, unknown>;
      const dateFilter = where.session as { date: Record<string, Date> };
      if (from) dateFilter.date.gte = new Date(`${from}T00:00:00`);
      if (to) dateFilter.date.lte = new Date(`${to}T23:59:59`);
    }

    const records = await db.attendanceRecord.findMany({
      where,
      orderBy: { markedAt: "desc" },
      take: 500,
      include: {
        session: { select: { id: true, class: true, subject: true, period: true, date: true } },
      },
    });

    const present = records.filter((r) => r.status === "PRESENT").length;
    const late = records.filter((r) => r.status === "LATE").length;
    const excused = records.filter((r) => r.status === "EXCUSED").length;
    const absent = records.filter((r) => r.status === "ABSENT").length;
    const counted = present + late + absent; // excused doesn't hurt the rate

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          present, absent, late, excused,
          rate: counted > 0 ? Math.round(((present + late) / counted) * 1000) / 10 : 0,
        },
        records,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ success: false, message: `Failed to load attendance: ${message}` }, { status: 500 });
  }
}