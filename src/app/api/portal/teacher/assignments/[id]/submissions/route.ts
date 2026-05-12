import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

function getUserId(request: Request): string {
  return request.headers.get("x-user-id") || "";
}

// GET /api/portal/teacher/assignments/[id]/submissions — Fetch submissions for an assignment
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID required" },
        { status: 400 }
      );
    }

    const { id } = await params;

    const submissions = await db.submission.findMany({
      where: { tenantId, assignmentId: id },
      orderBy: { submittedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: submissions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch submissions: ${message}` },
      { status: 500 }
    );
  }
}

// PATCH /api/portal/teacher/assignments/[id]/submissions — Grade a submission
// Body: { submissionId, score, feedback }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    if (!tenantId || !userId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID and User ID required" },
        { status: 400 }
      );
    }

    const { id: assignmentId } = await params;
    const body = await request.json();
    const { submissionId, score, feedback } = body;

    if (!submissionId) {
      return NextResponse.json(
        { success: false, message: "submissionId is required" },
        { status: 400 }
      );
    }

    // Find the submission and verify it belongs to this assignment
    const existing = await db.submission.findFirst({
      where: { id: submissionId, tenantId, assignmentId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Submission not found" },
        { status: 404 }
      );
    }

    // Get teacher name for gradedByName
    const user = await db.user.findFirst({
      where: { id: userId, tenantId },
    });
    let gradedByName = "";
    if (user?.teacherId) {
      const teacher = await db.teacher.findFirst({
        where: { id: user.teacherId, tenantId },
      });
      gradedByName = teacher?.fullname || "";
    }

    const isGrading = score !== undefined || feedback !== undefined;

    const submission = await db.submission.update({
      where: { id: submissionId },
      data: {
        score: score !== undefined ? Number(score) : undefined,
        feedback: feedback !== undefined ? feedback : undefined,
        gradedBy: userId,
        gradedByName,
        status: score !== undefined && Number(score) > 0 ? "graded" : existing.status,
        gradedAt: isGrading ? new Date() : undefined,
      },
    });

    return NextResponse.json({ success: true, data: submission });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to grade submission: ${message}` },
      { status: 500 }
    );
  }
}
