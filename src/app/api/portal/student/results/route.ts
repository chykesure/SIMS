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

    if (!user || user.role !== "STUDENT" || !user.studentId) {
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

    // ============================================================
    // COMPUTE SUBJECT RANKS ON-THE-FLY (same logic as admin report card)
    // Fetch ALL exam scores for this class/session/term, rank per subject
    // ============================================================
    const allClassScores = await db.examScore.findMany({
      where: {
        tenantId,
        class: student.class,
        session: resultSession,
        term: resultTerm,
      },
      orderBy: { subject: "asc" },
    });

    // Group all class scores by subject, compute ranks
    const subjectScoreMap = new Map<string, { fullname: string; total: number }[]>();
    for (const sc of allClassScores) {
      if (!subjectScoreMap.has(sc.subject)) {
        subjectScoreMap.set(sc.subject, []);
      }
      subjectScoreMap.get(sc.subject)!.push({ fullname: sc.fullname, total: sc.total });
    }

    const computedRanks = new Map<string, { position: number; totalStudents: number }>();
    const studentFullname = student.fullname.toLowerCase();
    for (const [subject, entries] of subjectScoreMap) {
      entries.sort((a, b) => b.total - a.total);
      const totalStudents = entries.length;
      let rank = 1;
      for (let i = 0; i < entries.length; i++) {
        if (i > 0 && entries[i].total < entries[i - 1].total) {
          rank = i + 1;
        }
        if (entries[i].fullname.toLowerCase() === studentFullname) {
          computedRanks.set(subject, { position: rank, totalStudents });
        }
      }
    }

    // Merge computed ranks into scores
    const isJss = student.class.toUpperCase().startsWith("JSS");
    const scoresWithPositions = examScores.map(score => {
      const rankInfo = computedRanks.get(score.subject);
      return {
        id: score.id,
        subject: score.subject,
        firstCa: score.firstCa,
        secondCa: score.secondCa,
        thirdCa: score.thirdCa,
        exam: score.exam,
        total: score.total,
        grade: getGrade(score.total, isJss),
        remark: getRemark(score.total, isJss),
        position: rankInfo?.position || null,
        subjectTotalStudents: rankInfo?.totalStudents || null,
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

function getGrade(total: number, isJss: boolean): string {
  if (isJss) {
    if (total >= 70) return "A";
    if (total >= 60) return "B";
    if (total >= 50) return "C";
    if (total >= 40) return "P";
    return "F";
  }
  if (total >= 75) return "A1";
  if (total >= 70) return "B2";
  if (total >= 65) return "B3";
  if (total >= 60) return "C4";
  if (total >= 55) return "C5";
  if (total >= 50) return "C6";
  if (total >= 45) return "D7";
  if (total >= 40) return "E8";
  return "F9";
}

function getRemark(total: number, isJss: boolean): string {
  if (isJss) {
    if (total >= 70) return "Excellent";
    if (total >= 60) return "Very Good";
    if (total >= 50) return "Good";
    if (total >= 40) return "Pass";
    return "Fail";
  }
  if (total >= 75) return "Distinction";
  if (total >= 70) return "V.Good";
  if (total >= 65) return "Good";
  if (total >= 60) return "Credit";
  if (total >= 55) return "Credit";
  if (total >= 50) return "Credit";
  if (total >= 45) return "Pass";
  if (total >= 40) return "Pass";
  return "Fail";
}