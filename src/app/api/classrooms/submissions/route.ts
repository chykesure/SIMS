import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

// GET /api/classrooms/submissions?assignmentId= — List submissions for an assignment
// Supports ?status= filter
export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID required" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get("assignmentId");
    const status = searchParams.get("status");

    if (!assignmentId) {
      return NextResponse.json(
        { success: false, message: "assignmentId is required" },
        { status: 400 }
      );
    }

    const where: Record<string, unknown> = { tenantId, assignmentId };

    if (status) {
      where.status = { equals: status };
    }

    const submissions = await db.submission.findMany({
      where,
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

// POST /api/classrooms/submissions — Create/submit work
// Check for duplicate submission (same assignmentId + studentId) and update existing instead
export async function POST(request: Request) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      assignmentId,
      studentId,
      studentName,
      studentRegNo,
      content,
      attachmentUrl,
    } = body;

    if (!assignmentId || !studentId) {
      return NextResponse.json(
        { success: false, message: "assignmentId and studentId are required" },
        { status: 400 }
      );
    }

    // Verify assignment exists for this tenant
    const assignment = await db.assignment.findFirst({
      where: { id: assignmentId, tenantId },
    });

    if (!assignment) {
      return NextResponse.json(
        { success: false, message: "Assignment not found" },
        { status: 404 }
      );
    }

    // Check for existing submission (same assignmentId + studentId)
    const existing = await db.submission.findFirst({
      where: { tenantId, assignmentId, studentId },
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
        },
      });

      return NextResponse.json({
        success: true,
        data: submission,
        updated: true,
        message: "Existing submission updated",
      });
    }

    // Create new submission
    const submission = await db.submission.create({
      data: {
        tenantId,
        assignmentId,
        studentId,
        studentName: studentName || "",
        studentRegNo: studentRegNo || "",
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

    return NextResponse.json({ success: true, data: submission, updated: false }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to submit work: ${message}` },
      { status: 500 }
    );
  }
}

// PUT /api/classrooms/submissions — Grade a submission
// Fields: id, score, feedback, gradedBy, gradedByName, status
// Updates gradedAt timestamp
export async function PUT(request: Request) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { id, score, feedback, gradedBy, gradedByName, status } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Submission id is required" },
        { status: 400 }
      );
    }

    const existing = await db.submission.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Submission not found" },
        { status: 404 }
      );
    }

    const isGrading = score !== undefined || feedback !== undefined;

    const submission = await db.submission.update({
      where: { id },
      data: {
        score: score !== undefined ? Number(score) : undefined,
        feedback: feedback !== undefined ? feedback : undefined,
        gradedBy: gradedBy !== undefined ? gradedBy : undefined,
        gradedByName: gradedByName !== undefined ? gradedByName : undefined,
        status: status !== undefined ? status : undefined,
        gradedAt: isGrading ? new Date() : undefined,
      },
    });

    return NextResponse.json({ success: true, data: submission });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to update submission: ${message}` },
      { status: 500 }
    );
  }
}

// DELETE /api/classrooms/submissions?id= — Delete submission
export async function DELETE(request: Request) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID required" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Submission id is required" },
        { status: 400 }
      );
    }

    const existing = await db.submission.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Submission not found" },
        { status: 404 }
      );
    }

    await db.submission.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Submission deleted" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to delete submission: ${message}` },
      { status: 500 }
    );
  }
}
