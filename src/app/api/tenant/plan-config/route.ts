import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ─── GET /api/tenant/plan-config ─────────────────────────────────────────────
// Returns active plans for the school to display on their subscription page.
// This is the dynamic source of truth — when dev changes prices here, schools see it.

export async function GET() {
  try {
    const plans = await db.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        planKey: true,
        name: true,
        subtitle: true,
        priceUSD: true,
        priceNGN: true,
        priceLabel: true,
        validityDays: true,
        maxStudents: true,
        maxUsers: true,
        features: true,
      },
    });

    // Parse features and format for frontend consumption
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