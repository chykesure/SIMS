import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

// GET /api/portal/teacher/classes — List all classes with student counts
export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID required" },
        { status: 400 }
      );
    }

    const classes = await db.class.findMany({
      where: { tenantId },
      orderBy: { title: "asc" },
    });

    // For each class, count students
    const classesWithCounts = await Promise.all(
      classes.map(async (cls) => {
        const studentCount = await db.student.count({
          where: { tenantId, class: cls.title },
        });
        return {
          id: cls.id,
          title: cls.title,
          studentCount,
        };
      })
    );

    return NextResponse.json({ success: true, data: classesWithCounts });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch classes: ${message}` },
      { status: 500 }
    );
  }
}
