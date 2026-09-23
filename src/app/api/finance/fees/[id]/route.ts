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
        { success: false, message: "Fee type ID is required" }, { status: 400 });
    }

    const existing = await db.feeType.findFirst({
      where: { id, tenantId },
      include: { assignments: true },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Fee type not found" }, { status: 404 });
    }

    // Prevent deletion if assignments exist, unless force=true is passed
    const force = new URL(request.url).searchParams.get("force") === "true";
    if (existing.assignments.length > 0 && !force) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot delete fee type: it has ${existing.assignments.length} assignment(s). Confirm force delete to remove them and their payment records as well.`,
        },
        { status: 409 }
      );
    }

    await db.$transaction([
      // Remove payments linked to this fee type's assignments
      db.payment.deleteMany({
        where: { tenantId, assignment: { feeTypeId: id } },
      }),
      // Remove the assignments themselves
      db.feeAssignment.deleteMany({ where: { feeTypeId: id, tenantId } }),
      // Finally remove the fee type
      db.feeType.delete({ where: { id } }),
    ]);

    return NextResponse.json({
      success: true,
      message:
        existing.assignments.length > 0
          ? `Fee type, its ${existing.assignments.length} assignment(s) and linked payment(s) deleted successfully`
          : "Fee type deleted successfully",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to delete fee type: ${message}` },
      { status: 500 }
    );
  }
}