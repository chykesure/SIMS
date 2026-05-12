import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const { searchParams } = new URL(request.url);
    const session = searchParams.get("session");
    const term = searchParams.get("term");

    // Build base filters for session and term
    const paymentWhere: Record<string, unknown> = { tenantId };
    const incomeExpenseWhere: Record<string, unknown> = { tenantId };

    if (session) {
      paymentWhere.session = session;
      incomeExpenseWhere.session = session;
    }
    if (term) {
      paymentWhere.term = term;
      incomeExpenseWhere.term = term;
    }

    // Run all queries in parallel for performance
    const [
      allPayments,
      incomeEntries,
      expenseEntries,
      totalFeesAssigned,
    ] = await Promise.all([
      // Payments with status filters
      db.payment.findMany({
        where: paymentWhere,
        select: {
          amount: true,
          method: true,
          status: true,
        },
      }),
      // Income entries
      db.incomeExpense.findMany({
        where: { ...incomeExpenseWhere, type: "income" },
        select: {
          amount: true,
          category: true,
        },
      }),
      // Expense entries
      db.incomeExpense.findMany({
        where: { ...incomeExpenseWhere, type: "expense" },
        select: {
          amount: true,
          category: true,
        },
      }),
      // Total assigned fees (to compute outstanding)
      db.feeAssignment.findMany({
        where: { ...paymentWhere, isActive: true },
        select: { amount: true },
      }),
    ]);

    // 1. Total income
    const totalIncome = incomeEntries.reduce((sum, e) => sum + e.amount, 0);

    // 2. Total expenses
    const totalExpenses = expenseEntries.reduce((sum, e) => sum + e.amount, 0);

    // 3. Net balance (income - expenses - excluding fee payments to avoid double counting)
    const netBalance = totalIncome - totalExpenses;

    // 4. Fee payments analysis
    const completedPayments = allPayments.filter((p) => p.status === "completed");
    const refundedPayments = allPayments.filter((p) => p.status === "refunded");

    const totalFeesCollected = completedPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalRefunded = refundedPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalAssignedFees = totalFeesAssigned.reduce((sum, a) => sum + a.amount, 0);
    const outstandingFees = Math.max(0, totalAssignedFees - totalFeesCollected);

    // 5. Income breakdown by category
    const incomeByCategory: Record<string, number> = {};
    for (const entry of incomeEntries) {
      incomeByCategory[entry.category] = (incomeByCategory[entry.category] || 0) + entry.amount;
    }

    // 6. Expense breakdown by category
    const expenseByCategory: Record<string, number> = {};
    for (const entry of expenseEntries) {
      expenseByCategory[entry.category] = (expenseByCategory[entry.category] || 0) + entry.amount;
    }

    // 7. Payment method distribution (from completed payments)
    const paymentMethodDistribution: Record<string, number> = {};
    for (const payment of completedPayments) {
      paymentMethodDistribution[payment.method] =
        (paymentMethodDistribution[payment.method] || 0) + payment.amount;
    }

    // 8. Payment status counts
    const paymentStatusCounts: Record<string, number> = {};
    for (const payment of allPayments) {
      paymentStatusCounts[payment.status] = (paymentStatusCounts[payment.status] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      data: {
        session: session || "all",
        term: term || "all",
        income: {
          total: totalIncome,
          byCategory: incomeByCategory,
          transactionCount: incomeEntries.length,
        },
        expenses: {
          total: totalExpenses,
          byCategory: expenseByCategory,
          transactionCount: expenseEntries.length,
        },
        netBalance,
        fees: {
          totalAssigned: totalAssignedFees,
          totalCollected: totalFeesCollected,
          totalOutstanding: outstandingFees,
          totalRefunded: totalRefunded,
        },
        payments: {
          totalTransactions: allPayments.length,
          statusCounts: paymentStatusCounts,
          methodDistribution: paymentMethodDistribution,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch financial summary: ${message}` },
      { status: 500 }
    );
  }
}
