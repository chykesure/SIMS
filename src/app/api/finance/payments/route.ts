import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

/**
 * Generate a receipt number in the format "RCT-YYYYMMDD-XXX"
 * where XXX is a 3-digit counter for today's receipts.
 */
async function generateReceiptNo(tenantId: string): Promise<string> {
  const today = new Date();
  const dateStr = today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, "0") +
    String(today.getDate()).padStart(2, "0");

  const prefix = `RCT-${dateStr}-`;

  // Find the last receipt with today's prefix for this tenant
  const lastPayment = await db.payment.findFirst({
    where: {
      tenantId,
      receiptNo: { startsWith: prefix },
    },
    orderBy: { receiptNo: "desc" },
    select: { receiptNo: true },
  });

  let counter = 1;
  if (lastPayment?.receiptNo) {
    const lastCounter = parseInt(lastPayment.receiptNo.slice(prefix.length), 10);
    if (!isNaN(lastCounter)) {
      counter = lastCounter + 1;
    }
  }

  return `${prefix}${String(counter).padStart(3, "0")}`;
}

export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const { searchParams } = new URL(request.url);
    const session = searchParams.get("session");
    const term = searchParams.get("term");
    const studentId = searchParams.get("studentId");
    const feeTypeId = searchParams.get("feeTypeId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = { tenantId };
    if (session) where.session = session;
    if (term) where.term = term;
    if (studentId) where.studentId = studentId;
    if (status) where.status = status;
    if (feeTypeId) {
      where.assignment = { feeTypeId };
    }

    const payments = await db.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
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

    return NextResponse.json({ success: true, data: payments });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch payments: ${message}` },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const {
      assignmentId,
      studentId,
      studentName,
      studentRegNo,
      feeTypeName,
      amount,
      method,
      reference,
      term,
      session,
      paidBy,
      note,
      status,
    } = body;

    if (!assignmentId) {
      return NextResponse.json(
        { success: false, message: "Assignment ID is required" },
        { status: 400 }
      );
    }

    if (!studentId || !studentName?.trim()) {
      return NextResponse.json(
        { success: false, message: "Student ID and student name are required" },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, message: "Payment amount must be greater than zero" },
        { status: 400 }
      );
    }

    // Verify assignment belongs to the tenant
    const assignment = await db.feeAssignment.findFirst({
      where: { id: assignmentId, tenantId },
    });
    if (!assignment) {
      return NextResponse.json(
        { success: false, message: "Fee assignment not found" },
        { status: 404 }
      );
    }

    // Generate receipt number
    const receiptNo = await generateReceiptNo(tenantId);

    const payment = await db.payment.create({
      data: {
        tenantId,
        assignmentId,
        studentId,
        studentName: studentName.trim(),
        studentRegNo: studentRegNo?.trim() || "",
        feeTypeName: feeTypeName?.trim() || "",
        amount: amount,
        method: method || "cash",
        reference: reference?.trim() || "",
        term: term?.trim() || assignment.term,
        session: session?.trim() || assignment.session,
        paidBy: paidBy?.trim() || "",
        note: note?.trim() || "",
        status: status || "completed",
        receiptNo,
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
      { success: true, message: "Payment recorded successfully", data: payment },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to create payment: ${message}` },
      { status: 500 }
    );
  }
}
