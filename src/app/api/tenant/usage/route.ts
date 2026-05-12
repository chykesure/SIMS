import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ─── GET /api/tenant/usage ──────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const tenantId = request.headers.get("x-tenant-id");

    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID is required" },
        { status: 400 }
      );
    }

    // Fetch tenant with plan details
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        plan: true,
        status: true,
        maxStudents: true,
        maxUsers: true,
        planStart: true,
        planEnd: true,
        isActive: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, message: "Tenant not found" },
        { status: 404 }
      );
    }

    // Count actual resource usage in parallel
    const [students, users, teachers, classes, subjects] = await Promise.all([
      db.student.count({ where: { tenantId } }),
      db.user.count({ where: { tenantId } }),
      db.teacher.count({ where: { tenantId } }),
      db.class.count({ where: { tenantId } }),
      db.subject.count({ where: { tenantId } }),
    ]);

    // Build capacity metrics
    const studentsPercent =
      tenant.maxStudents > 0
        ? Math.round((students / tenant.maxStudents) * 100)
        : 0;

    const usersPercent =
      tenant.maxUsers > 0 ? Math.round((users / tenant.maxUsers) * 100) : 0;

    // Mark current plan in plan list (read from DB for dynamic pricing)
    const dbPlans = await db.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    const plansWithCurrent = dbPlans.map((p) => ({
      id: p.planKey,
      name: p.name,
      subtitle: p.subtitle,
      price: p.priceUSD === 0 ? "Free" : `$${p.priceUSD}`,
      priceNGN: `₦${p.priceNGN.toLocaleString()}`,
      priceLabel: p.priceLabel,
      maxStudents: p.maxStudents,
      maxUsers: p.maxUsers,
      validityDays: p.validityDays,
      features: JSON.parse(p.features || "[]"),
      current: p.planKey === tenant.plan,
    }));

    return NextResponse.json({
      success: true,
      tenant: {
        name: tenant.name,
        plan: tenant.plan,
        status: tenant.status,
        maxStudents: tenant.maxStudents,
        maxUsers: tenant.maxUsers,
        planStart: tenant.planStart,
        planEnd: tenant.planEnd,
        isActive: tenant.isActive,
      },
      usage: {
        students,
        users,
        teachers,
        classes,
        subjects,
      },
      capacity: {
        studentsUsed: students,
        studentsMax: tenant.maxStudents,
        studentsPercent,
        usersUsed: users,
        usersMax: tenant.maxUsers,
        usersPercent,
      },
      plans: plansWithCurrent,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch usage: ${message}` },
      { status: 500 }
    );
  }
}