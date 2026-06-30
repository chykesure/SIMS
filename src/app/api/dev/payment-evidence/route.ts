import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ─── GET /api/dev/payment-evidence ───────────────────────────────────────────
// Dev lists ALL payment evidence across all schools

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";

    // Build where clause with optional filters
    const where: Record<string, unknown> = {};

    if (status && ["pending", "verified", "rejected"].includes(status)) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { tenantName: { contains: search } },
        { tenantEmail: { contains: search } },
        { reference: { contains: search } },
        { fileName: { contains: search } },
        { note: { contains: search } },
      ];
    }

    // Fetch all payment evidence WITH fileData (needed for preview thumbnails)
    // Include tenant relation data
    const evidences = await db.paymentEvidence.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            email: true,
            phone: true,
            state: true,
            status: true,
            plan: true,
          },
        },
      },
    });

    // Compute counts (across ALL evidence, not just filtered)
    const [totalCount, pendingCount, verifiedCount, rejectedCount] =
      await Promise.all([
        db.paymentEvidence.count(),
        db.paymentEvidence.count({ where: { status: "pending" } }),
        db.paymentEvidence.count({ where: { status: "verified" } }),
        db.paymentEvidence.count({ where: { status: "rejected" } }),
      ]);

    return NextResponse.json({
      success: true,
      evidences,
      counts: {
        total: totalCount,
        pending: pendingCount,
        verified: verifiedCount,
        rejected: rejectedCount,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch payment evidence: ${message}` },
      { status: 500 }
    );
  }
}

// ─── POST /api/dev/payment-evidence ──────────────────────────────────────────
// Dev verifies or rejects evidence

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, evidenceId, reviewNote } = body;

    // Validate action
    if (!action || !["verify", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, message: "Invalid action. Must be 'verify' or 'reject'." },
        { status: 400 }
      );
    }

    if (!evidenceId) {
      return NextResponse.json(
        { success: false, message: "Evidence ID is required." },
        { status: 400 }
      );
    }

    // Fetch the evidence record
    const evidence = await db.paymentEvidence.findUnique({
      where: { id: evidenceId },
    });

    if (!evidence) {
      return NextResponse.json(
        { success: false, message: "Payment evidence not found." },
        { status: 404 }
      );
    }

    if (evidence.status !== "pending") {
      return NextResponse.json(
        { success: false, message: `Evidence already ${evidence.status}. Cannot process again.` },
        { status: 400 }
      );
    }

    const now = new Date();

    if (action === "reject") {
      // ── Reject: update status and add review note ──
      const updated = await db.paymentEvidence.update({
        where: { id: evidenceId },
        data: {
          status: "rejected",
          reviewedBy: "SchoolDesk Admin",
          reviewedAt: now,
          reviewNote: reviewNote || "Payment evidence rejected.",
        },
      });

      // Log activity
      await db.activityLog.create({
        data: {
          tenantId: evidence.tenantId,
          action: "payment_rejected",
          details: `Payment evidence (${evidence.id.slice(0, 8)}...) for ${evidence.targetPlan} plan was rejected. Reason: ${reviewNote || "Not specified"}`,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Payment evidence rejected.",
        evidence: updated,
      });
    }

    // ── Verify: update status, upgrade tenant plan ──
    // Read plan config from database (dynamic pricing & limits)
    const planConfig = await db.subscriptionPlan.findUnique({
      where: { planKey: evidence.targetPlan },
    });
    if (!planConfig) {
      return NextResponse.json(
        { success: false, message: `Unknown target plan: ${evidence.targetPlan}` },
        { status: 400 }
      );
    }

    // Calculate plan dates based on DB-configured validity
    const planStart = now;
    const planEnd = new Date(
      now.getTime() + planConfig.validityDays * 24 * 60 * 60 * 1000
    );

    // Update payment evidence status
    const updatedEvidence = await db.paymentEvidence.update({
      where: { id: evidenceId },
      data: {
        status: "verified",
        reviewedBy: "SchoolDesk Admin",
        reviewedAt: now,
        reviewNote: reviewNote || `Payment verified. ${evidence.targetPlan} plan activated.`,
      },
    });

    // CRITICAL: Update the tenant's plan and limits
    const updatedTenant = await db.tenant.update({
      where: { id: evidence.tenantId },
      data: {
        plan: evidence.targetPlan,
        maxStudents: planConfig.maxStudents,
        maxUsers: planConfig.maxUsers,
        planStart,
        planEnd,
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        tenantId: evidence.tenantId,
        action: "payment_verified",
        details: `Payment evidence (${evidence.id.slice(0, 8)}...) verified. Tenant plan upgraded to ${evidence.targetPlan} (maxStudents: ${planConfig.maxStudents}, maxUsers: ${planConfig.maxUsers}, validity: ${planConfig.validityDays} days). Plan expires: ${planEnd.toISOString()}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Payment verified. Tenant upgraded to ${evidence.targetPlan} plan.`,
      evidence: updatedEvidence,
      tenant: {
        id: updatedTenant.id,
        name: updatedTenant.name,
        plan: updatedTenant.plan,
        maxStudents: updatedTenant.maxStudents,
        maxUsers: updatedTenant.maxUsers,
        planStart: updatedTenant.planStart,
        planEnd: updatedTenant.planEnd,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to process payment evidence: ${message}` },
      { status: 500 }
    );
  }
}