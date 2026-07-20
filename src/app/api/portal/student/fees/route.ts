import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

function getUserId(request: Request): string {
  return request.headers.get("x-user-id") || "";
}

// GET /api/portal/student/fees — Fetch fee assignments with payment status
export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);

    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID required" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID required" },
        { status: 400 }
      );
    }

    // Find user and student
    const user = await db.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user || (user.role || "").toUpperCase() !== "STUDENT" || !user.studentId) {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 }
      );
    }

    const student = await db.student.findFirst({
      where: { id: user.studentId, tenantId },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 }
      );
    }

    // Fetch fee assignments for student's class (specific class or "all")
    const feeAssignments = await db.feeAssignment.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { className: "all" },
          { className: student.class },
        ],
      },
      include: {
        feeType: {
          select: { id: true, name: true, frequency: true, description: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch all payments for this student
    const payments = await db.payment.findMany({
      where: {
        tenantId,
        studentId: student.id,
      },
      orderBy: { createdAt: "desc" },
    });

    // Build fee list with payment status
    const feesWithStatus = feeAssignments.map(fa => {
      const relatedPayments = payments.filter(p => p.assignmentId === fa.id);
      const totalPaid = relatedPayments.reduce((sum, p) => sum + p.amount, 0);
      const balance = fa.amount - totalPaid;
      let status: "paid" | "partial" | "unpaid" = "unpaid";
      if (totalPaid >= fa.amount) status = "paid";
      else if (totalPaid > 0) status = "partial";

      return {
        id: fa.id,
        feeName: fa.feeType?.name || "Unknown Fee",
        feeDescription: fa.feeType?.description || "",
        frequency: fa.feeType?.frequency || "",
        amount: fa.amount,
        session: fa.session,
        term: fa.term,
        dueDate: fa.dueDate,
        className: fa.className,
        totalPaid,
        balance,
        status,
        payments: relatedPayments.map(p => ({
          id: p.id,
          amount: p.amount,
          method: p.method,
          reference: p.reference,
          receiptNo: p.receiptNo,
          status: p.status,
          paidBy: p.paidBy,
          createdAt: p.createdAt,
        })),
      };
    });

    // Summary
    const totalFees = feesWithStatus.reduce((sum, f) => sum + f.amount, 0);
    const totalPaid = feesWithStatus.reduce((sum, f) => sum + f.totalPaid, 0);
    const outstanding = totalFees - totalPaid;
    const paidCount = feesWithStatus.filter(f => f.status === "paid").length;
    const partialCount = feesWithStatus.filter(f => f.status === "partial").length;
    const unpaidCount = feesWithStatus.filter(f => f.status === "unpaid").length;

    return NextResponse.json({
      success: true,
      data: {
        student: {
          id: student.id,
          fullname: student.fullname,
          class: student.class,
          regNo: student.regNo,
        },
        fees: feesWithStatus,
        summary: {
          totalFees,
          totalPaid,
          outstanding,
          totalFeesCount: feesWithStatus.length,
          paidCount,
          partialCount,
          unpaidCount,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch fees: ${message}` },
      { status: 500 }
    );
  }
}
