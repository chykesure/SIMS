import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID is required" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json(
        { success: false, message: "studentId is required" },
        { status: 400 }
      );
    }

    // Find the student
    const student = await db.student.findUnique({
      where: { id: studentId, tenantId },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 }
      );
    }

    // Fetch fee assignments for this student's class
    const feeAssignments = await db.feeAssignment.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { className: student.class },
          { className: "all" },
        ],
      },
      include: {
        feeType: true,
        payments: {
          where: {
            studentId: student.id,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Build fee breakdown
    const feeBreakdown = feeAssignments.map((fa) => {
      const feeAmount = fa.amount || fa.feeType.amount || 0;
      const totalPaid = fa.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const balance = feeAmount - totalPaid;

      let status: "paid" | "partial" | "unpaid" = "unpaid";
      if (balance <= 0) status = "paid";
      else if (totalPaid > 0) status = "partial";

      return {
        id: fa.id,
        feeTypeId: fa.feeType.id,
        feeTypeName: fa.feeType.name,
        feeTypeDescription: fa.feeType.description,
        feeTypeFrequency: fa.feeType.frequency,
        className: fa.className,
        session: fa.session,
        term: fa.term,
        amount: feeAmount,
        totalPaid,
        balance,
        status,
        dueDate: fa.dueDate,
        payments: fa.payments.map((p) => ({
          id: p.id,
          amount: p.amount,
          method: p.method,
          reference: p.reference,
          receiptNo: p.receiptNo,
          term: p.term,
          session: p.session,
          paidBy: p.paidBy,
          note: p.note,
          status: p.status,
          createdAt: p.createdAt,
        })),
      };
    });

    // Calculate totals
    const totalAmount = feeBreakdown.reduce((sum, f) => sum + f.amount, 0);
    const totalPaid = feeBreakdown.reduce((sum, f) => sum + f.totalPaid, 0);
    const totalOutstanding = totalAmount - totalPaid;
    const paidCount = feeBreakdown.filter((f) => f.status === "paid").length;
    const partialCount = feeBreakdown.filter((f) => f.status === "partial").length;
    const unpaidCount = feeBreakdown.filter((f) => f.status === "unpaid").length;

    return NextResponse.json({
      success: true,
      data: {
        student: {
          id: student.id,
          fullname: student.fullname,
          regNo: student.regNo,
          class: student.class,
        },
        fees: feeBreakdown,
        summary: {
          totalAmount,
          totalPaid,
          totalOutstanding,
          totalFees: feeBreakdown.length,
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
