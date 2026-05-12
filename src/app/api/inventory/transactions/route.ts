import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

function getTenantId(request: NextRequest): string {
  return request.headers.get("x-tenant-id") || "";
}

// GET /api/inventory/transactions - List transactions with optional filters
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
    const itemId = searchParams.get("itemId")?.trim() || "";
    const type = searchParams.get("type")?.trim() || "";
    const startDate = searchParams.get("startDate")?.trim() || "";
    const endDate = searchParams.get("endDate")?.trim() || "";

    const where: Prisma.InventoryTransactionWhereInput = { tenantId };

    if (itemId) {
      where.itemId = itemId;
    }

    if (type) {
      const validTypes = ["stock_in", "stock_out", "adjustment"];
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { success: false, message: `Type must be one of: ${validTypes.join(", ")}` },
          { status: 400 }
        );
      }
      where.type = type;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        (where.date as Prisma.StringNullableFilter).gte = startDate;
      }
      if (endDate) {
        (where.date as Prisma.StringNullableFilter).lte = endDate;
      }
    }

    const transactions = await db.inventoryTransaction.findMany({
      where,
      include: {
        item: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Flatten the item name into the response
    const flatTransactions = transactions.map((t) => ({
      id: t.id,
      tenantId: t.tenantId,
      itemId: t.itemId,
      itemName: t.item.name,
      type: t.type,
      quantity: t.quantity,
      unitCost: t.unitCost,
      totalCost: t.totalCost,
      reason: t.reason,
      reference: t.reference,
      performedBy: t.performedBy,
      date: t.date,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    return NextResponse.json(
      { success: true, data: flatTransactions },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch transactions: ${message}` },
      { status: 500 }
    );
  }
}

// POST /api/inventory/transactions - Create a transaction AND update item quantity
export async function POST(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      itemId,
      type,
      quantity,
      unitCost,
      totalCost,
      reason,
      reference,
      performedBy,
      date,
    } = body;

    if (!itemId?.trim()) {
      return NextResponse.json(
        { success: false, message: "Item ID is required" },
        { status: 400 }
      );
    }

    const validTypes = ["stock_in", "stock_out", "adjustment"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, message: `Type must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    if (typeof quantity !== "number" || quantity < 0) {
      return NextResponse.json(
        { success: false, message: "Quantity must be a non-negative number" },
        { status: 400 }
      );
    }

    // Verify the item belongs to this tenant
    const item = await db.inventoryItem.findFirst({
      where: { id: itemId, tenantId },
    });
    if (!item) {
      return NextResponse.json(
        { success: false, message: "Inventory item not found" },
        { status: 404 }
      );
    }

    const computedTotalCost =
      typeof totalCost === "number"
        ? totalCost
        : (typeof unitCost === "number" ? unitCost : item.unitCost) * quantity;

    const txUnitCost =
      typeof unitCost === "number" ? unitCost : item.unitCost;

    // Build the reason for adjustments (store original quantity)
    let finalReason = reason?.trim() || "";
    let newQuantity = item.quantity;

    if (type === "stock_in") {
      newQuantity = item.quantity + quantity;
      if (!finalReason) {
        finalReason = `Stocked in ${quantity} ${item.unit}`;
      }
    } else if (type === "stock_out") {
      if (item.quantity < quantity) {
        return NextResponse.json(
          {
            success: false,
            message: `Insufficient stock. Current quantity: ${item.quantity} ${item.unit}, requested: ${quantity} ${item.unit}`,
          },
          { status: 400 }
        );
      }
      newQuantity = item.quantity - quantity;
      if (!finalReason) {
        finalReason = `Stocked out ${quantity} ${item.unit}`;
      }
    } else if (type === "adjustment") {
      if (!finalReason) {
        finalReason = `Adjusted from ${item.quantity} to ${quantity} ${item.unit}`;
      } else {
        finalReason = `${finalReason} (was ${item.quantity} ${item.unit})`;
      }
      newQuantity = quantity;
    }

    // Create transaction and update item quantity in a transaction
    const transaction = await db.$transaction(async (tx) => {
      const newTx = await tx.inventoryTransaction.create({
        data: {
          tenantId,
          itemId,
          type,
          quantity,
          unitCost: txUnitCost,
          totalCost: computedTotalCost,
          reason: finalReason,
          reference: reference?.trim() || "",
          performedBy: performedBy?.trim() || "",
          date: date?.trim() || new Date().toISOString().split("T")[0],
        },
      });

      await tx.inventoryItem.update({
        where: { id: itemId },
        data: { quantity: newQuantity },
      });

      return newTx;
    });

    return NextResponse.json(
      {
        success: true,
        message: `Transaction recorded: ${type.replace("_", " ")} ${quantity} ${item.unit}`,
        data: transaction,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to create transaction: ${message}` },
      { status: 500 }
    );
  }
}
