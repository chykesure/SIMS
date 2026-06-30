import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

function getUserId(request: Request): string {
  return request.headers.get("x-user-id") || "";
}

// POST /api/portal/student/assignments/[id] — Submit an assignment
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assignmentId } = await params;
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

    if (!user || user.role !== "STUDENT" || !user.studentId) {
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

    // Verify assignment exists
    const assignment = await db.assignment.findFirst({
      where: { id: assignmentId, tenantId },
    });

    if (!assignment) {
      return NextResponse.json(
        { success: false, message: "Assignment not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { content, attachmentUrl } = body;

    if (!content && !attachmentUrl) {
      return NextResponse.json(
        { success: false, message: "Please provide content or an attachment" },
        { status: 400 }
      );
    }

    // Check for existing submission (same assignmentId + studentId)
    const existing = await db.submission.findFirst({
      where: { tenantId, assignmentId, studentId: student.id },
    });

    if (existing) {
      // Update existing submission
      const submission = await db.submission.update({
        where: { id: existing.id },
        data: {
          content: content || "",
          attachmentUrl: attachmentUrl || "",
          status: "submitted",
          submittedAt: new Date(),
          feedback: "",
          score: 0,
          gradedAt: null,
          gradedBy: "",
          gradedByName: "",
        },
      });

      return NextResponse.json({
        success: true,
        data: submission,
        updated: true,
        message: "Submission updated successfully",
      });
    }

    // Create new submission
    const submission = await db.submission.create({
      data: {
        tenantId,
        assignmentId,
        studentId: student.id,
        studentName: student.fullname,
        studentRegNo: student.regNo,
        content: content || "",
        attachmentUrl: attachmentUrl || "",
        score: 0,
        feedback: "",
        gradedBy: "",
        gradedByName: "",
        status: "submitted",
        submittedAt: new Date(),
      },
    });

    return NextResponse.json(
      { success: true, data: submission, updated: false, message: "Assignment submitted successfully" },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to submit assignment: ${message}` },
      { status: 500 }
    );
  }
}
