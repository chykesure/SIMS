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
    const { feeTypeId, className, session, term, amount, dueDate, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Assignment ID is required" },
        { status: 400 }
      );
    }

    const existing = await db.feeAssignment.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Fee assignment not found" },
        { status: 404 }
      );
    }

    // If feeTypeId is being changed, verify it belongs to the tenant
    if (feeTypeId && feeTypeId !== existing.feeTypeId) {
      const feeType = await db.feeType.findFirst({
        where: { id: feeTypeId, tenantId },
      });
      if (!feeType) {
        return NextResponse.json(
          { success: false, message: "Fee type not found" },
          { status: 404 }
        );
      }
    }

    const assignment = await db.feeAssignment.update({
      where: { id },
      data: {
        feeTypeId: feeTypeId ?? existing.feeTypeId,
        className: className?.trim() ?? existing.className,
        session: session?.trim() ?? existing.session,
        term: term?.trim() ?? existing.term,
        amount: amount ?? existing.amount,
        dueDate: dueDate?.trim() ?? existing.dueDate,
        isActive: isActive ?? existing.isActive,
      },
      include: {
        feeType: {
          select: { id: true, name: true, frequency: true },
        },
      },
    });

    return NextResponse.json(
      { success: true, message: "Fee assignment updated successfully", data: assignment }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to update fee assignment: ${message}` },
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
        { success: false, message: "Assignment ID is required" },
        { status: 400 }
      );
    }

    const existing = await db.feeAssignment.findFirst({
      where: { id, tenantId },
      include: { payments: true },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Fee assignment not found" },
        { status: 404 }
      );
    }

    // Prevent deletion if payments exist
    if (existing.payments.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot delete assignment: it has ${existing.payments.length} payment(s) linked to it.`,
        },
        { status: 409 }
      );
    }

    await db.feeAssignment.delete({ where: { id } });

    return NextResponse.json(
      { success: true, message: "Fee assignment deleted successfully" }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to delete fee assignment: ${message}` },
      { status: 500 }
    );
  }
}
