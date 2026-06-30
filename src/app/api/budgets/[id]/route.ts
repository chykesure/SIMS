import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: NextRequest): string {
  return request.headers.get("x-tenant-id") || "";
}

// GET /api/budgets/[id] — Get single budget with entries
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID is required" },
        { status: 400 }
      );
    }

    const { id } = await params;

    const budget = await db.budget.findFirst({
      where: { id, tenantId },
      include: { entries: true },
    });

    if (!budget) {
      return NextResponse.json(
        { success: false, message: "Budget not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: budget },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch budget: ${message}` },
      { status: 500 }
    );
  }
}

// PUT /api/budgets/[id] — Update budget (title, description, status) and optionally entries
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID is required" },
        { status: 400 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { title, description, status, entries } = body;

    // Ownership check
    const existing = await db.budget.findFirst({
      where: { id, tenantId },
      include: { entries: true },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Budget not found" },
        { status: 404 }
      );
    }

    // Validate status if provided
    if (status) {
      const validStatuses = ["draft", "approved", "active", "closed"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          {
            success: false,
            message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
          },
          { status: 400 }
        );
      }
    }

    // Build update data for budget fields
    const updateData: Record<string, string> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (status !== undefined) updateData.status = status;

    // If entries array is provided, replace all entries and recalculate totals
    if (Array.isArray(entries)) {
      // Validate entries
      for (const entry of entries) {
        if (!entry.category?.trim()) {
          return NextResponse.json(
            { success: false, message: "Each budget entry must have a category" },
            { status: 400 }
          );
        }
        if (Number(entry.allocated) < 0) {
          return NextResponse.json(
            {
              success: false,
              message: `Allocated amount cannot be negative for category: ${entry.category}`,
            },
            { status: 400 }
          );
        }
        if (Number(entry.spent) < 0) {
          return NextResponse.json(
            {
              success: false,
              message: `Spent amount cannot be negative for category: ${entry.category}`,
            },
            { status: 400 }
          );
        }
      }

      const parsedEntries = entries.map((entry: Record<string, unknown>) => ({
        category: String(entry.category || "").trim(),
        description: String(entry.description || "").trim(),
        allocated: Number(entry.allocated) || 0,
        spent: Number(entry.spent) || 0,
      }));

      const totalBudget = parsedEntries.reduce(
        (sum, e) => sum + e.allocated,
        0
      );
      const totalSpent = parsedEntries.reduce((sum, e) => sum + e.spent, 0);

      updateData.totalBudget = String(totalBudget);
      updateData.totalSpent = String(totalSpent);

      // Delete existing entries and create new ones in a transaction
      await db.$transaction(async (tx) => {
        // Delete all existing entries
        await tx.budgetEntry.deleteMany({ where: { budgetId: id } });

        // Create new entries
        await tx.budget.update({
          where: { id },
          data: {
            ...updateData,
            entries: {
              create: parsedEntries.map((entry) => ({
                tenantId,
                category: entry.category,
                description: entry.description,
                allocated: entry.allocated,
                spent: entry.spent,
              })),
            },
          },
        });
      });
    } else {
      // Only update budget fields, no entry changes
      if (Object.keys(updateData).length > 0) {
        await db.budget.update({
          where: { id },
          data: updateData,
        });
      }
    }

    // Return updated budget with entries
    const updated = await db.budget.findFirst({
      where: { id, tenantId },
      include: { entries: true },
    });

    return NextResponse.json(
      { success: true, message: "Budget updated successfully", data: updated },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to update budget: ${message}` },
      { status: 500 }
    );
  }
}

// DELETE /api/budgets/[id] — Delete budget (only draft status can be deleted)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID is required" },
        { status: 400 }
      );
    }

    const { id } = await params;

    // Ownership check
    const existing = await db.budget.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Budget not found" },
        { status: 404 }
      );
    }

    // Only draft budgets can be deleted
    if (existing.status !== "draft") {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot delete budget with status "${existing.status}". Only draft budgets can be deleted.`,
        },
        { status: 409 }
      );
    }

    // Delete budget and its entries in a transaction
    await db.$transaction(async (tx) => {
      await tx.budgetEntry.deleteMany({ where: { budgetId: id } });
      await tx.budget.delete({ where: { id } });
    });

    return NextResponse.json(
      { success: true, message: "Budget deleted successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to delete budget: ${message}` },
      { status: 500 }
    );
  }
}
