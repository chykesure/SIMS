import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    const userId = request.headers.get("x-user-id");

    if (!tenantId || !userId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID and User ID are required" },
        { status: 400 }
      );
    }

    // Find the user to get parentId
    const user = await db.user.findUnique({
      where: { id: userId, tenantId },
    });

    if (!user || !user.parentId) {
      return NextResponse.json(
        { success: false, message: "Parent account not found" },
        { status: 404 }
      );
    }

    // Fetch parent with students
    const parent = await db.parent.findUnique({
      where: { id: user.parentId, tenantId },
      include: {
        students: {
          include: {
            student: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!parent) {
      return NextResponse.json(
        { success: false, message: "Parent record not found" },
        { status: 404 }
      );
    }

    // Build children list with stats
    const children = await Promise.all(
      parent.students.map(async (ps) => {
        const student = ps.student;

        // Fetch latest student record (most recent session/term)
        const latestRecord = await db.studentRecord.findFirst({
          where: {
            tenantId,
            fullname: student.fullname,
          },
          orderBy: { createdAt: "desc" },
        });

        // Fetch latest class position
        const latestPosition = await db.classPosition.findFirst({
          where: {
            tenantId,
            fullname: student.fullname,
          },
          orderBy: { createdAt: "desc" },
        });

        // Fetch fee summary for student's class
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
            },
          },
        });

        let totalFees = 0;
        let totalPaid = 0;
        const feesDue: { name: string; balance: number }[] = [];

        for (const fa of feeAssignments) {
          const feeAmount = fa.amount || fa.feeType.amount || 0;
          totalFees += feeAmount;
          const paid = fa.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
          totalPaid += paid;
          const balance = feeAmount - paid;
          if (balance > 0) {
            feesDue.push({ name: fa.feeType.name, balance });
          }
        }

        return {
          id: student.id,
          regNo: student.regNo,
          fullname: student.fullname,
          gender: student.gender,
          class: student.class,
          classRef: student.classRef,
          basic: student.basic,
          department: student.department,
          imageUrl: student.imageUrl,
          // Academic stats
          latestAverage: latestRecord?.average || 0,
          latestPosition: latestPosition?.position || 0,
          latestOverallPosition: latestPosition?.overallPosition || 0,
          latestTotalStudents: latestPosition?.totalStudents || 0,
          latestSession: latestRecord?.session || "",
          latestTerm: latestRecord?.term || "",
          // Fee stats
          totalFees,
          totalPaid,
          feesOutstanding: totalFees - totalPaid,
          feesDue,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        parent: {
          id: parent.id,
          fullname: parent.fullname,
          email: parent.email,
          phone: parent.phone,
          address: parent.address,
          occupation: parent.occupation,
          imageUrl: parent.imageUrl,
        },
        children,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch parent data: ${message}` },
      { status: 500 }
    );
  }
}
