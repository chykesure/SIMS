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

export async function GET() {
  try {
    // Auto-seed if no plans exist
    const count = await db.subscriptionPlan.count();
    if (count === 0) {
      await db.subscriptionPlan.createMany({ data: DEFAULT_PLANS });
    }

    const plans = await db.subscriptionPlan.findMany({
      orderBy: { sortOrder: "asc" },
    });

    // Parse features from JSON string
    const parsed = plans.map((p) => ({
      ...p,
      features: JSON.parse(p.features || "[]"),
    }));

    return NextResponse.json({ success: true, plans: parsed });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch plan configs: ${message}` },
      { status: 500 }
    );
  }
}

// ─── PUT /api/dev/plan-config ────────────────────────────────────────────────

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

    // Find the plan
    const existing = await db.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Plan not found." },
        { status: 404 }
      );
    }

    // Build update data with validation
    const data: Record<string, unknown> = {};

    if (updates.name !== undefined) {
      if (typeof updates.name !== "string" || updates.name.trim().length === 0) {
        return NextResponse.json(
          { success: false, message: "Plan name must be a non-empty string." },
          { status: 400 }
        );
      }
      data.name = updates.name.trim();
    }

    if (updates.subtitle !== undefined) {
      data.subtitle = String(updates.subtitle ?? "");
    }

    if (updates.priceUSD !== undefined) {
      const val = Number(updates.priceUSD);
      if (isNaN(val) || val < 0) {
        return NextResponse.json(
          { success: false, message: "Price (USD) must be a non-negative number." },
          { status: 400 }
        );
      }
      data.priceUSD = val;
    }

    if (updates.priceNGN !== undefined) {
      const val = Number(updates.priceNGN);
      if (isNaN(val) || val < 0) {
        return NextResponse.json(
          { success: false, message: "Price (NGN) must be a non-negative number." },
          { status: 400 }
        );
      }
      data.priceNGN = val;
    }

    if (updates.priceLabel !== undefined) {
      data.priceLabel = String(updates.priceLabel ?? "/session");
    }

    if (updates.validityDays !== undefined) {
      const val = Number(updates.validityDays);
      if (isNaN(val) || val < 1) {
        return NextResponse.json(
          { success: false, message: "Validity days must be at least 1." },
          { status: 400 }
        );
      }
      data.validityDays = val;
    }

    if (updates.maxStudents !== undefined) {
      const val = Number(updates.maxStudents);
      if (isNaN(val) || val < 1) {
        return NextResponse.json(
          { success: false, message: "Max students must be at least 1." },
          { status: 400 }
        );
      }
      data.maxStudents = val;
    }

    if (updates.maxUsers !== undefined) {
      const val = Number(updates.maxUsers);
      if (isNaN(val) || val < 1) {
        return NextResponse.json(
          { success: false, message: "Max users must be at least 1." },
          { status: 400 }
        );
      }
      data.maxUsers = val;
    }

    if (updates.features !== undefined) {
      if (!Array.isArray(updates.features)) {
        return NextResponse.json(
          { success: false, message: "Features must be an array of strings." },
          { status: 400 }
        );
      }
      data.features = JSON.stringify(updates.features);
    }

    if (updates.isActive !== undefined) {
      data.isActive = Boolean(updates.isActive);
    }

    if (updates.sortOrder !== undefined) {
      data.sortOrder = Number(updates.sortOrder) || 0;
    }

    // Update the plan
    const updated = await db.subscriptionPlan.update({
      where: { id: planId },
      data,
    });

    return NextResponse.json({
      success: true,
      message: `Plan "${updated.name}" updated successfully.`,
      plan: {
        ...updated,
        features: JSON.parse(updated.features || "[]"),
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to update plan config: ${message}` },
      { status: 500 }
    );
  }
}