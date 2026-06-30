import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

// GET /api/classrooms — List all classrooms for tenant
// Supports ?q= search, ?section= filter
// Includes count of announcements, assignments, materials
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
    const q = searchParams.get("q")?.trim() || "";
    const section = searchParams.get("section")?.trim() || "";

    const where: Record<string, unknown> = { tenantId };

    if (q) {
      where.OR = [
        { name: { contains: q } },
        { description: { contains: q } },
        { subject: { contains: q } },
        { teacherName: { contains: q } },
        { room: { contains: q } },
        { section: { contains: q } },
      ];
    }

    if (section) {
      where.section = { equals: section };
    }

    const classrooms = await db.classroom.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            announcements: true,
            assignments: true,
            materials: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: classrooms });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch classrooms: ${message}` },
      { status: 500 }
    );
  }
}

// POST /api/classrooms — Create a new classroom
// Validates: name required, checks name+section uniqueness for tenant
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
    const { name, description, section, subject, teacherId, teacherName, room, coverImage } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, message: "Classroom name is required" },
        { status: 400 }
      );
    }

    // Check for duplicate name+section for the same tenant
    const existing = await db.classroom.findFirst({
      where: {
        tenantId,
        name: name.trim(),
        section: section?.trim() || "",
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "A classroom with this name and section already exists" },
        { status: 409 }
      );
    }

    const classroom = await db.classroom.create({
      data: {
        tenantId,
        name: name.trim(),
        description: description || "",
        section: section?.trim() || "",
        subject: subject || "",
        teacherId: teacherId || "",
        teacherName: teacherName || "",
        room: room || "",
        coverImage: coverImage || "",
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, data: classroom }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to create classroom: ${message}` },
      { status: 500 }
    );
  }
}

// PUT /api/classrooms?id= — Update classroom by id
export async function PUT(request: Request) {
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
        { success: false, message: "Classroom id is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, section, subject, teacherId, teacherName, room, coverImage, isActive } = body;

    const existing = await db.classroom.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Classroom not found" },
        { status: 404 }
      );
    }

    // If name or section is being changed, check uniqueness
    if (name || section !== undefined) {
      const newName = (name || existing.name).trim();
      const newSection = section !== undefined ? section.trim() : existing.section;

      const duplicate = await db.classroom.findFirst({
        where: {
          tenantId,
          name: newName,
          section: newSection,
          id: { not: id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { success: false, message: "A classroom with this name and section already exists" },
          { status: 409 }
        );
      }
    }

    const classroom = await db.classroom.update({
      where: { id },
      data: {
        name: name ? name.trim() : undefined,
        description: description !== undefined ? description : undefined,
        section: section !== undefined ? section.trim() : undefined,
        subject: subject !== undefined ? subject : undefined,
        teacherId: teacherId !== undefined ? teacherId : undefined,
        teacherName: teacherName !== undefined ? teacherName : undefined,
        room: room !== undefined ? room : undefined,
        coverImage: coverImage !== undefined ? coverImage : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });

    return NextResponse.json({ success: true, data: classroom });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to update classroom: ${message}` },
      { status: 500 }
    );
  }
}

// DELETE /api/classrooms?id= — Delete classroom and cascade delete related records
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
        { success: false, message: "Classroom id is required" },
        { status: 400 }
      );
    }

    const existing = await db.classroom.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Classroom not found" },
        { status: 404 }
      );
    }

    // Delete submissions for assignments in this classroom
    const assignments = await db.assignment.findMany({
      where: { classroomId: id },
      select: { id: true },
    });

    if (assignments.length > 0) {
      const assignmentIds = assignments.map((a) => a.id);
      await db.submission.deleteMany({
        where: { assignmentId: { in: assignmentIds } },
      });
    }

    // Delete announcements, assignments, materials for this classroom
    await db.announcement.deleteMany({ where: { classroomId: id } });
    await db.assignment.deleteMany({ where: { classroomId: id } });
    await db.classMaterial.deleteMany({ where: { classroomId: id } });

    // Delete the classroom
    await db.classroom.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Classroom and all related data deleted" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to delete classroom: ${message}` },
      { status: 500 }
    );
  }
}
