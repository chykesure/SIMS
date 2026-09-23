// src/app/api/attendance/sessions/[id]/route.ts
// Attendance session — roster with marks, close/reopen, delete

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantId, getUserId, isStaffRole, jsonError, classRoster } from "@/lib/attendance";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = getTenantId(request);
    if (!tenantId) return jsonError("Tenant ID required", 400);

    const session = await db.attendanceSession.findFirst({ where: { id, tenantId } });
    if (!session) return jsonError("Session not found", 404);

    const [students, records] = await Promise.all([
      classRoster(tenantId, session.class),
      db.attendanceRecord.findMany({ where: { tenantId, sessionId: id } }),
    ]);

    const byStudent = new Map(records.map((r) => [r.studentId, r]));
    const roster = students.map((s) => {
      const rec = byStudent.get(s.id);
      return {
        studentId: s.id,
        regNo: s.regNo,
        fullname: s.fullname,
        imageUrl: s.imageUrl,
        status: rec?.status ?? null, // null = not marked yet
        method: rec?.method ?? null,
        markedAt: rec?.markedAt ?? null,
      };
    });

    return NextResponse.json({ success: true, data: { session, roster } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ success: false, message: `Failed to load session: ${message}` }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    if (!tenantId) return jsonError("Tenant ID required", 400);

    const user = userId ? await db.user.findFirst({ where: { id: userId, tenantId } }) : null;
    if (!user || !isStaffRole(user.role)) return jsonError("Access denied", 403);

    const session = await db.attendanceSession.findFirst({ where: { id, tenantId } });
    if (!session) return jsonError("Session not found", 404);

    const body = await request.json();
    const status = body?.status;
    if (!["ACTIVE", "CLOSED"].includes(status)) return jsonError("status must be ACTIVE or CLOSED");

    const updated = await db.attendanceSession.update({ where: { id }, data: { status } });
    return NextResponse.json({ success: true, data: updated, message: status === "CLOSED" ? "Register closed" : "Register reopened" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ success: false, message: `Failed to update session: ${message}` }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    if (!tenantId) return jsonError("Tenant ID required", 400);

    const user = userId ? await db.user.findFirst({ where: { id: userId, tenantId } }) : null;
    if (!user || !isStaffRole(user.role)) return jsonError("Access denied", 403);

    const session = await db.attendanceSession.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { records: true } } },
    });
    if (!session) return jsonError("Session not found", 404);

    const force = new URL(request.url).searchParams.get("force") === "true";
    if (session._count.records > 0 && !force) {
      return jsonError(
        `This register has ${session._count.records} attendance record(s). Add ?force=true to delete them too.`,
        409
      );
    }

    await db.$transaction([
      db.attendanceRecord.deleteMany({ where: { sessionId: id } }),
      db.attendanceSession.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true, message: "Session deleted" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ success: false, message: `Failed to delete session: ${message}` }, { status: 500 });
  }
}