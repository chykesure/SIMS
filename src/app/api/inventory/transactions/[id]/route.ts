import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// PUT /api/inventory/transactions/[id] - Update a transaction (reverse old + apply new)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = request.headers.get("x-tenant-id") || "";
    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID is required" },
        { status: 400 }
      );
    }

    const { id } = await params;

    // Fetch the existing transaction with its item
    const existing = await db.inventoryTransaction.findFirst({
      where: { id, tenantId },
      include: { item: true },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Transaction not found" },
        { status: 404 }
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

    const validTypes = ["stock_in", "stock_out", "adjustment"];
    const newType = type || existing.type;
    if (!validTypes.includes(newType)) {
      return NextResponse.json(
        { success: false, message: `Type must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const newQuantity =
      typeof quantity === "number" ? quantity : existing.quantity;
    if (newQuantity < 0) {
      return NextResponse.json(
        { success: false, message: "Quantity must be a non-negative number" },
        { status: 400 }
      );
    }

    // If itemId is changing, verify the new item belongs to this tenant
    const targetItemId = itemId?.trim() || existing.itemId;
    let targetItem = existing.item;

    if (targetItemId !== existing.itemId) {
      const newItem = await db.inventoryItem.findFirst({
        where: { id: targetItemId, tenantId },
      });
      if (!newItem) {
        return NextResponse.json(
          { success: false, message: "Target inventory item not found" },
          { status: 404 }
        );
      }
      targetItem = newItem;
    }

    // Step 1: Reverse the old transaction's effect on the old item
    const oldItemQuantity = existing.item.quantity;
    let reversedOldItemQuantity = oldItemQuantity;

    if (existing.type === "stock_in") {
      reversedOldItemQuantity = oldItemQuantity - existing.quantity;
    } else if (existing.type === "stock_out") {
      reversedOldItemQuantity = oldItemQuantity + existing.quantity;
    }
    // For adjustments, we can't reliably reverse since we don't know the pre-adjustment value
    // We'll handle this by noting it in the reason

    // Step 2: Compute the new item quantity after applying the new transaction
    // If the item changed, start from the target item's current quantity (after reversing old)
    let baseQuantityForNewItem: number;

    if (targetItemId !== existing.itemId) {
      // Different item: old item gets reversed, new item gets the new transaction applied
      baseQuantityForNewItem = targetItem.quantity;
    } else {
      // Same item: reverse old first, then apply new
      baseQuantityForNewItem = reversedOldItemQuantity;
    }

    let newQuantityAfterApply = baseQuantityForNewItem;
    let finalReason = reason?.trim() || "";

    if (newType === "stock_in") {
      newQuantityAfterApply = baseQuantityForNewItem + newQuantity;
      if (!finalReason) {
        finalReason = `Updated stock in: ${newQuantity} ${targetItem.unit}`;
      }
    } else if (newType === "stock_out") {
      if (baseQuantityForNewItem < newQuantity) {
        return NextResponse.json(
          {
            success: false,
            message: `Insufficient stock. Available: ${baseQuantityForNewItem} ${targetItem.unit}, requested: ${newQuantity} ${targetItem.unit}`,
          },
          { status: 400 }
        );
      }
      newQuantityAfterApply = baseQuantityForNewItem - newQuantity;
      if (!finalReason) {
        finalReason = `Updated stock out: ${newQuantity} ${targetItem.unit}`;
      }
    } else if (newType === "adjustment") {
      if (!finalReason) {
        finalReason = `Updated adjustment from ${baseQuantityForNewItem} to ${newQuantity} ${targetItem.unit}`;
      } else {
        finalReason = `${finalReason} (was ${baseQuantityForNewItem} ${targetItem.unit})`;
      }
      newQuantityAfterApply = newQuantity;
    }

    const computedTotalCost =
      typeof totalCost === "number"
        ? totalCost
        : (typeof unitCost === "number" ? unitCost : existing.unitCost) *
          newQuantity;

    const txUnitCost =
      typeof unitCost === "number" ? unitCost : existing.unitCost;

    // Execute all updates in a transaction
    const updatedTransaction = await db.$transaction(async (tx) => {
      // Reverse old transaction effect on old item
      if (existing.type !== "adjustment") {
        await tx.inventoryItem.update({
          where: { id: existing.itemId },
          data: { quantity: reversedOldItemQuantity },
        });
      }
      // If it was an adjustment, we can't reverse properly; leave quantity as is

      // Apply new transaction effect on target item
      await tx.inventoryItem.update({
        where: { id: targetItemId },
        data: { quantity: newQuantityAfterApply },
      });

      // Update the transaction record
      return tx.inventoryTransaction.update({
        where: { id },
        data: {
          itemId: targetItemId,
          type: newType,
          quantity: newQuantity,
          unitCost: txUnitCost,
          totalCost: computedTotalCost,
          reason: finalReason,
          reference: reference?.trim() ?? existing.reference,
          performedBy: performedBy?.trim() ?? existing.performedBy,
          date: date?.trim() ?? existing.date,
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: "Transaction updated successfully",
        data: updatedTransaction,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to update transaction: ${message}` },
      { status: 500 }
    );
  }
}

// DELETE /api/inventory/transactions/[id] - Delete a transaction (reverse quantity change)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = request.headers.get("x-tenant-id") || "";
    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID is required" },
        { status: 400 }
      );
    }

    const { id } = await params;

    // Fetch the existing transaction with its item
    const existing = await db.inventoryTransaction.findFirst({
      where: { id, tenantId },
      include: { item: true },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Transaction not found" },
        { status: 404 }
      );
    }

    // Compute the reversed quantity for the item
    const currentQuantity = existing.item.quantity;
    let newQuantity = currentQuantity;

    if (existing.type === "stock_in") {
      // Reverse a stock-in: subtract the quantity
      newQuantity = currentQuantity - existing.quantity;
      if (newQuantity < 0) {
        return NextResponse.json(
          {
            success: false,
            message: `Cannot reverse stock-in: current quantity (${currentQuantity}) is less than transaction quantity (${existing.quantity}). Manual adjustment may be needed.`,
          },
          { status: 409 }
        );
      }
    } else if (existing.type === "stock_out") {
      // Reverse a stock-out: add the quantity back
      newQuantity = currentQuantity + existing.quantity;
    }
    // For adjustment, we can't know the original quantity before the adjustment,
    // so we leave the item quantity unchanged

    // Delete transaction and update item quantity in a transaction
    await db.$transaction(async (tx) => {
      if (existing.type !== "adjustment") {
        await tx.inventoryItem.update({
          where: { id: existing.itemId },
          data: { quantity: newQuantity },
        });
      }

      await tx.inventoryTransaction.delete({
        where: { id },
      });
    });

    const reversalNote =
      existing.type === "adjustment"
        ? "Note: Item quantity was not reversed (adjustment transactions cannot be reliably reversed)."
        : `Item quantity reversed from ${currentQuantity} to ${newQuantity}.`;

    return NextResponse.json(
      {
        success: true,
        message: `Transaction deleted successfully. ${reversalNote}`,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to delete transaction: ${message}` },
      { status: 500 }
    );
  }
}
