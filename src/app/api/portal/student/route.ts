import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

function getUserId(request: Request): string {
  return request.headers.get("x-user-id") || "";
}

// GET /api/portal/student — Fetch student profile, stats, fees summary
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

    // Find the user
    const user = await db.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if (user.role !== "Student") {
      return NextResponse.json(
        { success: false, message: "Access denied. Not a student account." },
        { status: 403 }
      );
    }

    if (!user.studentId) {
      return NextResponse.json(
        { success: false, message: "No student record linked to this account." },
        { status: 400 }
      );
    }

    // Fetch student record
    const student = await db.student.findFirst({
      where: { id: user.studentId, tenantId },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student record not found." },
        { status: 404 }
      );
    }

    // Fetch total exam scores
    const examScoresCount = await db.examScore.count({
      where: { tenantId, fullname: student.fullname, class: student.class },
    });

    // Fetch latest exam scores (most recent session/term)
    const latestScores = await db.examScore.findMany({
      where: { tenantId, fullname: student.fullname, class: student.class },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Get the latest session/term from scores
    const latestSession = latestScores.length > 0 ? latestScores[0].session : "";
    const latestTerm = latestScores.length > 0 ? latestScores[0].term : "";

    // Fetch fee assignments for student's class (all or specific)
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
          select: { id: true, name: true, frequency: true },
        },
      },
    });

    // Fetch payments for this student
    const payments = await db.payment.findMany({
      where: {
        tenantId,
        studentId: student.id,
      },
    });

    const totalFees = feeAssignments.reduce((sum, fa) => sum + fa.amount, 0);
    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);

    // Fetch pending assignments count
    const assignments = await db.assignment.findMany({
      where: {
        tenantId,
        status: "active",
      },
    });

    // Count submissions by this student
    const submissionCount = await db.submission.count({
      where: {
        tenantId,
        studentId: student.id,
      },
    });

    // Fetch recent announcements (all classrooms for the tenant)
    const announcements = await db.announcement.findMany({
      where: { tenantId },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 5,
    });

    return NextResponse.json({
      success: true,
      data: {
        student: {
          id: student.id,
          regNo: student.regNo,
          fullname: student.fullname,
          gender: student.gender,
          class: student.class,
          classRef: student.classRef,
          basic: student.basic,
          department: student.department,
          parentNo: student.parentNo,
          imageUrl: student.imageUrl,
          dateOfBirth: student.dateOfBirth,
        },
        stats: {
          examScoresCount,
          totalFees,
          totalPayments,
          outstandingFees: totalFees - totalPayments,
          pendingAssignments: assignments.length - submissionCount,
          totalSubjects: latestSession
            ? new Set(latestScores.filter(s => s.session === latestSession && s.term === latestTerm).map(s => s.subject)).size
            : 0,
          latestSession,
          latestTerm,
        },
        latestScores,
        recentAnnouncements: announcements.map(a => ({
          id: a.id,
          title: a.title,
          content: a.content,
          pinned: a.pinned,
          createdByName: a.createdByName,
          createdAt: a.createdAt,
        })),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch student data: ${message}` },
      { status: 500 }
    );
  }
}
