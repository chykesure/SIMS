import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const tenants = await db.tenant.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            users: true,
            students: true,
            teachers: true,
            classes: true,
            subjects: true,
            examScores: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      schools: tenants.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        logo: t.logo,
        motto: t.motto,
        primaryColor: t.primaryColor,
        email: t.email,
        phone: t.phone,
        state: t.state,
        address: t.address,
        website: t.website,
        status: t.status,
        plan: t.plan,
        maxStudents: t.maxStudents,
        maxUsers: t.maxUsers,
        planStart: t.planStart,
        planEnd: t.planEnd,
        rejectionReason: t.rejectionReason,
        isActive: t.isActive,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        ...t._count,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, message: `Failed to fetch schools: ${message}` },
      { status: 500 }
    );
  }
}

// Helper: Get plan limits from DB SubscriptionPlan table
async function getPlanLimits(planKey: string) {
  const plan = await db.subscriptionPlan.findUnique({ where: { planKey } });
  if (plan) {
    return { maxStudents: plan.maxStudents, maxUsers: plan.maxUsers, validityDays: plan.validityDays, priceNGN: plan.priceNGN };
  }
  // Fallback defaults
  const defaults: Record<string, { maxStudents: number; maxUsers: number; validityDays: number; priceNGN: number }> = {
    free: { maxStudents: 10, maxUsers: 2, validityDays: 90, priceNGN: 0 },
    basic: { maxStudents: 50, maxUsers: 3, validityDays: 90, priceNGN: 20000 },
    intermediate: { maxStudents: 200, maxUsers: 15, validityDays: 90, priceNGN: 35000 },
    premium: { maxStudents: 500, maxUsers: 100, validityDays: 90, priceNGN: 40000 },
    growth: { maxStudents: 999999, maxUsers: 999999, validityDays: 90, priceNGN: 50000 },
  };
  return defaults[planKey] || defaults.free;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, schoolId, status, plan, rejectionReason, maxStudents, maxUsers } = body;

    console.log("[DEV-SCHOOLS POST] Received:", { action, schoolId, status, plan });

    if (!action || typeof action !== "string") {
      return NextResponse.json(
        { success: false, message: "Action field is required" },
        { status: 400 }
      );
    }

    // ---- UPDATE STATUS: approve, reject, suspend, reactivate ----
    if (action === "update_status") {
      if (!schoolId || !status) {
        return NextResponse.json(
          { success: false, message: "School ID and status are required" },
          { status: 400 }
        );
      }

      const validStatuses = ["approved", "rejected", "suspended", "pending"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, message: `Invalid status: ${status}` },
          { status: 400 }
        );
      }

      const school = await db.tenant.findUnique({ where: { id: schoolId } });
      if (!school) {
        return NextResponse.json(
          { success: false, message: "School not found" },
          { status: 404 }
        );
      }

      const updateData: Record<string, unknown> = { status };
      if (rejectionReason) {
        updateData.rejectionReason = rejectionReason;
      }
      if (status === "approved") {
        updateData.rejectionReason = "";
        // When approving, set plan limits from DB
        const limits = await getPlanLimits(school.plan || "basic");
        updateData.maxStudents = limits.maxStudents;
        updateData.maxUsers = limits.maxUsers;
        const now = new Date();
        updateData.planStart = now;
        updateData.planEnd = new Date(now.getTime() + limits.validityDays * 24 * 60 * 60 * 1000);
      }

      const updated = await db.tenant.update({
        where: { id: schoolId },
        data: updateData,
      });

      await db.activityLog.create({
        data: {
          tenantId: schoolId,
          action: `school_${status}`,
          details: `School status changed to "${status}" by Platform Admin.${rejectionReason ? ` Reason: ${rejectionReason}` : ""}`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `School ${status} successfully`,
        school: updated,
      });
    }

    // ---- UPDATE PLAN: change subscription plan ----
    if (action === "update_plan") {
      if (!schoolId || !plan) {
        return NextResponse.json(
          { success: false, message: "School ID and plan are required" },
          { status: 400 }
        );
      }

      const validPlans = ["free", "basic", "intermediate", "premium", "growth"];
      if (!validPlans.includes(plan)) {
        return NextResponse.json(
          { success: false, message: `Invalid plan: ${plan}` },
          { status: 400 }
        );
      }

      const school = await db.tenant.findUnique({ where: { id: schoolId } });
      if (!school) {
        return NextResponse.json(
          { success: false, message: "School not found" },
          { status: 404 }
        );
      }

      // Get limits from DB (not hardcoded)
      const limits = await getPlanLimits(plan);
      const now = new Date();

      const updated = await db.tenant.update({
        where: { id: schoolId },
        data: {
          plan,
          maxStudents: maxStudents || limits.maxStudents,
          maxUsers: maxUsers || limits.maxUsers,
          planStart: now,
          planEnd: new Date(now.getTime() + limits.validityDays * 24 * 60 * 60 * 1000),
        },
      });

      await db.activityLog.create({
        data: {
          tenantId: schoolId,
          action: "plan_changed",
          details: `Plan changed from "${school.plan}" to "${plan}" by Platform Admin`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Plan updated to ${plan}`,
        school: updated,
      });
    }

    // ---- APPROVE WITH PLAN: approve and set plan at the same time ----
    if (action === "approve_with_plan") {
      if (!schoolId) {
        return NextResponse.json(
          { success: false, message: "School ID is required" },
          { status: 400 }
        );
      }

      const school = await db.tenant.findUnique({ where: { id: schoolId } });
      if (!school) {
        return NextResponse.json(
          { success: false, message: "School not found" },
          { status: 404 }
        );
      }

      const planToSet = plan || school.plan || "basic";
      const limits = await getPlanLimits(planToSet);
      const now = new Date();

      const updated = await db.tenant.update({
        where: { id: schoolId },
        data: {
          status: "approved",
          plan: planToSet,
          rejectionReason: "",
          maxStudents: limits.maxStudents,
          maxUsers: limits.maxUsers,
          planStart: now,
          planEnd: new Date(now.getTime() + limits.validityDays * 24 * 60 * 60 * 1000),
        },
      });

      await db.activityLog.create({
        data: {
          tenantId: schoolId,
          action: "school_approved",
          details: `School approved and set to "${planToSet}" plan by Platform Admin`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `School approved with ${planToSet} plan`,
        school: updated,
      });
    }

    // ---- VERIFY PAYMENT: mark payment evidence as verified ----
    if (action === "verify_payment") {
      if (!schoolId) {
        return NextResponse.json(
          { success: false, message: "School ID is required" },
          { status: 400 }
        );
      }

      const school = await db.tenant.findUnique({ where: { id: schoolId } });
      if (!school) {
        return NextResponse.json(
          { success: false, message: "School not found" },
          { status: 404 }
        );
      }

      // Mark all pending payment evidence as verified
      await db.paymentEvidence.updateMany({
        where: { tenantId: schoolId, status: "pending" },
        data: { status: "verified" },
      });

      // Extend plan end date
      const limits = await getPlanLimits(school.plan || "basic");
      const currentEnd = school.planEnd ? new Date(school.planEnd) : new Date();
      const baseDate = currentEnd > new Date() ? currentEnd : new Date();
      const newEnd = new Date(baseDate.getTime() + limits.validityDays * 24 * 60 * 60 * 1000);

      await db.tenant.update({
        where: { id: schoolId },
        data: {
          planEnd: newEnd,
          status: "approved",
        },
      });

      await db.activityLog.create({
        data: {
          tenantId: schoolId,
          action: "payment_verified",
          details: `Payment verified and plan extended to ${newEnd.toLocaleDateString()} by Platform Admin`,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Payment verified and plan extended",
      });
    }

    return NextResponse.json(
      { success: false, message: `Invalid action: ${action}. Supported: update_status, update_plan, approve_with_plan, verify_payment` },
      { status: 400 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, message: `Action failed: ${message}` },
      { status: 500 }
    );
  }
}

// DELETE: Delete a school and all related data
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("id");

    if (!schoolId) {
      return NextResponse.json(
        { success: false, message: "School ID is required" },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9-]+$/.test(schoolId)) {
      return NextResponse.json(
        { success: false, message: "Invalid school ID format" },
        { status: 400 }
      );
    }

    const school = await db.tenant.findUnique({ where: { id: schoolId } });
    if (!school) {
      return NextResponse.json(
        { success: false, message: "School not found" },
        { status: 404 }
      );
    }

    await db.$executeRaw`PRAGMA foreign_keys = OFF`;

    try {
      await db.$executeRaw`DELETE FROM LoginHistory WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM ExamScore WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM StudentRecord WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM ClassPosition WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM SubjectPosition WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM TeacherRemark WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM PrincipalRemark WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM TeacherSignature WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM PrincipalSignature WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM Resumption WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM SchoolSettings WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM AdmissionRecord WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM PaymentEvidence WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM PlanUpgradeRequest WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM ActivityLog WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM SecurityAuditLog WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM ParentStudent WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM Parent WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM Budget WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM BudgetEntry WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM FeeType WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM FeeAssignment WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM Payment WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM IncomeExpense WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM Voucher WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM InventoryItem WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM InventoryTransaction WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM Classroom WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM Announcement WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM Assignment WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM Submission WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM ClassMaterial WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM Student WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM Teacher WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM Subject WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM Class WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM Session WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM User WHERE tenantId = ${schoolId}`;
      await db.$executeRaw`DELETE FROM Tenant WHERE id = ${schoolId}`;
    } finally {
      await db.$executeRaw`PRAGMA foreign_keys = ON`;
    }

    return NextResponse.json({
      success: true,
      message: `School "${school.name}" and all data deleted`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, message: `Delete failed: ${message}` },
      { status: 500 }
    );
  }
}