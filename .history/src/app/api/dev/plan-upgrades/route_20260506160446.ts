import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPlanConfig } from "@/lib/plans";

// ─── GET /api/dev/plan-upgrades ─────────────────────────────────────────────
// List all upgrade requests with pagination, status filter, and count summary

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
    );
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      where.status = status;
    }

    // Fetch counts in parallel
    const [total, pendingCount, approvedCount, rejectedCount, requests] =
      await Promise.all([
        db.planUpgradeRequest.count({ where }),
        db.planUpgradeRequest.count({ where: { status: "pending" } }),
        db.planUpgradeRequest.count({ where: { status: "approved" } }),
        db.planUpgradeRequest.count({ where: { status: "rejected" } }),
        db.planUpgradeRequest.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          include: {
            tenant: {
              select: {
                name: true,
                email: true,
                plan: true,
              },
            },
          },
        }),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        requests,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        counts: {
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount,
          total,
        },
      },
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

// ─── POST /api/dev/plan-upgrades ────────────────────────────────────────────
// Review (approve or reject) an upgrade request

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { requestId, action, note } = body as {
      requestId?: string;
      action?: string;
      note?: string;
    };

    if (!requestId) {
      return NextResponse.json(
        { success: false, message: "requestId is required" },
        { status: 400 }
      );
    }

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, message: "action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    // Fetch the upgrade request
    const upgradeRequest = await db.planUpgradeRequest.findUnique({
      where: { id: requestId },
    });

    if (!upgradeRequest) {
      return NextResponse.json(
        { success: false, message: "Upgrade request not found" },
        { status: 404 }
      );
    }

    if (upgradeRequest.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          message: `This request has already been ${upgradeRequest.status}`,
        },
        { status: 400 }
      );
    }

    const now = new Date();

    if (action === "approve") {
      const planConfig = getPlanConfig(upgradeRequest.requestedPlan);

      // Update the upgrade request status
      const updatedRequest = await db.planUpgradeRequest.update({
        where: { id: requestId },
        data: {
          status: "approved",
          reviewedAt: now,
          adminNote: note || "Approved",
        },
      });

      // Calculate plan end date (365 days from now — per session / per year)
      const planEnd = new Date(now);
      planEnd.setDate(planEnd.getDate() + 365);

      // Update tenant plan, limits, and dates
      await db.tenant.update({
        where: { id: upgradeRequest.tenantId },
        data: {
          plan: planConfig.id,
          maxStudents: planConfig.maxStudents,
          maxUsers: planConfig.maxUsers,
          planStart: now,
          planEnd,
        },
      });

      // Create activity log for the tenant
      await db.activityLog.create({
        data: {
          tenantId: upgradeRequest.tenantId,
          action: "plan_changed",
          details: `Plan upgrade approved: ${upgradeRequest.currentPlan} → ${upgradeRequest.requestedPlan}. ${note ? `Note: ${note}` : ""}`,
        },
      });

      return NextResponse.json({
        success: true,
        data: updatedRequest,
      });
    }

    // action === "reject"
    const updatedRequest = await db.planUpgradeRequest.update({
      where: { id: requestId },
      data: {
        status: "rejected",
        reviewedAt: now,
        adminNote: note || "Rejected",
      },
    });

    // Create activity log for the tenant
    await db.activityLog.create({
      data: {
        tenantId: upgradeRequest.tenantId,
        action: "plan_upgrade_rejected",
        details: `Plan upgrade request rejected: ${upgradeRequest.currentPlan} → ${upgradeRequest.requestedPlan}. ${note ? `Reason: ${note}` : ""}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedRequest,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to review upgrade request: ${message}` },
      { status: 500 }
    );
  }
}
