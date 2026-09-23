// src/app/api/attendance/sessions/route.ts
// Attendance sessions — list & create-or-open

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantId, getUserId, isStaffRole, jsonError } from "@/lib/attendance";

export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) return jsonError("Tenant ID required", 400);

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date"); // yyyy-mm-dd
    const klass = searchParams.get("class") || "";
    const status = searchParams.get("status") || "";
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limit = Math.min(200, Number(searchParams.get("limit")) || 50);

    const where: Record<string, unknown> = { tenantId };
    if (date) {
      const d = new Date(`${date}T00:00:00`);
      const next = new Date(d.getTime() + 24 * 60 * 60 * 1000);
      where.date = { gte: d, lt: next };
    }
    if (from && to) {
      where.date = { gte: new Date(`${from}T00:00:00`), lte: new Date(`${to}T23:59:59`) };
    }
    if (klass) where.class = klass;
    if (["ACTIVE", "CLOSED"].includes(status)) where.status = status;

    const sessions = await db.attendanceSession.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: limit,
      include: {
        _count: { select: { records: true } },
        records: { select: { status: true } },
      },
    });

    const shaped = sessions.map((s) => ({
      id: s.id,
      class: s.class,
      subject: s.subject,
      period: s.period,
      date: s.date,
      mode: s.mode,
      status: s.status,
      teacherName: s.teacherName,
      createdAt: s.createdAt,
      recordCount: s._count.records,
      present: s.records.filter((r) => r.status === "PRESENT").length,
      absent: s.records.filter((r) => r.status === "ABSENT").length,
      late: s.records.filter((r) => r.status === "LATE").length,
      excused: s.records.filter((r) => r.status === "EXCUSED").length,
    }));

    return NextResponse.json({ success: true, data: shaped });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ success: false, message: `Failed to fetch sessions: ${message}` }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    if (!tenantId) return jsonError("Tenant ID required", 400);

    const user = userId ? await db.user.findFirst({ where: { id: userId, tenantId } }) : null;
    if (!user || !isStaffRole(user.role)) return jsonError("Access denied", 403);

    const body = await request.json();
    const { class: klass, subject, period, date, mode } = body;

    if (!klass?.trim()) return jsonError("Class is required");
    const dateStr = typeof date === "string" && date ? date : new Date().toISOString().slice(0, 10);
    const dayStart = new Date(`${dateStr}T00:00:00`);
    if (isNaN(dayStart.getTime())) return jsonError("Invalid date");
    const attendanceMode = ["MANUAL", "QR_TEACHER", "QR_STUDENT"].includes(mode) ? mode : "MANUAL";

    // One register per class/subject/period/day — open existing instead of duplicating
    const existing = await db.attendanceSession.findUnique({
      where: {
        tenantId_class_subject_period_date: {
          tenantId,
          class: klass.trim(),
          subject: (subject || "").trim(),
          period: (period || "").trim(),
          date: dayStart,
        },
      },
    });

    if (existing) {
      const teacherName = user.username || user.email || "Staff";
      const updated = await db.attendanceSession.update({
        where: { id: existing.id },
        data: { status: "ACTIVE", teacherId: userId, teacherName },
      });
      return NextResponse.json({ success: true, data: updated, message: "Opened existing register for this class & date" });
    }

    const session = await db.attendanceSession.create({
      data: {
        tenantId,
        class: klass.trim(),
        subject: (subject || "").trim(),
        period: (period || "").trim(),
        date: dayStart,
        mode: attendanceMode,
        status: "ACTIVE",
        teacherId: userId,
        teacherName: user.username || user.email || "Staff",
      },
    });

    return NextResponse.json({ success: true, data: session, message: "Attendance session started" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ success: false, message: `Failed to start session: ${message}` }, { status: 500 });
  }
}