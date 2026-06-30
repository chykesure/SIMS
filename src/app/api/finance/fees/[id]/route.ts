import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = getTenantId(request);
    const { id } = await params;
    const body = await request.json();
    const { name, description, amount, frequency, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Fee type ID is required" },
        { status: 400 }
      );
    }

    const existing = await db.feeType.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Fee type not found" },
        { status: 404 }
      );
    }

    // Check for duplicate name if name is being changed
    if (name?.trim() && name.trim() !== existing.name) {
      const duplicate = await db.feeType.findFirst({
        where: { tenantId, name: name.trim() },
      });
      if (duplicate) {
        return NextResponse.json(
          { success: false, message: "A fee type with this name already exists" },
          { status: 409 }
        );
      }
    }

    const feeType = await db.feeType.update({
      where: { id },
      data: {
        name: name?.trim() ?? existing.name,
        description: description?.trim() ?? existing.description,
        amount: amount ?? existing.amount,
        frequency: frequency ?? existing.frequency,
        isActive: isActive ?? existing.isActive,
      },
    });

    return NextResponse.json(
      { success: true, message: "Fee type updated successfully", data: feeType }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to update fee type: ${message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = getTenantId(request);
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Fee type ID is required" },
        { status: 400 }
      );
    }

    const existing = await db.feeType.findFirst({
      where: { id, tenantId },
      include: { assignments: true },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Fee type not found" },
        { status: 404 }
      );
    }

    // Prevent deletion if assignments exist
    if (existing.assignments.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot delete fee type: it has ${existing.assignments.length} assignment(s). Delete assignments first.`,
        },
        { status: 409 }
      );
    }

    await db.feeType.delete({ where: { id } });

    return NextResponse.json(
      { success: true, message: "Fee type deleted successfully" }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to delete fee type: ${message}` },
      { status: 500 }
    );
  }
}
