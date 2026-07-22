//src/app/api/results/compute/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

/** Normalize a fullname for grouping only (uppercase + trim + collapse whitespace) */
function normalizeFullname(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, " ");
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
    const allScores = await db.examScore.findMany({
      where: { tenantId, session, class: cls, term },
      orderBy: { fullname: "asc" },
    });

    // Fetch subjects with departments for filtering
    const subjectsWithDept = await db.subject.findMany({
      where: { tenantId, department: { not: "" } },
      select: { name: true, department: true },
    });
    const subjectDeptMap = new Map<string, string>();
    for (const s of subjectsWithDept) {
      subjectDeptMap.set(s.name.toLowerCase(), s.department.toLowerCase());
    }

    // Fetch students with departments
    const studentsInClass = await db.student.findMany({
      where: { tenantId, class: cls },
      select: { fullname: true, department: true },
    });
    const studentDeptMap = new Map<string, string>();
    for (const s of studentsInClass) {
      studentDeptMap.set(s.fullname.toLowerCase(), (s.department || "").toLowerCase());
    }

    // Filter out scores where subject dept doesn't match student dept
    const scores = allScores.filter((score) => {
      const subjDept = subjectDeptMap.get(score.subject.toLowerCase());
      if (!subjDept) return true; // common subject — keep
      const stuDept = studentDeptMap.get(score.fullname.toLowerCase());
      if (!stuDept) return true; // no student dept (junior) — keep
      return subjDept === stuDept; // only keep if departments match
    });

    if (scores.length === 0) {
      return NextResponse.json(
        { success: false, message: "No exam scores found for the selected criteria" },
        { status: 404 }
      );
    }

    // Group scores by NORMALIZED student fullname to merge name variations
    // BUT keep the original-case fullname from the first score for storage
    const studentMap = new Map<string, { fullname: string; subjects: typeof scores; totalScore: number }>();

    for (const score of scores) {
      const key = normalizeFullname(score.fullname);
      const existing = studentMap.get(key);
      if (existing) {
        // Deduplicate: if same subject already exists, keep the latest
        const existingSubject = existing.subjects.find((s) => s.subject === score.subject);
        if (existingSubject) {
          existing.totalScore -= existingSubject.total;
          const idx = existing.subjects.indexOf(existingSubject);
          existing.subjects[idx] = score;
          existing.totalScore += score.total;
        } else {
          existing.subjects.push(score);
          existing.totalScore += score.total;
        }
      } else {
        studentMap.set(key, {
          fullname: score.fullname, // Keep ORIGINAL case from ExamScore
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
      // Skip students with zero total score — they have no real scores entered
      if (value.totalScore <= 0) continue;

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

    if (studentStats.length === 0) {
      return NextResponse.json(
        { success: false, message: "No valid scores found for the selected criteria" },
        { status: 404 }
      );
    }

    // Sort by totalScore descending to determine class positions
    studentStats.sort((a, b) => b.totalScore - a.totalScore);

    const classArmTotal = studentStats.length;

    // DELETE all existing StudentRecords for this session/class/term
    // to prevent duplicate accumulation from name variations or stale data
    await db.studentRecord.deleteMany({
      where: { tenantId, session, class: cls, term },
    });

    // Assign class positions (handle ties) and create fresh records
    let currentPosition = 1;
    for (let i = 0; i < studentStats.length; i++) {
      if (i > 0 && studentStats[i].totalScore < studentStats[i - 1].totalScore) {
        currentPosition = i + 1;
      }

      const stat = studentStats[i];

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

    // COMPUTE OVERALL POSITION across all class arms
    const classBase = extractClassBase(cls);
    if (classBase) {
      const allArmRecords = await db.studentRecord.findMany({
        where: {
          tenantId,
          session,
          term,
          class: { startsWith: classBase },
        },
        orderBy: { totalScore: "desc" },
      });

      let overallPos = 1;
      for (let i = 0; i < allArmRecords.length; i++) {
        if (i > 0 && allArmRecords[i].totalScore < allArmRecords[i - 1].totalScore) {
          overallPos = i + 1;
        }

        await db.studentRecord.update({
          where: { id: allArmRecords[i].id },
          data: {
            overallPosition: overallPos,
          },
        });
      }
    }

    // Fetch all created records
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

function extractClassBase(cls: string): string {
  const match = cls.match(/^(JSS\d|SSS\d)/i);
  return match ? match[1].toUpperCase() : "";
}