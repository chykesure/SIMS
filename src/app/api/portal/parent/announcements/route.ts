import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID is required" },
        { status: 400 }
      );
    }

    // Fetch recent announcements for the tenant, sorted by newest first
    const announcements = await db.announcement.findMany({
      where: { tenantId },
      include: {
        classroom: {
          select: {
            id: true,
            name: true,
            section: true,
            subject: true,
          },
        },
      },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 20,
    });

    const formattedAnnouncements = announcements.map((a) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      pinned: a.pinned,
      createdBy: a.createdBy,
      createdByName: a.createdByName,
      classroom: a.classroom
        ? {
            id: a.classroom.id,
            name: a.classroom.name,
            section: a.classroom.section,
            subject: a.classroom.subject,
          }
        : null,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        announcements: formattedAnnouncements,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch announcements: ${message}` },
      { status: 500 }
    );
  }
}
