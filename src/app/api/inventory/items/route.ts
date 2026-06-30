import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

function getTenantId(request: NextRequest): string {
  return request.headers.get("x-tenant-id") || "";
}

// GET /api/inventory/items - List items with optional filters
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
    const category = searchParams.get("category")?.trim() || "";
    const location = searchParams.get("location")?.trim() || "";
    const lowStock = searchParams.get("lowStock") === "true";
    const search = searchParams.get("search")?.trim() || "";

    const where: Prisma.InventoryItemWhereInput = { tenantId };

    if (category) {
      where.category = category;
    }

    if (location) {
      where.location = location;
    }

    if (lowStock) {
      where.isActive = true;
      where.quantity = { lte: db.inventoryItem.fields.reorderLevel };
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { category: { contains: search } },
        { supplier: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const items = await db.inventoryItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      { success: true, data: items },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch inventory items: ${message}` },
      { status: 500 }
    );
  }
}

// POST /api/inventory/items - Create a new item
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
      name,
      category,
      description,
      unit,
      unitCost,
      quantity,
      reorderLevel,
      location,
      supplier,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, message: "Item name is required" },
        { status: 400 }
      );
    }

    const validUnits = ["pcs", "pack", "box", "set", "ream"];
    const selectedUnit = unit?.trim() || "pcs";
    if (!validUnits.includes(selectedUnit)) {
      return NextResponse.json(
        { success: false, message: `Unit must be one of: ${validUnits.join(", ")}` },
        { status: 400 }
      );
    }

    const item = await db.inventoryItem.create({
      data: {
        tenantId,
        name: name.trim(),
        category: category?.trim() || "",
        description: description?.trim() || "",
        unit: selectedUnit,
        unitCost: typeof unitCost === "number" ? unitCost : 0,
        quantity: typeof quantity === "number" ? quantity : 0,
        reorderLevel: typeof reorderLevel === "number" ? reorderLevel : 5,
        location: location?.trim() || "",
        supplier: supplier?.trim() || "",
        isActive: true,
      },
    });

    return NextResponse.json(
      { success: true, message: "Inventory item created successfully", data: item },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to create inventory item: ${message}` },
      { status: 500 }
    );
  }
}
