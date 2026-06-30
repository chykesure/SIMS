import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

function getUserId(request: Request): string {
  return request.headers.get("x-user-id") || "";
}

// GET /api/portal/teacher/announcements — List teacher's announcements
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

    // Find user's teacherId
    const user = await db.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user || !user.teacherId) {
      return NextResponse.json(
        { success: false, message: "Teacher not found" },
        { status: 404 }
      );
    }

    const announcements = await db.announcement.findMany({
      where: { tenantId, createdBy: user.teacherId },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      include: {
        classroom: {
          select: { id: true, name: true },
        },
      },
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

// POST /api/portal/teacher/announcements — Create announcement
// Body: { classroomId, title, content, pinned }
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

    // Find user's teacherId
    const user = await db.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user || !user.teacherId) {
      return NextResponse.json(
        { success: false, message: "Teacher not found" },
        { status: 404 }
      );
    }

    // Get teacher name
    const teacher = await db.teacher.findFirst({
      where: { id: user.teacherId, tenantId },
    });

    const body = await request.json();
    const { classroomId, title, content, pinned } = body;

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
        createdBy: user.teacherId,
        createdByName: teacher?.fullname || "",
        pinned: !!pinned,
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
