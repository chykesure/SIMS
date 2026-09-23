import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

const formatNgn = (amount: number) =>
  amount.toLocaleString("en-NG", { style: "currency", currency: "NGN" });

/**
 * Compute a student's running balance for every (student, assignment) pair.
 * Returns a map of "studentId|assignmentId" -> total amount paid so far.
 */
async function getStudentFeeTotals(tenantId: string): Promise<Map<string, number>> {
  const totals = await db.payment.groupBy({
    by: ["studentId", "assignmentId"],
    where: { tenantId },
    _sum: { amount: true },
  });
  const map = new Map<string, number>();
  for (const t of totals) {
    map.set(`${t.studentId}|${t.assignmentId}`, t._sum.amount ?? 0);
  }
  return map;
}

/** Derive balance fields for a payment row against its fee assignment. */
function attachBalance(
  payment: Record<string, unknown> & {
    studentId: string;
    assignmentId: string;
    amount: number;
    assignment?: { amount?: number } | null;
  },
  totalMap: Map<string, number>
) {
  const feeAmount = payment.assignment?.amount ?? 0;
  const totalPaid = totalMap.get(`${payment.studentId}|${payment.assignmentId}`) ?? payment.amount;
  const outstanding = feeAmount - totalPaid;
  const feeStatus =
    outstanding <= 0
      ? totalPaid > feeAmount
        ? "overpaid"
        : "fully_paid"
      : totalPaid > 0
        ? "partial"
        : "unpaid";
  return { ...payment, feeAmount, totalPaid, outstanding, feeStatus };
}

/** Generate a receipt number "RCT-YYYYMMDD-XXX" */
async function generateReceiptNo(tenantId: string): Promise<string> {
  const today = new Date();
  const dateStr = today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, "0") +
    String(today.getDate()).padStart(2, "0");

  const prefix = `RCT-${dateStr}-`;
  const lastPayment = await db.payment.findFirst({
    where: { tenantId, receiptNo: { startsWith: prefix } },
    orderBy: { receiptNo: "desc" },
    select: { receiptNo: true },
  });

  let counter = 1;
  if (lastPayment?.receiptNo) {
    const lastCounter = parseInt(lastPayment.receiptNo.slice(prefix.length), 10);
    if (!isNaN(lastCounter)) counter = lastCounter + 1;
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
    if (feeTypeId) where.assignment = { feeTypeId };

    const payments = await db.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        assignment: {
          select: {
            id: true, className: true, amount: true,
            feeType: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Attach running balance info so the UI can show outstanding amounts
    const totalMap = await getStudentFeeTotals(tenantId);
    const data = payments.map((p) => attachBalance(p, totalMap));

    return NextResponse.json({ success: true, data });
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
      assignmentId, studentId, studentName, studentRegNo, feeTypeName,
      amount, method, reference, term, session, paidBy, note, status,
    } = body;

    if (!assignmentId) {
      return NextResponse.json(
        { success: false, message: "Assignment ID is required" }, { status: 400 });
    }
    if (!studentId || !studentName?.trim()) {
      return NextResponse.json(
        { success: false, message: "Student ID and student name are required" }, { status: 400 });
    }
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, message: "Payment amount must be greater than zero" }, { status: 400 });
    }

    // Verify assignment belongs to the tenant
    const assignment = await db.feeAssignment.findFirst({
      where: { id: assignmentId, tenantId },
    });
    if (!assignment) {
      return NextResponse.json(
        { success: false, message: "Fee assignment not found" }, { status: 404 });
    }

    const receiptNo = await generateReceiptNo(tenantId);

    const payment = await db.payment.create({
      data: {
        tenantId, assignmentId, studentId,
        studentName: studentName.trim(),
        studentRegNo: studentRegNo?.trim() || "",
        feeTypeName: feeTypeName?.trim() || "",
        amount,
        method: method || "cash",
        reference: reference?.trim() || "",
        term: term?.trim() || assignment.term,
        session: session?.trim() || assignment.session,
        paidBy: paidBy?.trim() || "",
        note: note?.trim() || "",
        status: status || "completed",   // per-transaction flag; balance is computed separately
        receiptNo,
      },
      include: {
        assignment: {
          select: {
            id: true, className: true, amount: true,
            feeType: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Compute remaining balance after this payment and report it back
    const totalMap = await getStudentFeeTotals(tenantId);
    const totalPaid = totalMap.get(`${studentId}|${assignmentId}`) ?? amount;
    const preOutstanding = assignment.amount - (totalPaid - amount);
    const outstanding = assignment.amount - totalPaid;

    let message = "Payment recorded successfully";
    if (outstanding <= 0) {
      message = "Payment recorded. This fee is now fully paid 🎉";
    } else {
      message = `Payment recorded. Outstanding balance: ${formatNgn(outstanding)}`;
    }
    if (amount > preOutstanding) {
      message += ` (exceeds outstanding by ${formatNgn(amount - preOutstanding)})`;
    }

    return NextResponse.json(
      { success: true, message, data: attachBalance(payment, totalMap) },
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