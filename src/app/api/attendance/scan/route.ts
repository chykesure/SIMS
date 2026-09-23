// src/app/api/attendance/scan/route.ts
// QR Attendance (Model A — Teacher Scanner):
// teacher scans a student's QR card -> validate chain -> mark PRESENT.
//
// Validation chain:
//   staff account -> session ACTIVE -> QR format SIMS1:<studentId>
//   -> student exists in THIS tenant -> student belongs to session's class
//   -> not already marked (idempotent on re-scan)

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantId, getUserId, isStaffRole, jsonError, parseStudentQr } from "@/lib/attendance";

export async function POST(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    if (!tenantId) return jsonError("Tenant ID required", 400);

    const user = userId ? await db.user.findFirst({ where: { id: userId, tenantId } }) : null;
    if (!user || !isStaffRole(user.role)) return jsonError("Access denied", 403);

    const body = await request.json();
    const { sessionId, payload } = body as { sessionId?: string; payload?: string };

    if (!sessionId) return jsonError("sessionId is required");
    if (!payload) return jsonError("QR payload is required");

    const session = await db.attendanceSession.findFirst({ where: { id: sessionId, tenantId } });
    if (!session) return jsonError("Attendance session not found", 404);
    if (session.status !== "ACTIVE") return jsonError("This register is closed — start a new session to scan", 409);

    const parsed = parseStudentQr(payload);
    if (!parsed.ok) return jsonError(parsed.message, 422);

    const student = await db.student.findFirst({ where: { id: parsed.studentId, tenantId } });
    if (!student) return jsonError("Student not found in your school", 404);
    if (student.class !== session.class) {
      return jsonError(`${student.fullname} is in ${student.class || "no class"}, not ${session.class}`, 409);
    }

    const existing = await db.attendanceRecord.findUnique({
      where: { sessionId_studentId: { sessionId, studentId: student.id } },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        data: {
          duplicate: true,
          student: { id: student.id, regNo: student.regNo, fullname: student.fullname, imageUrl: student.imageUrl },
          status: existing.status,
          markedAt: existing.markedAt,
        },
        message: `${student.fullname} was already marked ${existing.status.toLowerCase()}.`,
      });
    }

    const record = await db.attendanceRecord.create({
      data: {
        tenantId,
        sessionId,
        studentId: student.id,
        studentName: student.fullname,
        status: "PRESENT",
        method: "QR_TEACHER",
        markedBy: userId,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        duplicate: false,
        student: { id: student.id, regNo: student.regNo, fullname: student.fullname, imageUrl: student.imageUrl },
        status: record.status,
        markedAt: record.markedAt,
      },
      message: `Attendance recorded — ${student.fullname} is PRESENT.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ success: false, message: `Scan failed: ${message}` }, { status: 500 });
  }
}