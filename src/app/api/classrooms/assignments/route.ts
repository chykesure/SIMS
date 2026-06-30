import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

// GET /api/classrooms/assignments?classroomId= — List assignments for a classroom
// Includes _count of submissions, supports ?status= filter
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
    const classroomId = searchParams.get("classroomId");
    const status = searchParams.get("status");

    if (!classroomId) {
      return NextResponse.json(
        { success: false, message: "classroomId is required" },
        { status: 400 }
      );
    }

    const where: Record<string, unknown> = { tenantId, classroomId };

    if (status) {
      where.status = { equals: status };
    }

    const assignments = await db.assignment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            submissions: true,
          },
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

// POST /api/classrooms/assignments — Create assignment
// Required: classroomId, title
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
      classroomId,
      title,
      description,
      instructions,
      createdBy,
      createdByName,
      dueDate,
      dueTime,
      maxScore,
    } = body;

    if (!classroomId || !title || !title.trim()) {
      return NextResponse.json(
        { success: false, message: "classroomId and title are required" },
        { status: 400 }
      );
    }

    // Verify classroom exists for this tenant
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
        createdBy: createdBy || "",
        createdByName: createdByName || "",
        dueDate: dueDate || "",
        dueTime: dueTime || "",
        maxScore: maxScore !== undefined ? Number(maxScore) : 100,
        status: "active",
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

// PUT /api/classrooms/assignments — Update assignment by id
// Supports changing status to "closed"/"archived"
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
    const { id, title, description, instructions, dueDate, dueTime, maxScore, status } = body;

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

    const assignment = await db.assignment.update({
      where: { id },
      data: {
        title: title !== undefined ? title.trim() : undefined,
        description: description !== undefined ? description : undefined,
        instructions: instructions !== undefined ? instructions : undefined,
        dueDate: dueDate !== undefined ? dueDate : undefined,
        dueTime: dueTime !== undefined ? dueTime : undefined,
        maxScore: maxScore !== undefined ? Number(maxScore) : undefined,
        status: status !== undefined ? status : undefined,
      },
    });

    return NextResponse.json({ success: true, data: assignment });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to update assignment: ${message}` },
      { status: 500 }
    );
  }
}

// DELETE /api/classrooms/assignments?id= — Delete assignment and cascade delete submissions
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

    // Delete submissions first
    await db.submission.deleteMany({ where: { assignmentId: id } });

    // Delete the assignment
    await db.assignment.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Assignment and all submissions deleted" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to delete assignment: ${message}` },
      { status: 500 }
    );
  }
}
