import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

// ─── PUT: Update a voucher (including status change for approve/cancel) ───────
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = getTenantId(request);
    const { id } = await params;
    const body = await request.json();

    const {
      type,
      title,
      description,
      amount,
      date,
      payeeName,
      payeeDetails,
      particulars,
      authorizedBy,
      status,
      term,
      session,
    } = body;

    // Ownership check: findFirst with tenantId
    const existing = await db.voucher.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Voucher not found" },
        { status: 404 }
      );
    }

    // Validate type if provided
    if (type) {
      const validTypes = ["payment", "receipt", "credit_note", "debit_note"];
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          {
            success: false,
            message: `Invalid voucher type. Must be one of: ${validTypes.join(", ")}`,
          },
          { status: 400 }
        );
      }
    }

    // Validate status if provided
    if (status) {
      const validStatuses = ["draft", "approved", "cancelled"];

      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          {
            success: false,
            message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
          },
          { status: 400 }
        );
      }

      // Business rule: only draft vouchers can be approved or cancelled
      if (
        (status === "approved" || status === "cancelled") &&
        existing.status !== "draft"
      ) {
        return NextResponse.json(
          {
            success: false,
            message: `Only draft vouchers can be ${status}. Current status is "${existing.status}".`,
          },
          { status: 400 }
        );
      }

      // Business rule: approved vouchers can only be cancelled, not set back to draft
      if (
        existing.status === "approved" &&
        status === "draft"
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Cannot revert an approved voucher back to draft. Cancel it instead.",
          },
          { status: 400 }
        );
      }

      // Business rule: cancelled vouchers cannot be changed
      if (existing.status === "cancelled" && status !== "cancelled") {
        return NextResponse.json(
          {
            success: false,
            message: "A cancelled voucher cannot be modified.",
          },
          { status: 400 }
        );
      }
    }

    // Build update data (only include fields that are explicitly provided)
    const updateData: Record<string, unknown> = {};

    if (type !== undefined) updateData.type = type;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (amount !== undefined) updateData.amount = amount;
    if (date !== undefined) updateData.date = date;
    if (payeeName !== undefined) updateData.payeeName = payeeName;
    if (payeeDetails !== undefined) updateData.payeeDetails = payeeDetails;
    if (particulars !== undefined) updateData.particulars = particulars;
    if (authorizedBy !== undefined) updateData.authorizedBy = authorizedBy;
    if (status !== undefined) updateData.status = status;
    if (term !== undefined) updateData.term = term;
    if (session !== undefined) updateData.session = session;

    const voucher = await db.voucher.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: voucher });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      {
        success: false,
        message: `Failed to update voucher: ${message}`,
      },
      { status: 500 }
    );
  }
}

// ─── DELETE: Delete a voucher (only draft vouchers can be deleted) ───────────
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = getTenantId(request);
    const { id } = await params;

    // Ownership check: findFirst with tenantId
    const existing = await db.voucher.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Voucher not found" },
        { status: 404 }
      );
    }

    // Business rule: only draft vouchers can be deleted
    if (existing.status !== "draft") {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot delete voucher with status "${existing.status}". Only draft vouchers can be deleted.`,
        },
        { status: 400 }
      );
    }

    await db.voucher.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Voucher deleted successfully",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      {
        success: false,
        message: `Failed to delete voucher: ${message}`,
      },
      { status: 500 }
    );
  }
}
