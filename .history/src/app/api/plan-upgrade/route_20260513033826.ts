import { NextResponse } from "next/server";
import { db } from "@/lib/db";
// import { PLANS } from "@/lib/plans";
import { PLAN_META } from "@/lib/plans";

// ─── GET /api/plan-upgrade ──────────────────────────────────────────────────
// Lists all upgrade requests for the tenant (uses x-tenant-id header)

export async function GET(request: Request) {
  try {
    const tenantId = request.headers.get("x-tenant-id");

    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID is required" },
        { status: 400 }
      );
    }

    const requests = await db.planUpgradeRequest.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: requests,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch upgrade requests: ${message}` },
      { status: 500 }
    );
  }
}

// ─── POST /api/plan-upgrade ─────────────────────────────────────────────────
// Creates a new plan upgrade request for the tenant

export async function POST(request: Request) {
  try {
    const tenantId = request.headers.get("x-tenant-id");

    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { requestedPlan } = body as { requestedPlan?: string };

    if (!requestedPlan) {
      return NextResponse.json(
        { success: false, message: "requestedPlan is required" },
        { status: 400 }
      );
    }

    // Validate requested plan exists and is not free
    const planConfig = PLANS[requestedPlan];
    if (!planConfig) {
      return NextResponse.json(
        { success: false, message: "Invalid plan. Must be one of: basic, intermediate, premium, growth" },
        { status: 400 }
      );
    }

    if (requestedPlan === "free") {
      return NextResponse.json(
        { success: false, message: "Cannot request downgrade to free plan" },
        { status: 400 }
      );
    }

    // Fetch tenant
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, message: "Tenant not found" },
        { status: 404 }
      );
    }

    // Validate: must be different from current plan
    if (tenant.plan === requestedPlan) {
      return NextResponse.json(
        { success: false, message: `You are already on the ${planConfig.name} plan` },
        { status: 400 }
      );
    }

    // Validate: no existing pending request
    const existingPending = await db.planUpgradeRequest.findFirst({
      where: {
        tenantId,
        status: "pending",
      },
    });

    if (existingPending) {
      return NextResponse.json(
        { success: false, message: "You already have a pending upgrade request. Please wait for it to be reviewed." },
        { status: 409 }
      );
    }

    // Create the upgrade request
    const upgradeRequest = await db.planUpgradeRequest.create({
      data: {
        tenantId,
        tenantName: tenant.name,
        tenantEmail: tenant.email,
        currentPlan: tenant.plan,
        requestedPlan,
      },
    });

    return NextResponse.json({
      success: true,
      data: upgradeRequest,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to create upgrade request: ${message}` },
      { status: 500 }
    );
  }
}
