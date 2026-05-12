import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Get all tenants with counts
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
            activityLogs: true,
            payments: true,
            vouchers: true,
            inventoryItems: true,
            budgets: true,
          },
        },
      },
    });

    const stats = {
      totalSchools: tenants.length,
      pending: tenants.filter((t) => t.status === "pending").length,
      approved: tenants.filter((t) => t.status === "approved").length,
      rejected: tenants.filter((t) => t.status === "rejected").length,
      suspended: tenants.filter((t) => t.status === "suspended").length,
      totalStudents: tenants.reduce((sum, t) => sum + t._count.students, 0),
      totalTeachers: tenants.reduce((sum, t) => sum + t._count.teachers, 0),
      totalUsers: tenants.reduce((sum, t) => sum + t._count.users, 0),
      freePlan: tenants.filter((t) => t.plan === "free").length,
      basicPlan: tenants.filter((t) => t.plan === "basic").length,
      intermediatePlan: tenants.filter((t) => t.plan === "intermediate").length,
      premiumPlan: tenants.filter((t) => t.plan === "premium").length,
      growthPlan: tenants.filter((t) => t.plan === "growth").length,
      totalPayments: tenants.reduce((sum, t) => sum + t._count.payments, 0),
      totalVouchers: tenants.reduce((sum, t) => sum + t._count.vouchers, 0),
      totalInventoryItems: tenants.reduce((sum, t) => sum + t._count.inventoryItems, 0),
      totalBudgets: tenants.reduce((sum, t) => sum + t._count.budgets, 0),
    };

    // Get financial totals across all tenants
    const [paymentTotals, expenseTotals, incomeTotals] = await Promise.all([
      db.payment.aggregate({ _sum: { amount: true } }),
      db.incomeExpense.aggregate({ where: { type: "expense" }, _sum: { amount: true } }),
      db.incomeExpense.aggregate({ where: { type: "income" }, _sum: { amount: true } }),
    ]);

    const financialStats = {
      totalFeesCollected: paymentTotals._sum.amount || 0,
      totalExpenses: expenseTotals._sum.amount || 0,
      totalIncome: incomeTotals._sum.amount || 0,
    };

    // Get recent activity
    const recentActivity = await db.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        tenant: {
          select: { name: true, slug: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      stats,
      financialStats,
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
      recentActivity,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, message: `Failed to fetch stats: ${message}` },
      { status: 500 }
    );
  }
}
