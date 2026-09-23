// src/app/api/attendance/dashboard/route.ts
// Attendance dashboard — today's counts, per-class breakdown, recent sessions

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantId, jsonError } from "@/lib/attendance";

export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) return jsonError("Tenant ID required", 400);

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date") || new Date().toISOString().slice(0, 10);
    const dayStart = new Date(`${dateStr}T00:00:00`);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const sessions = await db.attendanceSession.findMany({
      where: { tenantId, date: { gte: dayStart, lt: dayEnd } },
      include: { records: { select: { status: true, studentId: true } } },
    });

    const records = sessions.flatMap((s) => s.records);
    const present = records.filter((r) => r.status === "PRESENT").length;
    const absent = records.filter((r) => r.status === "ABSENT").length;
    const late = records.filter((r) => r.status === "LATE").length;
    const excused = records.filter((r) => r.status === "EXCUSED").length;
    const marked = records.length;

    // Not marked = students in classes with sessions today who have no record in any of those sessions
    const classesWithSessions = [...new Set(sessions.map((s) => s.class))];
    let notMarked = 0;
    if (classesWithSessions.length > 0) {
      const students = await db.student.findMany({
        where: { tenantId, class: { in: classesWithSessions } },
        select: { id: true },
      });
      const markedIds = new Set(records.map((r) => r.studentId));
      notMarked = students.filter((s) => !markedIds.has(s.id)).length;
    }

    // Per-class breakdown (uses each class's largest session to avoid double counting)
    const byClass: { class: string; present: number; total: number; rate: number }[] = [];
    for (const klass of classesWithSessions.sort()) {
      const classSessions = sessions.filter((s) => s.class === klass);
      const ids = new Map<string, string>();
      for (const s of classSessions) for (const r of s.records) ids.set(r.studentId, r.status);
      const vals = [...ids.values()];
      const p = vals.filter((v) => v === "PRESENT" || v === "LATE").length;
      const total = vals.length;
      byClass.push({ class: klass, present: p, total, rate: total > 0 ? Math.round((p / total) * 100) : 0 });
    }

    const activeSessions = sessions.filter((s) => s.status === "ACTIVE");

    return NextResponse.json({
      success: true,
      data: {
        date: dateStr,
        summary: { present, absent, late, excused, notMarked, marked },
        sessionsToday: sessions.length,
        activeSessions: activeSessions.length,
        byClass,
        recent: sessions
          .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
          .slice(0, 8)
          .map((s) => ({
            id: s.id, class: s.class, subject: s.subject, period: s.period,
            mode: s.mode, status: s.status, teacherName: s.teacherName,
            recordCount: s.records.length,
          })),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ success: false, message: `Failed to load dashboard: ${message}` }, { status: 500 });
  }
}