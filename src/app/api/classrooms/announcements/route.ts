import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

// GET /api/classrooms/announcements?classroomId= — List announcements for a classroom
// Sorted by pinned first, then createdAt desc
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

    if (!classroomId) {
      return NextResponse.json(
        { success: false, message: "classroomId is required" },
        { status: 400 }
      );
    }

    const announcements = await db.announcement.findMany({
      where: { tenantId, classroomId },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ success: true, data: announcements });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch announcements: ${message}` },
      { status: 500 }
    );
  }
}

// POST /api/classrooms/announcements — Create announcement
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
    const { classroomId, title, content, pinned, createdBy, createdByName } = body;

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

    const announcement = await db.announcement.create({
      data: {
        tenantId,
        classroomId,
        title: title.trim(),
        content: content || "",
        pinned: pinned === true,
        createdBy: createdBy || "",
        createdByName: createdByName || "",
      },
    });

    return NextResponse.json({ success: true, data: announcement }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to create announcement: ${message}` },
      { status: 500 }
    );
  }
}

// PUT /api/classrooms/announcements — Update announcement by id
// Supports toggling pinned
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
    const { id, title, content, pinned } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Announcement id is required" },
        { status: 400 }
      );
    }

    const existing = await db.announcement.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Announcement not found" },
        { status: 404 }
      );
    }

    const announcement = await db.announcement.update({
      where: { id },
      data: {
        title: title !== undefined ? title.trim() : undefined,
        content: content !== undefined ? content : undefined,
        pinned: pinned !== undefined ? pinned : undefined,
      },
    });

    return NextResponse.json({ success: true, data: announcement });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to update announcement: ${message}` },
      { status: 500 }
    );
  }
}

// DELETE /api/classrooms/announcements?id= — Delete announcement
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
        { success: false, message: "Announcement id is required" },
        { status: 400 }
      );
    }

    const existing = await db.announcement.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Announcement not found" },
        { status: 404 }
      );
    }

    await db.announcement.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Announcement deleted" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to delete announcement: ${message}` },
      { status: 500 }
    );
  }
}
