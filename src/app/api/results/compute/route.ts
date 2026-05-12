import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

// GET /api/results/compute?session=xxx&class=xxx&term=xxx
export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const { searchParams } = new URL(request.url);
    const session = searchParams.get("session");
    const cls = searchParams.get("class");
    const term = searchParams.get("term");

    if (!session || !cls || !term) {
      return NextResponse.json(
        { success: false, message: "Session, class, and term are required" },
        { status: 400 }
      );
    }

    // Fetch school settings for dynamic CA count
    let caCount = 2;
    try {
      const settings = await db.schoolSettings.findFirst({ where: { tenantId } });
      if (settings) caCount = settings.caCount;
    } catch { /* use default */ }

    // Fetch all exam scores for this session/class/term
    const scores = await db.examScore.findMany({
      where: { tenantId, session, class: cls, term },
      orderBy: { fullname: "asc" },
    });

    if (scores.length === 0) {
      return NextResponse.json(
        { success: false, message: "No exam scores found for the selected criteria" },
        { status: 404 }
      );
    }

    // Group scores by student fullname
    const studentMap = new Map<string, { fullname: string; subjects: typeof scores; totalScore: number }>();

    for (const score of scores) {
      const existing = studentMap.get(score.fullname);
      if (existing) {
        existing.subjects.push(score);
        existing.totalScore += score.total;
      } else {
        studentMap.set(score.fullname, {
          fullname: score.fullname,
          subjects: [score],
          totalScore: score.total,
        });
      }
    }

    // Calculate per-student stats
    interface StudentStats {
      fullname: string;
      totalScore: number;
      subjectsTaken: number;
      subjectsPassed: number;
      subjectsFailed: number;
      average: number;
      percentage: number;
    }

    const studentStats: StudentStats[] = [];
    for (const [, value] of studentMap) {
      const subjectsTaken = value.subjects.length;
      const subjectsPassed = value.subjects.filter((s) => s.total >= 40).length;
      const subjectsFailed = subjectsTaken - subjectsPassed;
      const average = subjectsTaken > 0 ? value.totalScore / subjectsTaken : 0;
      const percentage = average;

      studentStats.push({
        fullname: value.fullname,
        totalScore: value.totalScore,
        subjectsTaken,
        subjectsPassed,
        subjectsFailed,
        average: Math.round(average * 100) / 100,
        percentage: Math.round(percentage * 100) / 100,
      });
    }

    // Sort by totalScore descending to determine class positions (within this arm)
    studentStats.sort((a, b) => b.totalScore - a.totalScore);

    const classArmTotal = studentStats.length;

    // Assign class positions (handle ties) and save records
    let currentPosition = 1;
    for (let i = 0; i < studentStats.length; i++) {
      if (i > 0 && studentStats[i].totalScore < studentStats[i - 1].totalScore) {
        currentPosition = i + 1;
      }

      const stat = studentStats[i];

      const existing = await db.studentRecord.findFirst({
        where: { tenantId, session, class: cls, term, fullname: stat.fullname },
      });

      if (existing) {
        await db.studentRecord.update({
          where: { id: existing.id },
          data: {
            totalScore: stat.totalScore,
            average: stat.average,
            percentage: stat.percentage,
            subjectsTaken: stat.subjectsTaken,
            subjectsPassed: stat.subjectsPassed,
            subjectsFailed: stat.subjectsFailed,
            classPosition: currentPosition,
            totalStudents: classArmTotal,
          },
        });
      } else {
        await db.studentRecord.create({
          data: {
            tenantId,
            session,
            class: cls,
            classRef: "",
            term,
            fullname: stat.fullname,
            totalScore: stat.totalScore,
            average: stat.average,
            percentage: stat.percentage,
            subjectsTaken: stat.subjectsTaken,
            subjectsPassed: stat.subjectsPassed,
            subjectsFailed: stat.subjectsFailed,
            classPosition: currentPosition,
            overallPosition: 0,
            totalStudents: classArmTotal,
          },
        });
      }
    }

    // ============================================================
    // COMPUTE OVERALL POSITION across all class arms
    // e.g., JSS1A, JSS1B, JSS1C → extract "JSS1" as base class
    // BUG FIX: Do NOT overwrite totalStudents here - keep class arm count
    // ============================================================
    const classBase = extractClassBase(cls);
    if (classBase) {
      // Get ALL records for this session/term/class base
      const allArmRecords = await db.studentRecord.findMany({
        where: {
          tenantId,
          session,
          term,
          class: { startsWith: classBase },
        },
        orderBy: { totalScore: "desc" },
      });

      // Rank by totalScore - do NOT update totalStudents
      let overallPos = 1;

      for (let i = 0; i < allArmRecords.length; i++) {
        if (i > 0 && allArmRecords[i].totalScore < allArmRecords[i - 1].totalScore) {
          overallPos = i + 1;
        }

        await db.studentRecord.update({
          where: { id: allArmRecords[i].id },
          data: {
            overallPosition: overallPos,
            // Do NOT update totalStudents here - keep class arm count
          },
        });
      }
    }

    // Fetch all created/updated records
    const records = await db.studentRecord.findMany({
      where: { tenantId, session, class: cls, term },
      orderBy: { classPosition: "asc" },
    });

    return NextResponse.json({
      success: true,
      message: `Computed results for ${classArmTotal} students`,
      totalStudents: classArmTotal,
      records,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to compute results: ${message}` },
      { status: 500 }
    );
  }
}

/**
 * Extract base class from a class arm.
 * e.g., "JSS1A" → "JSS1", "SSS2B" → "SSS2", "JSS3C" → "JSS3"
 * Falls back to the full class name if no pattern matches.
 */
function extractClassBase(cls: string): string {
  const match = cls.match(/^(JSS\d|SSS\d)/i);
  return match ? match[1].toUpperCase() : "";
}
