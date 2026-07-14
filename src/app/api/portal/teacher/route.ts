import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

function getUserId(request: Request): string {
  return request.headers.get("x-user-id") || "";
}

// GET /api/portal/teacher — Teacher dashboard info
export async function GET(request: Request) {
  try {
    let tenantId = getTenantId(request);
    let userId = getUserId(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID required" },
        { status: 400 }
      );
    }

    // Resolve impersonation: "impersonated-admin" → real teacher user
    if (userId === "impersonated-admin") {
      if (!tenantId) {
        return NextResponse.json(
          { success: false, message: "Tenant ID required for impersonation" },
          { status: 400 }
        );
      }
      const realUser = await db.user.findFirst({
        where: { tenantId, role: { in: ["TEACHER", "Teacher", "teacher"] } },
      });
      if (realUser) {
        userId = realUser.id;
      }
    }

    // If tenantId not provided via header, get it from the user record
    if (!tenantId) {
      const foundUser = await db.user.findFirst({
        where: { id: userId },
        select: { tenantId: true },
      });
      if (foundUser) {
        tenantId = foundUser.tenantId;
      }
    }

    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Could not determine tenant" },
        { status: 400 }
      );
    }

    // Find User to get teacherId
    const user = await db.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user || !user.teacherId) {
      return NextResponse.json(
        { success: false, message: "Teacher not found" },
        { status: 404 }
      );
    }

    // Fetch Teacher record
    const teacher = await db.teacher.findFirst({
      where: { id: user.teacherId, tenantId },
    });

    if (!teacher) {
      return NextResponse.json(
        { success: false, message: "Teacher record not found" },
        { status: 404 }
      );
    }

    // Count students in tenant
    const studentCount = await db.student.count({
      where: { tenantId },
    });

    // Count total exam scores
    const examScoreCount = await db.examScore.count({
      where: { tenantId },
    });

    // Count teacher's assignments
    const assignmentCount = await db.assignment.count({
      where: { tenantId, createdBy: teacher.id },
    });

    // Count teacher's announcements
    const announcementCount = await db.announcement.count({
      where: { tenantId, createdBy: teacher.id },
    });

    // Count pending submissions (submitted but not graded)
    const teacherAssignments = await db.assignment.findMany({
      where: { tenantId, createdBy: teacher.id },
      select: { id: true },
    });
    const assignmentIds = teacherAssignments.map((a) => a.id);

    let pendingSubmissions = 0;
    if (assignmentIds.length > 0) {
      pendingSubmissions = await db.submission.count({
        where: {
          tenantId,
          assignmentId: { in: assignmentIds },
          status: "submitted",
          score: 0,
        },
      });
    }

    // Subjects taught
    const subjects = teacher.subject
      ? teacher.subject.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    return NextResponse.json({
      success: true,
      data: {
        teacher: {
          id: teacher.id,
          fullname: teacher.fullname,
          subject: teacher.subject,
          gender: teacher.gender,
          phone: teacher.phone,
          email: teacher.email,
          active: teacher.active,
          imageUrl: teacher.imageUrl,
        },
        stats: {
          studentCount,
          examScoreCount,
          assignmentCount,
          announcementCount,
          pendingSubmissions,
          subjectsTaught: subjects.length,
        },
        subjects,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch teacher info: ${message}` },
      { status: 500 }
    );
  }
}