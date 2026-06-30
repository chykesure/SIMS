//src/app/api/portal/teacher/ai/lesson-plan/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

function getUserId(request: Request): string {
  return request.headers.get("x-user-id") || "";
}

// GET ?action=daily-usage|list
export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    if (!tenantId || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "list") {
      const plans = await db.lessonPlan.findMany({
        where: { tenantId, teacherId: userId },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ success: true, data: plans });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST — Save or update a lesson plan
export async function POST(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    if (!tenantId || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findFirst({ where: { id: userId, tenantId } });
    const teacherName = user?.username || "";

    const body = await request.json();
    const { id, subject, className, term, session, weeks, status } = body;

    if (!subject || !className || !weeks) {
      return NextResponse.json({ error: "Subject, class, and weeks required" }, { status: 400 });
    }

    let plan;

    if (id) {
      // Update existing
      plan = await db.lessonPlan.update({
        where: { id },
        data: {
          subject,
          className,
          term: term || "",
          session: session || "",
          weeks: JSON.stringify(weeks),
          status: status || "draft",
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new
      plan = await db.lessonPlan.create({
        data: {
          tenantId,
          teacherId: userId,
          subject,
          className,
          term: term || "",
          session: session || "",
          weeks: JSON.stringify(weeks),
          status: status || "draft",
        },
      });
    }

    // Track activity
    const points = status === "published" ? 20 : 5;
    await db.teacherActivity.create({
      data: {
        tenantId,
        teacherId: userId,
        teacherName,
        action: status === "published" ? "publish" : "save",
        points,
        details: `${status === "published" ? "Published" : "Saved"} lesson plan: ${subject} - ${className}`,
      },
    });

    return NextResponse.json({ success: true, data: plan }, { status: id ? 200 : 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE ?id=xxx
export async function DELETE(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !tenantId || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const plan = await db.lessonPlan.findFirst({
      where: { id, tenantId, teacherId: userId },
    });

    if (!plan) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const user = await db.user.findFirst({ where: { id: userId, tenantId } });

    await db.lessonPlan.delete({ where: { id } });

    // Deduct points
    await db.teacherActivity.create({
      data: {
        tenantId,
        teacherId: userId,
        teacherName: user?.username || "",
        action: "delete",
        points: -20,
        details: `Deleted lesson plan: ${plan.subject} - ${plan.className}`,
      },
    });

    return NextResponse.json({ success: true, pointsDeducted: 20 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}