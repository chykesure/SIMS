// src/app/api/attendance/records/route.ts
// Records — bulk mark (manual register) & student attendance history

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantId, getUserId, isStaffRole, jsonError } from "@/lib/attendance";

const VALID = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;

export async function POST(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    if (!tenantId) return jsonError("Tenant ID required", 400);

    const user = userId ? await db.user.findFirst({ where: { id: userId, tenantId } }) : null;
    if (!user || !isStaffRole(user.role)) return jsonError("Access denied", 403);

    const body = await request.json();
    const { sessionId, marks } = body as { sessionId?: string; marks?: { studentId: string; studentName?: string; status: string }[] };

    if (!sessionId) return jsonError("sessionId is required");
    if (!Array.isArray(marks) || marks.length === 0) return jsonError("marks array is required");

    const session = await db.attendanceSession.findFirst({ where: { id: sessionId, tenantId } });
    if (!session) return jsonError("Session not found", 404);
    if (session.status !== "ACTIVE") return jsonError("This register is closed — reopen it to edit marks", 409);

    const cleaned = marks.filter((m) => m?.studentId && VALID.includes(m.status as typeof VALID[number]));
    if (cleaned.length === 0) return jsonError("No valid marks supplied");

    const now = new Date();
    await db.$transaction(
      cleaned.map((m) =>
        db.attendanceRecord.upsert({
          where: { sessionId_studentId: { sessionId, studentId: m.studentId } },
          create: {
            tenantId,
            sessionId,
            studentId: m.studentId,
            status: m.status as typeof VALID[number],
            method: session.mode === "QR_TEACHER" ? "QR_TEACHER" : "MANUAL",
            markedBy: userId,
            markedAt: now,
            studentName: m.studentName || "",
          },
          update: {
            status: m.status as typeof VALID[number],
            markedBy: userId,
            markedAt: now,
          },
        })
      )
    );

    return NextResponse.json({ success: true, data: { saved: cleaned.length }, message: `Saved ${cleaned.length} attendance mark(s)` });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ success: false, message: `Failed to save marks: ${message}` }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) return jsonError("Tenant ID required", 400);

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Record<string, unknown> = { tenantId };
    if (studentId) where.studentId = studentId;
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
        session: {
          select: { id: true, class: true, subject: true, period: true, date: true, status: true },
        },
      },
    });

    // Student summary when looking up one student
    let summary: { present: number; absent: number; late: number; excused: number; rate: number } | null = null;
    if (studentId) {
      const present = records.filter((r) => r.status === "PRESENT").length;
      const late = records.filter((r) => r.status === "LATE").length;
      const excused = records.filter((r) => r.status === "EXCUSED").length;
      const absent = records.filter((r) => r.status === "ABSENT").length;
      const counted = present + late + absent; // excused doesn't hurt the rate
      summary = {
        present, absent, late, excused,
        rate: counted > 0 ? Math.round(((present + late) / counted) * 1000) / 10 : 0,
      };
    }

    return NextResponse.json({ success: true, data: { records, summary } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ success: false, message: `Failed to fetch records: ${message}` }, { status: 500 });
  }
}