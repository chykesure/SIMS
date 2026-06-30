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
      type,
      category,
      description,
      amount,
      date,
      reference,
      paidTo,
      receivedFrom,
      method,
      term,
      session,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Entry ID is required" },
        { status: 400 }
      );
    }

    const existing = await db.incomeExpense.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Income/expense entry not found" },
        { status: 404 }
      );
    }

    // Validate type if provided
    if (type && !["income", "expense"].includes(type)) {
      return NextResponse.json(
        { success: false, message: "Type must be either 'income' or 'expense'" },
        { status: 400 }
      );
    }

    const entry = await db.incomeExpense.update({
      where: { id },
      data: {
        type: type ?? existing.type,
        category: category?.trim() ?? existing.category,
        description: description?.trim() ?? existing.description,
        amount: amount ?? existing.amount,
        date: date?.trim() ?? existing.date,
        reference: reference?.trim() ?? existing.reference,
        paidTo: paidTo?.trim() ?? existing.paidTo,
        receivedFrom: receivedFrom?.trim() ?? existing.receivedFrom,
        method: method ?? existing.method,
        term: term?.trim() ?? existing.term,
        session: session?.trim() ?? existing.session,
      },
    });

    return NextResponse.json(
      { success: true, message: "Income/expense entry updated successfully", data: entry }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to update income/expense entry: ${message}` },
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
        { success: false, message: "Entry ID is required" },
        { status: 400 }
      );
    }

    const existing = await db.incomeExpense.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Income/expense entry not found" },
        { status: 404 }
      );
    }

    await db.incomeExpense.delete({ where: { id } });

    return NextResponse.json(
      { success: true, message: "Income/expense entry deleted successfully" }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to delete income/expense entry: ${message}` },
      { status: 500 }
    );
  }
}
