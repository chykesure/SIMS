import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

function getUserId(request: Request): string {
  return request.headers.get("x-user-id") || "";
}

// GET /api/portal/student/results?session=&term= — Fetch student exam results
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

    if (!user || user.role !== "Student" || !user.studentId) {
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

    const { searchParams } = new URL(request.url);
    const session = searchParams.get("session") || "";
    const term = searchParams.get("term") || "";

    // Build where clause for exam scores
    const scoreWhere: Record<string, unknown> = {
      tenantId,
      fullname: student.fullname,
      class: student.class,
    };
    if (session) scoreWhere.session = session;
    if (term) scoreWhere.term = term;

    // Fetch exam scores
    const examScores = await db.examScore.findMany({
      where: scoreWhere,
      orderBy: [{ subject: "asc" }],
    });

    if (examScores.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          student: {
            fullname: student.fullname,
            class: student.class,
            regNo: student.regNo,
          },
          session: session || examScores[0]?.session || "",
          term: term || examScores[0]?.term || "",
          scores: [],
          totalScore: 0,
          average: 0,
          subjectsTaken: 0,
          classPosition: null,
          overallPosition: null,
          totalStudents: 0,
        },
      });
    }

    const resultSession = session || examScores[0].session;
    const resultTerm = term || examScores[0].term;

    // Calculate totals
    const totalScore = examScores.reduce((sum, s) => sum + s.total, 0);
    const subjectsTaken = examScores.length;
    const average = subjectsTaken > 0 ? Math.round((totalScore / subjectsTaken) * 100) / 100 : 0;

    // Fetch student record for position data
    const studentRecord = await db.studentRecord.findFirst({
      where: {
        tenantId,
        fullname: student.fullname,
        class: student.class,
        session: resultSession,
        term: resultTerm,
      },
    });

    // Fetch class position
    const classPosition = await db.classPosition.findFirst({
      where: {
        tenantId,
        fullname: student.fullname,
        class: student.class,
        session: resultSession,
        term: resultTerm,
      },
    });

    // Fetch subject positions for each subject
    const subjectPositions = await db.subjectPosition.findMany({
      where: {
        tenantId,
        fullname: student.fullname,
        class: student.class,
        session: resultSession,
        term: resultTerm,
      },
    });

    // Merge subject positions into scores
    const scoresWithPositions = examScores.map(score => {
      const subjectPos = subjectPositions.find(sp => sp.subject === score.subject);
      return {
        id: score.id,
        subject: score.subject,
        firstCa: score.firstCa,
        secondCa: score.secondCa,
        thirdCa: score.thirdCa,
        exam: score.exam,
        total: score.total,
        grade: getGrade(score.total),
        position: subjectPos?.position || null,
        subjectTotalStudents: subjectPos?.totalStudents || null,
      };
    });

    // Get available sessions and terms for filters
    const distinctSessions = await db.examScore.findMany({
      where: { tenantId, fullname: student.fullname, class: student.class },
      select: { session: true, term: true },
      distinct: ["session", "term"],
      orderBy: { session: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        student: {
          fullname: student.fullname,
          class: student.class,
          regNo: student.regNo,
        },
        session: resultSession,
        term: resultTerm,
        scores: scoresWithPositions,
        totalScore,
        average,
        subjectsTaken,
        classPosition: studentRecord?.classPosition || classPosition?.position || null,
        overallPosition: studentRecord?.overallPosition || classPosition?.overallPosition || null,
        totalStudents: studentRecord?.totalStudents || classPosition?.totalStudents || 0,
        studentRecord: studentRecord
          ? {
              attendance: studentRecord.attendance,
              subjectsPassed: studentRecord.subjectsPassed,
              subjectsFailed: studentRecord.subjectsFailed,
              percentage: studentRecord.percentage,
            }
          : null,
        availableFilters: distinctSessions.map(s => ({ session: s.session, term: s.term })),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch results: ${message}` },
      { status: 500 }
    );
  }
}

function getGrade(total: number): string {
  if (total >= 70) return "A";
  if (total >= 60) return "B";
  if (total >= 50) return "C";
  if (total >= 40) return "D";
  if (total >= 30) return "E";
  return "F";
}
