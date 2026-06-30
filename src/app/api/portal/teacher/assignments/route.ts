import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

function getUserId(request: Request): string {
  return request.headers.get("x-user-id") || "";
}

// GET /api/portal/teacher/assignments — List teacher's assignments
export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    if (!tenantId || !userId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID and User ID required" },
        { status: 400 }
      );
    }

    const user = await db.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user || !user.teacherId) {
      return NextResponse.json(
        { success: false, message: "Teacher not found" },
        { status: 404 }
      );
    }

    const assignments = await db.assignment.findMany({
      where: { tenantId, createdBy: user.teacherId },
      orderBy: { createdAt: "desc" },
      include: {
        classroom: {
          select: { id: true, name: true },
        },
        _count: {
          select: { submissions: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: assignments });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch assignments: ${message}` },
      { status: 500 }
    );
  }
}

// POST /api/portal/teacher/assignments — Create assignment (with file attachment support)
export async function POST(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    if (!tenantId || !userId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID and User ID required" },
        { status: 400 }
      );
    }

    const user = await db.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user || !user.teacherId) {
      return NextResponse.json(
        { success: false, message: "Teacher not found" },
        { status: 404 }
      );
    }

    const teacher = await db.teacher.findFirst({
      where: { id: user.teacherId, tenantId },
    });

    const body = await request.json();
    const {
      classroomId,
      title,
      description,
      instructions,
      dueDate,
      dueTime,
      maxScore,
      attachmentUrl,
    } = body;

    if (!classroomId || !title || !title.trim()) {
      return NextResponse.json(
        { success: false, message: "classroomId and title are required" },
        { status: 400 }
      );
    }

    const classroom = await db.classroom.findFirst({
      where: { id: classroomId, tenantId },
    });

    if (!classroom) {
      return NextResponse.json(
        { success: false, message: "Classroom not found" },
        { status: 404 }
      );
    }

    const assignment = await db.assignment.create({
      data: {
        tenantId,
        classroomId,
        title: title.trim(),
        description: description || "",
        instructions: instructions || "",
        createdBy: user.teacherId,
        createdByName: teacher?.fullname || "",
        dueDate: dueDate || "",
        dueTime: dueTime || "",
        maxScore: maxScore !== undefined ? Number(maxScore) : 100,
        status: "active",
        attachmentUrl: attachmentUrl || "",
      },
    });

    return NextResponse.json({ success: true, data: assignment }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to create assignment: ${message}` },
      { status: 500 }
    );
  }
}

// DELETE /api/portal/teacher/assignments?id=xxx
export async function DELETE(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    if (!tenantId || !userId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID and User ID required" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Assignment id is required" },
        { status: 400 }
      );
    }

    const existing = await db.assignment.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Assignment not found" },
        { status: 404 }
      );
    }

    await db.submission.deleteMany({ where: { assignmentId: id } });
    await db.assignment.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Assignment deleted" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to delete assignment: ${message}` },
      { status: 500 }
    );
  }
}