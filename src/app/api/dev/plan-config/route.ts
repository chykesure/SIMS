import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ─── Default plans (used for auto-seeding) ───────────────────────────────────

const DEFAULT_PLANS = [
  {
    planKey: "basic",
    name: "Basic",
    subtitle: "For small schools",
    priceUSD: 13,
    priceNGN: 20000,
    monthlyDueNGN: 0,
    priceLabel: "/termly",
    validityDays: 90,
    maxStudents: 50,
    maxUsers: 3,
    features: JSON.stringify([
      "Up to 50 students",
      "Up to 3 admin users",
      "Student & teacher management",
      "Basic exam & result tracking",
      "Simple report cards",
      "Email notifications",
    ]),
    isActive: true,
    sortOrder: 0,
  },
  {
    planKey: "intermediate",
    name: "Intermediate",
    subtitle: "For growing schools",
    priceUSD: 23,
    priceNGN: 35000,
    monthlyDueNGN: 0,
    priceLabel: "/termly",
    validityDays: 90,
    maxStudents: 200,
    maxUsers: 15,
    features: JSON.stringify([
      "Up to 200 students",
      "Up to 15 admin users",
      "Everything in Basic, plus:",
      "Advanced score analytics",
      "Custom assessment settings",
      "Broadsheet & class position",
      "Termly report cards with remarks",
      "Priority email support",
    ]),
    isActive: true,
    sortOrder: 1,
  },
  {
    planKey: "premium",
    name: "Premium",
    subtitle: "For established schools",
    priceUSD: 27,
    priceNGN: 40000,
    monthlyDueNGN: 0,
    priceLabel: "/termly",
    validityDays: 90,
    maxStudents: 500,
    maxUsers: 100,
    features: JSON.stringify([
      "Up to 500 students",
      "Up to 100 admin users",
      "Everything in Intermediate, plus:",
      "Full analytics dashboard",
      "Custom school branding",
      "Finance management",
      "Digital classroom",
      "Dedicated support",
      "Data export (Excel/PDF)",
    ]),
    isActive: true,
    sortOrder: 2,
  },
  {
    planKey: "growth",
    name: "Growth",
    subtitle: "For large school networks",
    priceUSD: 33,
    priceNGN: 50000,
    monthlyDueNGN: 0,
    priceLabel: "/termly",
    validityDays: 90,
    maxStudents: 999999,
    maxUsers: 999999,
    features: JSON.stringify([
      "Unlimited students",
      "Unlimited admin users",
      "Everything in Premium, plus:",
      "Multi-campus support",
      "API access",
      "Staff performance tracking",
      "Custom integrations",
      "Account manager",
      "White-label options",
      "SLA guarantee",
    ]),
    isActive: true,
    sortOrder: 3,
  },
];

// ─── GET /api/dev/plan-config ────────────────────────────────────────────────
// Raw SQL — Prisma client doesn't know monthlyDueNGN, so findMany strips it.

export async function GET() {
  try {
    // Auto-seed if empty
    const countResult = await db.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS count FROM "SubscriptionPlan"`
    );
    const count = (countResult as Record<string, unknown>[])[0]?.count as number;

    if (!count) {
      for (const plan of DEFAULT_PLANS) {
        const keys = Object.keys(plan);
        const vals = Object.values(plan);
        const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(", ");
        const columns = keys.map((k) => `"${k}"`).join(", ");
        await db.$executeRawUnsafe(
          `INSERT INTO "SubscriptionPlan" (${columns}) VALUES (${placeholders})`,
          ...vals
        );
      }
    }

    // Fetch ALL plans using raw SQL — returns monthlyDueNGN from DB
    const rows = await db.$queryRawUnsafe(
      `SELECT * FROM "SubscriptionPlan" ORDER BY "sortOrder" ASC`
    );

    const plans = (rows as Record<string, unknown>[]).map((p) => ({
      ...p,
      features: JSON.parse((p.features as string) || "[]"),
    }));

    return NextResponse.json({ success: true, plans });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Plan config fetch error:", error);
    return NextResponse.json(
      { success: false, message: `Failed to fetch plan configs: ${message}` },
      { status: 500 }
    );
  }
}

// ─── PUT /api/dev/plan-config ────────────────────────────────────────────────
// Raw SQL — ensures monthlyDueNGN saves even if Prisma client is out of sync.

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { planId, updates } = body;

    if (!planId) {
      return NextResponse.json(
        { success: false, message: "Plan ID is required." },
        { status: 400 }
      );
    }

    if (!updates || typeof updates !== "object") {
      return NextResponse.json(
        { success: false, message: "Updates object is required." },
        { status: 400 }
      );
    }

    // Check plan exists
    const existing = await db.$queryRawUnsafe(
      `SELECT "id" FROM "SubscriptionPlan" WHERE "id" = $1`,
      planId
    );
    if (!(existing as Record<string, unknown>[]).length) {
      return NextResponse.json(
        { success: false, message: "Plan not found." },
        { status: 404 }
      );
    }

    // ── Build SET clauses using raw SQL ──
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (updates.name !== undefined) {
      if (typeof updates.name !== "string" || updates.name.trim().length === 0) {
        return NextResponse.json({ success: false, message: "Plan name must be a non-empty string." }, { status: 400 });
      }
      setClauses.push(`"name" = $${i++}`);
      params.push(updates.name.trim());
    }

    if (updates.subtitle !== undefined) {
      setClauses.push(`"subtitle" = $${i++}`);
      params.push(String(updates.subtitle ?? ""));
    }

    if (updates.priceUSD !== undefined) {
      const val = Number(updates.priceUSD);
      if (isNaN(val) || val < 0) {
        return NextResponse.json({ success: false, message: "Price (USD) must be a non-negative number." }, { status: 400 });
      }
      setClauses.push(`"priceUSD" = $${i++}`);
      params.push(val);
    }

    if (updates.priceNGN !== undefined) {
      const val = Number(updates.priceNGN);
      if (isNaN(val) || val < 0) {
        return NextResponse.json({ success: false, message: "Price (NGN) must be a non-negative number." }, { status: 400 });
      }
      setClauses.push(`"priceNGN" = $${i++}`);
      params.push(val);
    }

    if (updates.monthlyDueNGN !== undefined) {
      const val = Number(updates.monthlyDueNGN);
      if (isNaN(val) || val < 0) {
        return NextResponse.json({ success: false, message: "Monthly due (NGN) must be a non-negative number." }, { status: 400 });
      }
      setClauses.push(`"monthlyDueNGN" = $${i++}`);
      params.push(val);
    }

    if (updates.priceLabel !== undefined) {
      setClauses.push(`"priceLabel" = $${i++}`);
      params.push(String(updates.priceLabel ?? "/session"));
    }

    if (updates.validityDays !== undefined) {
      const val = Number(updates.validityDays);
      if (isNaN(val) || val < 1) {
        return NextResponse.json({ success: false, message: "Validity days must be at least 1." }, { status: 400 });
      }
      setClauses.push(`"validityDays" = $${i++}`);
      params.push(val);
    }

    if (updates.maxStudents !== undefined) {
      const val = Number(updates.maxStudents);
      if (isNaN(val) || val < 1) {
        return NextResponse.json({ success: false, message: "Max students must be at least 1." }, { status: 400 });
      }
      setClauses.push(`"maxStudents" = $${i++}`);
      params.push(val);
    }

    if (updates.maxUsers !== undefined) {
      const val = Number(updates.maxUsers);
      if (isNaN(val) || val < 1) {
        return NextResponse.json({ success: false, message: "Max users must be at least 1." }, { status: 400 });
      }
      setClauses.push(`"maxUsers" = $${i++}`);
      params.push(val);
    }

    if (updates.features !== undefined) {
      if (!Array.isArray(updates.features)) {
        return NextResponse.json({ success: false, message: "Features must be an array of strings." }, { status: 400 });
      }
      setClauses.push(`"features" = $${i++}`);
      params.push(JSON.stringify(updates.features));
    }

    if (updates.isActive !== undefined) {
      setClauses.push(`"isActive" = $${i++}`);
      params.push(Boolean(updates.isActive));
    }

    if (updates.sortOrder !== undefined) {
      setClauses.push(`"sortOrder" = $${i++}`);
      params.push(Number(updates.sortOrder) || 0);
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ success: false, message: "No valid fields to update." }, { status: 400 });
    }

    // Add WHERE param (planId) as last parameter
    params.push(planId);
    const whereIndex = i;

    const sql = `UPDATE "SubscriptionPlan" SET ${setClauses.join(", ")}, "updatedAt" = NOW() WHERE "id" = $${whereIndex}`;

    await db.$executeRawUnsafe(sql, ...params);

    // Fetch updated row using raw SQL
    const rows = await db.$queryRawUnsafe(
      `SELECT * FROM "SubscriptionPlan" WHERE "id" = $1`,
      planId
    );
    const plan = (rows as Record<string, unknown>[])[0];

    return NextResponse.json({
      success: true,
      message: `Plan "${plan.name}" updated successfully.`,
      plan: {
        ...plan,
        features: JSON.parse((plan.features as string) || "[]"),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Plan config update error:", error);
    return NextResponse.json(
      { success: false, message: `Failed to update plan config: ${message}` },
      { status: 500 }
    );
  }
}