import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

function getUserId(request: Request): string {
  return request.headers.get("x-user-id") || "";
}

// GET /api/portal/student/announcements — Fetch recent announcements
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

    // Verify user is a student
    const user = await db.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user || (user.role || "").toUpperCase() !== "STUDENT" || !user.studentId) {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 }
      );
    }

    // Fetch all announcements for the tenant, sorted by pinned first then newest
    const announcements = await db.announcement.findMany({
      where: { tenantId },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 20,
      include: {
        classroom: {
          select: { id: true, name: true, subject: true, section: true },
        },
      },
    });

    const formattedAnnouncements = announcements.map(a => ({
      id: a.id,
      title: a.title,
      content: a.content,
      pinned: a.pinned,
      createdByName: a.createdByName || "Admin",
      createdAt: a.createdAt,
      classroomName: a.classroom?.name || "",
      classroomSubject: a.classroom?.subject || "",
      classroomSection: a.classroom?.section || "",
    }));

    return NextResponse.json({
      success: true,
      data: formattedAnnouncements,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch announcements: ${message}` },
      { status: 500 }
    );
  }
}
