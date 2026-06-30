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
    const session = searchParams.get("session");
    const term = searchParams.get("term");

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

    // Build filter for exam scores
    const scoreFilter: Record<string, unknown> = {
      tenantId,
      fullname: student.fullname,
    };
    if (session) scoreFilter.session = session;
    if (term) scoreFilter.term = term;

    // Fetch exam scores
    const examScores = await db.examScore.findMany({
      where: scoreFilter,
      orderBy: { subject: "asc" },
    });

    // Build filter for student records
    const recordFilter: Record<string, unknown> = {
      tenantId,
      fullname: student.fullname,
    };
    if (session) recordFilter.session = session;
    if (term) recordFilter.term = term;

    const studentRecords = await db.studentRecord.findMany({
      where: recordFilter,
      orderBy: { createdAt: "desc" },
    });

    // Fetch class positions
    const positionFilter: Record<string, unknown> = {
      tenantId,
      fullname: student.fullname,
    };
    if (session) positionFilter.session = session;
    if (term) positionFilter.term = term;

    const classPositions = await db.classPosition.findMany({
      where: positionFilter,
      orderBy: { createdAt: "desc" },
    });

    // Get available sessions and terms for filtering
    const allRecords = await db.studentRecord.findMany({
      where: { tenantId, fullname: student.fullname },
      select: { session: true, term: true },
      distinct: ["session", "term"],
      orderBy: { createdAt: "desc" },
    });

    const availableFilters = allRecords.map((r) => ({
      session: r.session,
      term: r.term,
    }));

    // Get latest record if exists
    const latestRecord = studentRecords[0] || null;

    // Get latest position if exists
    const latestPosition = classPositions[0] || null;

    // Helper to compute grade from total score
    function getGrade(total: number): string {
      if (total >= 70) return "A";
      if (total >= 60) return "B";
      if (total >= 50) return "C";
      if (total >= 45) return "D";
      if (total >= 40) return "E";
      return "F";
    }

    function getGradeColor(grade: string): string {
      switch (grade) {
        case "A": return "emerald";
        case "B": return "emerald";
        case "C": return "amber";
        case "D": return "amber";
        case "E": return "red";
        case "F": return "red";
        default: return "slate";
      }
    }

    // Enrich exam scores with grades
    const enrichedScores = examScores.map((score) => {
      const grade = getGrade(score.total);
      return {
        id: score.id,
        subject: score.subject,
        firstCa: score.firstCa,
        secondCa: score.secondCa,
        thirdCa: score.thirdCa,
        exam: score.exam,
        total: score.total,
        grade,
        gradeColor: getGradeColor(grade),
        session: score.session,
        term: score.term,
        class: score.class,
      };
    });

    // Deduplicate positions (can have multiple class entries)
    const uniquePositions: Array<{
      session: string;
      term: string;
      class: string;
      classRef: string;
      position: number;
      totalStudents: number;
      overallPosition: number;
    }> = [];
    const seenPos = new Set<string>();
    for (const pos of classPositions) {
      const key = `${pos.session}-${pos.term}-${pos.class}`;
      if (!seenPos.has(key)) {
        seenPos.add(key);
        uniquePositions.push({
          session: pos.session,
          term: pos.term,
          class: pos.class,
          classRef: pos.classRef,
          position: pos.position,
          totalStudents: pos.totalStudents,
          overallPosition: pos.overallPosition,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        student: {
          id: student.id,
          fullname: student.fullname,
          class: student.class,
          regNo: student.regNo,
        },
        examScores: enrichedScores,
        studentRecords,
        classPositions: uniquePositions,
        latestRecord,
        latestPosition,
        availableFilters,
        activeSession: session,
        activeTerm: term,
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
