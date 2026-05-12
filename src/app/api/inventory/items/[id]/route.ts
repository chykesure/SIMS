import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/inventory/items/[id] - Unused but available for single item lookup
// PUT /api/inventory/items/[id] - Update an item
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

    const existing = await db.inventoryItem.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Inventory item not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      name,
      category,
      description,
      unit,
      unitCost,
      quantity,
      reorderLevel,
      location,
      supplier,
      isActive,
    } = body;

    const validUnits = ["pcs", "pack", "box", "set", "ream"];
    if (unit?.trim() && !validUnits.includes(unit.trim())) {
      return NextResponse.json(
        { success: false, message: `Unit must be one of: ${validUnits.join(", ")}` },
        { status: 400 }
      );
    }

    const item = await db.inventoryItem.update({
      where: { id },
      data: {
        name: name?.trim() ?? existing.name,
        category: category?.trim() ?? existing.category,
        description: description?.trim() ?? existing.description,
        unit: unit?.trim() ?? existing.unit,
        unitCost: typeof unitCost === "number" ? unitCost : existing.unitCost,
        quantity: typeof quantity === "number" ? quantity : existing.quantity,
        reorderLevel: typeof reorderLevel === "number" ? reorderLevel : existing.reorderLevel,
        location: location?.trim() ?? existing.location,
        supplier: supplier?.trim() ?? existing.supplier,
        isActive: typeof isActive === "boolean" ? isActive : existing.isActive,
      },
    });

    return NextResponse.json(
      { success: true, message: "Inventory item updated successfully", data: item },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to update inventory item: ${message}` },
      { status: 500 }
    );
  }
}

// DELETE /api/inventory/items/[id] - Delete an item (only if no transactions)
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

    const existing = await db.inventoryItem.findFirst({
      where: { id, tenantId },
      include: { transactions: true },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Inventory item not found" },
        { status: 404 }
      );
    }

    if (existing.transactions.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot delete item: it has ${existing.transactions.length} transaction(s). Delete transactions first or deactivate the item instead.`,
        },
        { status: 409 }
      );
    }

    await db.inventoryItem.delete({ where: { id } });

    return NextResponse.json(
      { success: true, message: "Inventory item deleted successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to delete inventory item: ${message}` },
      { status: 500 }
    );
  }
}
