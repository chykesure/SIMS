import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

function getUserId(request: Request): string {
  return request.headers.get("x-user-id") || "";
}

// GET /api/portal/student/assignments — Fetch assignments with submission status
export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);

    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID required" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID required" },
        { status: 400 }
      );
    }

    // Find user and student
    const user = await db.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user || (user.role || "").toUpperCase() !== "STUDENT" || !user.studentId) {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 }
      );
    }

    const student = await db.student.findFirst({
      where: { id: user.studentId, tenantId },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 }
      );
    }

    // Fetch all active assignments for the tenant
    const assignments = await db.assignment.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        classroom: {
          select: { id: true, name: true, subject: true, section: true },
        },
        _count: {
          select: { submissions: true },
        },
      },
    });

    // Fetch all submissions by this student
    const submissions = await db.submission.findMany({
      where: {
        tenantId,
        studentId: student.id,
      },
    });

    const submissionMap = new Map(submissions.map(s => [s.assignmentId, s]));

    // Build assignment list with submission status
    const now = new Date();
    const assignmentsWithStatus = assignments.map(assignment => {
      const submission = submissionMap.get(assignment.id);
      const isOverdue = assignment.dueDate && new Date(assignment.dueDate) < now && !submission;

      return {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        instructions: assignment.instructions,
        dueDate: assignment.dueDate,
        dueTime: assignment.dueTime,
        maxScore: assignment.maxScore,
        status: assignment.status,
        classroomName: assignment.classroom?.name || "",
        classroomSubject: assignment.classroom?.subject || "",
        classroomSection: assignment.classroom?.section || "",
        createdByName: assignment.createdByName,
        createdAt: assignment.createdAt,
        totalSubmissions: assignment._count.submissions,
        submission: submission
          ? {
              id: submission.id,
              content: submission.content,
              score: submission.score,
              feedback: submission.feedback,
              status: submission.status,
              submittedAt: submission.submittedAt,
              gradedAt: submission.gradedAt,
            }
          : null,
        submitted: !!submission,
        overdue: isOverdue,
      };
    });

    return NextResponse.json({
      success: true,
      data: assignmentsWithStatus,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch assignments: ${message}` },
      { status: 500 }
    );
  }
}
