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
    const {
      studentName,
      studentRegNo,
      amount,
      method,
      reference,
      term,
      session,
      paidBy,
      note,
      status,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Payment ID is required" },
        { status: 400 }
      );
    }

    const existing = await db.payment.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Payment not found" },
        { status: 404 }
      );
    }

    const payment = await db.payment.update({
      where: { id },
      data: {
        studentName: studentName?.trim() ?? existing.studentName,
        studentRegNo: studentRegNo?.trim() ?? existing.studentRegNo,
        amount: amount ?? existing.amount,
        method: method ?? existing.method,
        reference: reference?.trim() ?? existing.reference,
        term: term?.trim() ?? existing.term,
        session: session?.trim() ?? existing.session,
        paidBy: paidBy?.trim() ?? existing.paidBy,
        note: note?.trim() ?? existing.note,
        status: status ?? existing.status,
      },
      include: {
        assignment: {
          select: {
            id: true,
            className: true,
            feeType: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return NextResponse.json(
      { success: true, message: "Payment updated successfully", data: payment }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to update payment: ${message}` },
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
        { success: false, message: "Payment ID is required" },
        { status: 400 }
      );
    }

    const existing = await db.payment.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Payment not found" },
        { status: 404 }
      );
    }

    await db.payment.delete({ where: { id } });

    return NextResponse.json(
      { success: true, message: "Payment deleted successfully" }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to delete payment: ${message}` },
      { status: 500 }
    );
  }
}
