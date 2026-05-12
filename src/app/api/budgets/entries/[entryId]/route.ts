import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: NextRequest): string {
  return request.headers.get("x-tenant-id") || "";
}

/**
 * Helper: recalculate parent budget's totalBudget and totalSpent
 * from its entries after an entry is updated or deleted.
 */
async function recalcBudgetTotals(budgetId: string) {
  const entries = await db.budgetEntry.findMany({ where: { budgetId } });
  const totalBudget = entries.reduce((sum, e) => sum + e.allocated, 0);
  const totalSpent = entries.reduce((sum, e) => sum + e.spent, 0);

  await db.budget.update({
    where: { id: budgetId },
    data: { totalBudget, totalSpent },
  });
}

// PUT /api/budgets/entries/[entryId] — Update a single entry, then recalc parent budget
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID is required" },
        { status: 400 }
      );
    }

    const { entryId } = await params;
    const body = await request.json();
    const { allocated, spent, description } = body;

    // Ownership check — find the entry and verify it belongs to this tenant
    const existing = await db.budgetEntry.findFirst({
      where: { id: entryId, tenantId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Budget entry not found" },
        { status: 404 }
      );
    }

    // Validate numeric fields
    if (allocated !== undefined && Number(allocated) < 0) {
      return NextResponse.json(
        { success: false, message: "Allocated amount cannot be negative" },
        { status: 400 }
      );
    }
    if (spent !== undefined && Number(spent) < 0) {
      return NextResponse.json(
        { success: false, message: "Spent amount cannot be negative" },
        { status: 400 }
      );
    }

    // Build update payload
    const updateData: Record<string, unknown> = {};
    if (allocated !== undefined) updateData.allocated = Number(allocated);
    if (spent !== undefined) updateData.spent = Number(spent);
    if (description !== undefined) updateData.description = String(description).trim();

    // Update the entry
    const updatedEntry = await db.budgetEntry.update({
      where: { id: entryId },
      data: updateData,
    });

    // Recalculate parent budget totals
    await recalcBudgetTotals(existing.budgetId);

    // Return updated budget with all entries
    const budget = await db.budget.findFirst({
      where: { id: existing.budgetId, tenantId },
      include: { entries: true },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Budget entry updated successfully",
        data: budget,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to update budget entry: ${message}` },
      { status: 500 }
    );
  }
}

// DELETE /api/budgets/entries/[entryId] — Delete entry, then recalc parent budget
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID is required" },
        { status: 400 }
      );
    }

    const { entryId } = await params;

    // Ownership check
    const existing = await db.budgetEntry.findFirst({
      where: { id: entryId, tenantId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Budget entry not found" },
        { status: 404 }
      );
    }

    const budgetId = existing.budgetId;

    // Delete the entry
    await db.budgetEntry.delete({ where: { id: entryId } });

    // Recalculate parent budget totals
    await recalcBudgetTotals(budgetId);

    // Return updated budget with remaining entries
    const budget = await db.budget.findFirst({
      where: { id: budgetId, tenantId },
      include: { entries: true },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Budget entry deleted successfully",
        data: budget,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to delete budget entry: ${message}` },
      { status: 500 }
    );
  }
}
