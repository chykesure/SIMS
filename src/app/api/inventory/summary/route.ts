import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/inventory/summary - Returns inventory summary
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id") || "";
    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID is required" },
        { status: 400 }
      );
    }

    // Fetch all active items for this tenant
    const items = await db.inventoryItem.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });

    // Fetch recent transactions (last 10) with item name
    const recentTransactions = await db.inventoryTransaction.findMany({
      where: { tenantId },
      include: {
        item: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Compute summary stats
    const totalItems = items.length;
    const totalValue = items.reduce(
      (sum, item) => sum + item.quantity * item.unitCost,
      0
    );

    // Items below reorder level (only active items)
    const lowStockItems = items.filter(
      (item) => item.isActive && item.quantity <= item.reorderLevel
    );

    // Category breakdown
    const categoryMap = new Map<
      string,
      { count: number; totalValue: number; totalQuantity: number }
    >();

    for (const item of items) {
      const category = item.category || "Uncategorized";
      const existing = categoryMap.get(category) || {
        count: 0,
        totalValue: 0,
        totalQuantity: 0,
      };
      existing.count += 1;
      existing.totalValue += item.quantity * item.unitCost;
      existing.totalQuantity += item.quantity;
      categoryMap.set(category, existing);
    }

    const categoryBreakdown = Array.from(categoryMap.entries()).map(
      ([category, stats]) => ({
        category,
        itemCount: stats.count,
        totalQuantity: stats.totalQuantity,
        totalValue: Math.round(stats.totalValue * 100) / 100,
      })
    );

    // Format recent transactions
    const formattedRecentTransactions = recentTransactions.map((t) => ({
      id: t.id,
      itemId: t.itemId,
      itemName: t.item.name,
      type: t.type,
      quantity: t.quantity,
      totalCost: t.totalCost,
      reason: t.reason,
      performedBy: t.performedBy,
      date: t.date,
      createdAt: t.createdAt,
    }));

    const summary = {
      totalItems,
      totalValue: Math.round(totalValue * 100) / 100,
      lowStockAlerts: lowStockItems.length,
      lowStockItems: lowStockItems.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        reorderLevel: item.reorderLevel,
        unit: item.unit,
        location: item.location,
      })),
      categoryBreakdown,
      recentTransactions: formattedRecentTransactions,
    };

    return NextResponse.json(
      { success: true, data: summary },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch inventory summary: ${message}` },
      { status: 500 }
    );
  }
}
