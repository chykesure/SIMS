//src/app/api/portal/teacher/ai/resources/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

function getUserId(request: Request): string {
  return request.headers.get("x-user-id") || "";
}

// GET /api/portal/teacher/ai/resources?action=mine|library|leaderboard
export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    if (!tenantId) {
      return NextResponse.json({ success: false, message: "Tenant required" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "mine";

    if (action === "leaderboard") {
      // Get top teachers by points this month
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);

      const activities = await db.teacherActivity.groupBy({
        by: ["teacherId", "teacherName"],
        where: { tenantId, createdAt: { gte: firstDayOfMonth } },
        _sum: { points: true },
        _count: { id: true },
        orderBy: { _sum: { points: "desc" } },
        take: 10,
      });

      const leaderboard = activities.map((a, index) => ({
        rank: index + 1,
        teacherId: a.teacherId,
        teacherName: a.teacherName || "Unknown",
        totalPoints: a._sum.points || 0,
        totalActions: a._count.id,
      }));

      // Assign badges
      const badgedLeaderboard = leaderboard.map((entry) => {
        let badge = "";
        let badgeColor = "";
        if (entry.totalPoints >= 100) {
          badge = "Master Planner";
          badgeColor = "bg-purple-100 text-purple-700";
        } else if (entry.totalPoints >= 50) {
          badge = "Quiz Wizard";
          badgeColor = "bg-blue-100 text-blue-700";
        } else if (entry.totalPoints >= 20) {
          badge = "Content Creator";
          badgeColor = "bg-emerald-100 text-emerald-700";
        } else {
          badge = "Rising Star";
          badgeColor = "bg-amber-100 text-amber-700";
        }
        return { ...entry, badge, badgeColor };
      });

      return NextResponse.json({ success: true, data: badgedLeaderboard });
    }

    if (action === "daily-usage") {
      const dailyLimit = parseInt(process.env.TEACHER_DAILY_AI_LIMIT || "20", 10);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayCount = await db.teacherActivity.count({
        where: { tenantId, teacherId: userId, action: "generate", createdAt: { gte: today } },
      });
      return NextResponse.json({
        success: true,
        dailyLimit,
        dailyUsed: todayCount,
        remaining: dailyLimit - todayCount,
      });
    }

    if (action === "library") {
      // Published resources visible to all teachers
      const resources = await db.aiResource.findMany({
        where: { tenantId, status: "published" },
        orderBy: { publishedAt: "desc" },
        take: 50,
      });
      return NextResponse.json({ success: true, data: resources });
    }

    // Default: "mine" — teacher's own resources
    const resources = await db.aiResource.findMany({
      where: { tenantId, teacherId: userId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: resources });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// POST /api/portal/teacher/ai/resources — Save a generated resource
export async function POST(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    if (!tenantId || !userId) {
      return NextResponse.json({ success: false, message: "Auth required" }, { status: 400 });
    }

    const body = await request.json();
    const { resourceType, subject, className, topic, term, week, content, action } = body;

    if (!subject || !topic || !content) {
      return NextResponse.json({ success: false, message: "Subject, topic, and content required" }, { status: 400 });
    }

    // Get teacher info
    const user = await db.user.findFirst({ where: { id: userId, tenantId } });
    const teacherName = user?.username || "";

    // Create the resource
    const resource = await db.aiResource.create({
      data: {
        tenantId,
        teacherId: userId,
        teacherName,
        subject,
        className: className || "",
        topic,
        resourceType: resourceType || "lesson-note",
        term: term || "",
        week: week || "",
        content,
        status: action === "publish" ? "published" : "draft",
        publishedAt: action === "publish" ? new Date() : null,
        pointsAwarded: 5, // Base points for generation
      },
    });

    // Award points for generation
    await db.teacherActivity.create({
      data: {
        tenantId,
        teacherId: userId,
        teacherName,
        action: "generate",
        points: 5,
        resourceId: resource.id,
      },
    });

    // If publishing, award extra points
    if (action === "publish") {
      await db.teacherActivity.create({
        data: {
          tenantId,
          teacherId: userId,
          teacherName,
          action: "publish",
          points: 15,
          resourceId: resource.id,
        },
      });
      resource.pointsAwarded = 20;
    }

    return NextResponse.json({ success: true, data: resource }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// PATCH /api/portal/teacher/ai/resources — Approve/publish/download
export async function PATCH(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    if (!tenantId || !userId) {
      return NextResponse.json({ success: false, message: "Auth required" }, { status: 400 });
    }

    const body = await request.json();
    const { id, action } = body;
    const user = await db.user.findFirst({ where: { id: userId, tenantId } });

    if (action === "publish") {
      const resource = await db.aiResource.update({
        where: { id, tenantId },
        data: { status: "published", publishedAt: new Date() },
      });
      await db.teacherActivity.create({
        data: {
          tenantId,
          teacherId: userId,
          teacherName: user?.username || "",
          action: "publish",
          points: 15,
          resourceId: id,
        },
      });
      return NextResponse.json({ success: true, data: resource });
    }

    if (action === "approve") {
      const resource = await db.aiResource.update({
        where: { id, tenantId },
        data: {
          status: "approved",
          approvedBy: userId,
          approvedByName: user?.username || "",
          approvedAt: new Date(),
        },
      });
      await db.teacherActivity.create({
        data: {
          tenantId,
          teacherId: resource.teacherId,
          teacherName: resource.teacherName,
          action: "approved",
          points: 10,
          resourceId: id,
        },
      });
      return NextResponse.json({ success: true, data: resource });
    }

    if (action === "download") {
      await db.aiResource.update({
        where: { id, tenantId },
        data: { downloadCount: { increment: 1 } },
      });
      if (userId !== body.originalTeacherId) {
        await db.teacherActivity.create({
          data: {
            tenantId,
            teacherId: userId,
            teacherName: user?.username || "",
            action: "download",
            points: 5,
            resourceId: id,
          },
        });
      }
      return NextResponse.json({ success: true, message: "Download counted" });
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// DELETE /api/portal/teacher/ai/resources?id=xxx
export async function DELETE(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id || !tenantId) {
      return NextResponse.json({ success: false, message: "Invalid" }, { status: 400 });
    }

    // Get resource before deleting (to know points and teacher info)
    const resource = await db.aiResource.findFirst({
      where: { id, tenantId, teacherId: userId },
    });

    if (!resource) {
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    }

    const pointsToDeduct = resource.pointsAwarded || 0;

    // Delete the resource
    await db.aiResource.deleteMany({ where: { id, tenantId, teacherId: userId } });

    // Deduct points
    if (pointsToDeduct > 0) {
      await db.teacherActivity.create({
        data: {
          tenantId,
          teacherId: userId,
          teacherName: resource.teacherName || "",
          action: "delete",
          points: -pointsToDeduct,
          resourceId: id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Deleted",
      pointsDeducted: pointsToDeduct,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Delete failed";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}