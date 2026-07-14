// ============================================================================
// FILE: src/app/api/exams/cumulative/route.ts  (COMPLETE FIX v2)
// PURPOSE: Returns cumulative exam data for report cards
//
// ROOT CAUSE FIX 1: Subject/student names are normalized (trim + lowercase)
// before grouping, so slight differences between terms don't split data.
//
// ROOT CAUSE FIX 2: When duplicate DB records map to the same term slot
// (e.g. term="1" AND term="First Term" both exist), the code now prefers
// the non-absent record with the canonical term string over stale variants.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalizeTerm(t: string): string {
  const s = (t || "").trim().toLowerCase();
  if (
    s === "1" || s === "first term" || s === "first" ||
    s === "term 1" || s === "1st term" || s === "1st" || s === "term1"
  ) return "First Term";
  if (
    s === "2" || s === "second term" || s === "second" ||
    s === "term 2" || s === "2nd term" || s === "2nd" || s === "term2"
  ) return "Second Term";
  if (
    s === "3" || s === "third term" || s === "third" ||
    s === "term 3" || s === "3rd term" || s === "3rd" || s === "term3"
  ) return "Third Term";
  return t;
}

const TERM_NUMBER_MAP: Record<string, number> = {
  "First Term": 1,
  "Second Term": 2,
  "Third Term": 3,
};

const TERM_NAMES: Record<number, string> = {
  1: "First Term",
  2: "Second Term",
  3: "Third Term",
};

const ALL_TERM_VARIANTS: Record<number, string[]> = {
  1: ["First Term", "1", "first term", "First", "first", "Term 1", "1st Term", "1st", "term1"],
  2: ["Second Term", "2", "second term", "Second", "second", "Term 2", "2nd Term", "2nd", "term2"],
  3: ["Third Term", "3", "third term", "Third", "third", "Term 3", "3rd Term", "3rd", "term3"],
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const session = searchParams.get("session");
    const classId = searchParams.get("classId") || searchParams.get("class");
    const termParam = searchParams.get("term");
    const tenantId = request.headers.get("x-tenant-id");

    if (!session || !classId || !termParam) {
      return NextResponse.json(
        { success: false, message: "session, classId, and term are required" },
        { status: 400 }
      );
    }

    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "tenantId is required" },
        { status: 401 }
      );
    }

    const currentTerm = parseInt(termParam, 10);
    if (isNaN(currentTerm) || currentTerm < 1 || currentTerm > 3) {
      return NextResponse.json(
        { success: false, message: "term must be 1, 2, or 3" },
        { status: 400 }
      );
    }

    // Build term strings including ALL known variants
    const termStrings: string[] = [];
    for (let t = 1; t <= currentTerm; t++) {
      termStrings.push(...(ALL_TERM_VARIANTS[t] || [TERM_NAMES[t], String(t)]));
    }
    const uniqueTermStrings = [...new Set(termStrings)];

    const whereClause: any = {
      session,
      class: classId,
      term: { in: uniqueTermStrings },
      tenantId,
    };

    const allScores = await prisma.examScore.findMany({ where: whereClause });

    console.log(
      `[Cumulative API] term=${currentTerm}, class=${classId}, session=${session}, scores=${allScores.length}`
    );

    // ─── NORMALIZED GROUPING WITH DUPLICATE-PREFERENCE ────────────────────
    // Use lowercase+trim as grouping key, but keep original casing for display.
    // When two DB records map to the same (subject, student, term) slot,
    // prefer the non-absent record and the canonical term string.
    const subjectDisplayNames: Record<string, string> = {};
    const studentDisplayNames: Record<string, string> = {};

    // Using `any` because we track _rawTerm internally for duplicate resolution
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const grouped: any = {};
    let unrecognisedCount = 0;

    for (const score of allScores) {
      const normTerm = normalizeTerm(score.term);
      const termNum = TERM_NUMBER_MAP[normTerm];

      if (!termNum) {
        unrecognisedCount++;
        if (unrecognisedCount <= 5) {
          console.warn(
            `[Cumulative API] Unrecognised term "${score.term}" for "${score.fullname}" in "${score.subject}"`
          );
        }
        continue;
      }
      if (termNum > currentTerm) continue;

      // Normalize keys: trim + lowercase for grouping
      const rawSubject = (score.subject || "").trim();
      const rawStudent = (score.fullname || "").trim();
      const subjKey = rawSubject.toLowerCase();
      const stuKey = rawStudent.toLowerCase();

      // Store original display name (first occurrence wins)
      if (!subjectDisplayNames[subjKey]) subjectDisplayNames[subjKey] = rawSubject;
      if (!studentDisplayNames[stuKey]) studentDisplayNames[stuKey] = rawStudent;

      // Build nested structure with DUPLICATE-PREFERENCE logic
      if (!grouped[subjKey]) grouped[subjKey] = {};
      if (!grouped[subjKey][stuKey]) grouped[subjKey][stuKey] = {};

      const hasCA = (score.firstCa > 0 || score.secondCa > 0 || score.thirdCa > 0);
      const isAbsent = (score.exam === 0 || score.exam == null) && hasCA;
      const newEntry: any = {
        score: score.total ?? 0,
        source: isAbsent ? "absent" : "exam",
        isAbsent,
        _rawTerm: score.term,
      };

      if (!grouped[subjKey][stuKey][termNum]) {
        // First record for this term slot — store it
        grouped[subjKey][stuKey][termNum] = newEntry;
      } else {
        // DUPLICATE DETECTED — apply preference rules
        const existing = grouped[subjKey][stuKey][termNum];
        const canonicalTermName = TERM_NAMES[termNum];
        const newIsCanonical = (score.term || "").trim() === canonicalTermName;
        const existingIsCanonical = (existing._rawTerm || "").trim() === canonicalTermName;

        let shouldReplace = false;

        // Rule 1: Prefer non-absent over absent (catches stale "2" with exam=0)
        if (existing.isAbsent && !newEntry.isAbsent) {
          shouldReplace = true;
        }
        // Rule 2: Both non-absent — prefer canonical term string ("First Term" > "1")
        else if (!existing.isAbsent && !newEntry.isAbsent && !existingIsCanonical && newIsCanonical) {
          shouldReplace = true;
        }
        // Rule 3: Both absent — prefer canonical term string
        else if (existing.isAbsent && newEntry.isAbsent && !existingIsCanonical && newIsCanonical) {
          shouldReplace = true;
        }

        if (shouldReplace) {
          console.log(
            `[Cumulative API] Duplicate replaced for ${rawSubject} / ${rawStudent} term ${termNum}:` +
            ` old={score:${existing.score}, absent:${existing.isAbsent}, raw:"${existing._rawTerm}"}` +
            ` new={score:${newEntry.score}, absent:${newEntry.isAbsent}, raw:"${score.term}"}`
          );
          grouped[subjKey][stuKey][termNum] = newEntry;
        }
      }
    }

    if (unrecognisedCount > 5) {
      console.warn(`[Cumulative API] ... and ${unrecognisedCount - 5} more unrecognised terms.`);
    }

    // ─── LOG: Show detected subject name variants ─────────────────────────
    const allSubjectsRaw = allScores.map((s) => s.subject);
    const uniqueSubjectsRaw = [...new Set(allSubjectsRaw)];
    if (uniqueSubjectsRaw.length !== Object.keys(subjectDisplayNames).length) {
      console.log(
        "[Cumulative API] Subject name variants detected (normalized):",
        Object.keys(subjectDisplayNames)
      );
      console.log(
        "[Cumulative API] Raw subject names from DB:",
        uniqueSubjectsRaw
      );
    }

    // Find which terms actually have data
    const availableTerms = new Set<number>();
    for (const sub in grouped) {
      for (const name in grouped[sub]) {
        for (const tn in grouped[sub][name]) {
          const num = Number(tn);
          if (num <= currentTerm) availableTerms.add(num);
        }
      }
    }
    const maxAvailableTerms = availableTerms.size || 1;
    const missingTerms: number[] = [];
    for (let t = 1; t < currentTerm; t++) {
      if (!availableTerms.has(t)) missingTerms.push(t);
    }

    // ─── BUILD SUBJECTS ARRAY ─────────────────────────────────────────────
    const subjects: any[] = [];

    for (const subjKey in grouped) {
      const subjectId = subjectDisplayNames[subjKey] || subjKey;
      const studentEntries = grouped[subjKey];
      const studentsList: any[] = [];

      for (const stuKey in studentEntries) {
        const termEntries = studentEntries[stuKey];
        const termScores: Record<number, { score: number; source: string }> = {};
        let cumTotal = 0;
        let termsWithData = 0;

        for (let t = 1; t <= currentTerm; t++) {
          const ts = termEntries[t];
          if (ts) {
            termScores[t] = { score: ts.score, source: ts.source };
            if (!ts.isAbsent) {
              cumTotal += ts.score;
              termsWithData++;
            }
          }
        }

        cumTotal = parseFloat(cumTotal.toFixed(1));
        const cumAvg = termsWithData > 0
          ? parseFloat((cumTotal / termsWithData).toFixed(1))
          : 0;

        studentsList.push({
          studentId: studentDisplayNames[stuKey] || stuKey,
          studentName: studentDisplayNames[stuKey] || stuKey,
          regNumber: "",
          termScores,
          availableTermsCount: termsWithData,
          cumulativeTotal: cumTotal,
          cumulativeAvg: cumAvg,
          rank: 0,
        });
      }

      // Sort by cumulativeAvg descending and assign ranks
      studentsList.sort((a: any, b: any) => b.cumulativeAvg - a.cumulativeAvg);
      for (let i = 0; i < studentsList.length; i++) {
        if (i === 0) {
          studentsList[i].rank = 1;
        } else if (studentsList[i].cumulativeAvg < studentsList[i - 1].cumulativeAvg) {
          studentsList[i].rank = i + 1;
        } else {
          studentsList[i].rank = studentsList[i - 1].rank;
        }
      }

      subjects.push({ subjectId, students: studentsList });
    }

    return NextResponse.json({
      success: true,
      data: {
        subjects,
        currentTerm,
        maxAvailableTerms,
        requestedTerms: currentTerm,
        missingTerms,
      },
    });
  } catch (error: unknown) {
    console.error("[Cumulative API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch cumulative data",
      },
      { status: 500 }
    );
  }
}