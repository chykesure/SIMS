import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ─── GET /api/tenant/plan-config ─────────────────────────────────────────────
// Returns active plans for the school to display on their subscription page.
// Uses raw SQL so monthlyDueNGN is returned even if Prisma client is out of sync.

export async function GET() {
  try {
    const rows = await db.$queryRawUnsafe(
      `SELECT * FROM "SubscriptionPlan" WHERE "isActive" = true ORDER BY "sortOrder" ASC`
    );

    const plans = (rows as Record<string, unknown>[]).map((p) => ({
      ...p,
      features: JSON.parse((p.features as string) || "[]"),
    }));

    return NextResponse.json({ success: true, plans });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch plan configs: ${message}` },
      { status: 500 }
    );
  }
}