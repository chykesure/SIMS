import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: NextRequest): string {
  return request.headers.get("x-tenant-id") || "";
}

// GET /api/budgets/summary — Budget summary with totals, category breakdown, and alerts
export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID is required" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const session = searchParams.get("session")?.trim() || "";
    const term = searchParams.get("term")?.trim() || "";

    // Build where clause
    const where: Record<string, unknown> = { tenantId };
    if (session) where.session = session;
    if (term) where.term = term;

    // Fetch budgets with entries
    const budgets = await db.budget.findMany({
      where,
      include: { entries: true },
      orderBy: { createdAt: "desc" },
    });

    // Overall totals
    const totalBudgets = budgets.length;
    const totalAllocated = budgets.reduce((sum, b) => sum + b.totalBudget, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.totalSpent, 0);
    const remainingBalance = totalAllocated - totalSpent;
    const utilizationPercent =
      totalAllocated > 0
        ? Math.round((totalSpent / totalAllocated) * 10000) / 100
        : 0;

    // Category breakdown: aggregate across all budgets
    const categoryMap = new Map<
      string,
      {
        allocated: number;
        spent: number;
        remaining: number;
        variance: number;
        budgetCount: number;
      }
    >();

    for (const budget of budgets) {
      for (const entry of budget.entries) {
        const existing = categoryMap.get(entry.category);
        if (existing) {
          existing.allocated += entry.allocated;
          existing.spent += entry.spent;
          existing.budgetCount += 1;
        } else {
          categoryMap.set(entry.category, {
            allocated: entry.allocated,
            spent: entry.spent,
            remaining: entry.allocated - entry.spent,
            variance: entry.allocated - entry.spent,
            budgetCount: 1,
          });
        }
      }
    }

    // Finalize category data
    const categoryBreakdown = Array.from(categoryMap.entries()).map(
      ([category, data]) => ({
        category,
        allocated: data.allocated,
        spent: data.spent,
        remaining: data.allocated - data.spent,
        variance: data.allocated - data.spent,
        utilizationPercent:
          data.allocated > 0
            ? Math.round((data.spent / data.allocated) * 10000) / 100
            : 0,
        overBudget: data.spent > data.allocated,
        overAmount: Math.max(0, data.spent - data.allocated),
      })
    );

    // Sort by overBudget descending, then by utilizationPercent descending
    categoryBreakdown.sort((a, b) => {
      if (a.overBudget && !b.overBudget) return -1;
      if (!a.overBudget && b.overBudget) return 1;
      return b.utilizationPercent - a.utilizationPercent;
    });

    // Over/under budget alerts
    const alerts: Array<{
      type: "over_budget" | "nearly_exhausted" | "under_spent" | "info";
      severity: "critical" | "warning" | "info";
      message: string;
      budgetId: string;
      budgetTitle: string;
      category?: string;
      allocated: number;
      spent: number;
      variance: number;
    }> = [];

    for (const budget of budgets) {
      for (const entry of budget.entries) {
        const variance = entry.allocated - entry.spent;
        const utilization =
          entry.allocated > 0
            ? Math.round((entry.spent / entry.allocated) * 100)
            : 0;

        // Over budget: spent more than allocated
        if (entry.spent > entry.allocated) {
          alerts.push({
            type: "over_budget",
            severity: "critical",
            message: `Over budget by ₦${(entry.spent - entry.allocated).toLocaleString()} in "${entry.category}"`,
            budgetId: budget.id,
            budgetTitle: budget.title,
            category: entry.category,
            allocated: entry.allocated,
            spent: entry.spent,
            variance,
          });
        }
        // Nearly exhausted: spent >= 90% but not over
        else if (utilization >= 90 && utilization < 100) {
          alerts.push({
            type: "nearly_exhausted",
            severity: "warning",
            message: `"${entry.category}" is ${utilization}% utilized (${Math.round(100 - utilization)}% remaining)`,
            budgetId: budget.id,
            budgetTitle: budget.title,
            category: entry.category,
            allocated: entry.allocated,
            spent: entry.spent,
            variance,
          });
        }
        // Under spent: allocated but spent < 30%
        else if (entry.allocated > 0 && utilization > 0 && utilization < 30) {
          alerts.push({
            type: "under_spent",
            severity: "info",
            message: `"${entry.category}" is only ${utilization}% utilized — ₦${(entry.allocated - entry.spent).toLocaleString()} unspent`,
            budgetId: budget.id,
            budgetTitle: budget.title,
            category: entry.category,
            allocated: entry.allocated,
            spent: entry.spent,
            variance,
          });
        }
      }

      // Budget-level overall over-budget alert
      if (budget.totalSpent > budget.totalBudget && budget.totalBudget > 0) {
        alerts.push({
          type: "over_budget",
          severity: "critical",
          message: `Budget "${budget.title}" is over budget by ₦${(budget.totalSpent - budget.totalBudget).toLocaleString()}`,
          budgetId: budget.id,
          budgetTitle: budget.title,
          allocated: budget.totalBudget,
          spent: budget.totalSpent,
          variance: budget.totalBudget - budget.totalSpent,
        });
      }
    }

    // Budget vs actual comparison per category
    const budgetVsActual = categoryBreakdown.map((cat) => ({
      category: cat.category,
      budgeted: cat.allocated,
      actual: cat.spent,
      difference: cat.allocated - cat.spent,
      percentUtilized: cat.utilizationPercent,
      status:
        cat.spent > cat.allocated
          ? "over"
          : cat.utilizationPercent >= 90
            ? "caution"
            : cat.utilizationPercent >= 50
              ? "on_track"
              : "under",
    }));

    return NextResponse.json(
      {
        success: true,
        data: {
          totals: {
            totalBudgets,
            totalAllocated,
            totalSpent,
            remainingBalance,
            utilizationPercent,
          },
          categoryBreakdown,
          budgetVsActual,
          alerts: {
            count: alerts.length,
            criticalCount: alerts.filter((a) => a.severity === "critical")
              .length,
            warningCount: alerts.filter((a) => a.severity === "warning")
              .length,
            infoCount: alerts.filter((a) => a.severity === "info").length,
            items: alerts,
          },
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch budget summary: ${message}` },
      { status: 500 }
    );
  }
}
