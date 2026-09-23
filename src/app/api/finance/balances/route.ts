import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const { searchParams } = new URL(request.url);
    const session = searchParams.get("session");
    const term = searchParams.get("term");
    const className = searchParams.get("className");
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.trim().toLowerCase();

    // 1. Fetch active assignments for this tenant with optional filters
    const assignmentWhere: Record<string, unknown> = { tenantId, isActive: true };
    if (session) assignmentWhere.session = session;
    if (className && className !== "all") assignmentWhere.className = className;
    if (term) assignmentWhere.OR = [{ term }, { term: "" }];

    const assignments = await db.feeAssignment.findMany({
      where: assignmentWhere,
      include: { feeType: { select: { id: true, name: true } } },
    });

    if (assignments.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          rows: [],
          summary: {
            totalExpected: 0, totalCollected: 0, totalOutstanding: 0,
            fullyPaid: 0, partial: 0, unpaid: 0, overpaid: 0, rowCount: 0,
          },
        },
      });
    }

    // 2. Fetch students (optionally filtered by class / search)
    const studentWhere: Record<string, unknown> = { tenantId };
    if (className && className !== "all") studentWhere.class = className;
    if (search) {
      studentWhere.OR = [
        { fullname: { contains: search, mode: "insensitive" as const } },
        { regNo: { contains: search, mode: "insensitive" as const } },
      ];
    }
    const students = await db.student.findMany({
      where: studentWhere,
      select: { id: true, fullname: true, regNo: true, class: true },
    });

    // 3. Total paid per (student, assignment)
    const totals = await db.payment.groupBy({
      by: ["studentId", "assignmentId"],
      where: { tenantId, assignmentId: { in: assignments.map((a) => a.id) } },
      _sum: { amount: true },
    });
    const totalMap = new Map<string, number>();
    for (const t of totals) {
      totalMap.set(`${t.studentId}|${t.assignmentId}`, t._sum.amount ?? 0);
    }

    // 4. Build ledger rows: every student × every assignment that applies to them
    type Row = {
      assignmentId: string; studentId: string; studentName: string;
      regNo: string; className: string; feeTypeName: string;
      session: string; term: string; dueDate: string;
      feeAmount: number; totalPaid: number; outstanding: number; status: string;
    };
    const rows: Row[] = [];

    for (const student of students) {
      for (const a of assignments) {
        if (a.className !== "all" && a.className !== student.class) continue;

        const totalPaid = totalMap.get(`${student.id}|${a.id}`) ?? 0;
        const outstanding = a.amount - totalPaid;
        const rowStatus =
          outstanding <= 0
            ? totalPaid > a.amount ? "overpaid" : "fully_paid"
            : totalPaid > 0 ? "partial" : "unpaid";

        rows.push({
          assignmentId: a.id,
          studentId: student.id,
          studentName: student.fullname,
          regNo: student.regNo,
          className: student.class,
          feeTypeName: a.feeType?.name ?? "Unknown",
          session: a.session,
          term: a.term || "All Terms",
          dueDate: a.dueDate,
          feeAmount: a.amount,
          totalPaid,
          outstanding: Math.max(0, outstanding),
          status: rowStatus,
        });
      }
    }

    // 5. Apply status filter and sort
    const filtered = status && status !== "all" ? rows.filter((r) => r.status === status) : rows;
    filtered.sort((a, b) =>
      a.studentName.localeCompare(b.studentName) || a.feeTypeName.localeCompare(b.feeTypeName)
    );

    // 6. Summary (computed on unfiltered rows for a full picture)
    const summary = {
      totalExpected: rows.reduce((s, r) => s + r.feeAmount, 0),
      totalCollected: rows.reduce((s, r) => s + r.totalPaid, 0),
      totalOutstanding: rows.reduce((s, r) => s + Math.max(0, r.outstanding), 0),
      fullyPaid: rows.filter((r) => r.status === "fully_paid").length,
      partial: rows.filter((r) => r.status === "partial").length,
      unpaid: rows.filter((r) => r.status === "unpaid").length,
      overpaid: rows.filter((r) => r.status === "overpaid").length,
      rowCount: filtered.length,
    };

    return NextResponse.json({ success: true, data: { rows: filtered, summary } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch balances: ${message}` },
      { status: 500 }
    );
  }
}