// ============================================================================
// FILE: src/app/api/exams/cumulative/route.ts
// PURPOSE: Returns cumulative exam data in "Option E" format for report card
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalizeTerm(t: string): string {
  if (t === "1") return "First Term";
  if (t === "2") return "Second Term";
  if (t === "3") return "Third Term";
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

    const currentTerm = parseInt(termParam, 10);
    if (isNaN(currentTerm) || currentTerm < 1 || currentTerm > 3) {
      return NextResponse.json(
        { success: false, message: "term must be 1, 2, or 3" },
        { status: 400 }
      );
    }

    // Build term strings to search (both "First Term" and "1" formats)
    const termStrings: string[] = [];
    for (let t = 1; t <= currentTerm; t++) {
      termStrings.push(TERM_NAMES[t], String(t));
    }

    // Query all scores for this class/session across relevant terms
    const whereClause: any = {
      session,
      class: classId,
      term: { in: termStrings },
    };
    if (tenantId) whereClause.tenantId = tenantId;

    const allScores = await prisma.examScore.findMany({ where: whereClause });

    console.log(
      `[Cumulative API] currentTerm=${currentTerm}, class=${classId}, session=${session}, scoresFound=${allScores.length}`
    );

    // Debug: if no scores, check what exists in DB
    if (allScores.length === 0) {
      const debug = await prisma.examScore.findMany({
        where: { session, class: classId } as any,
        select: { term: true },
        take: 10,
      });
      console.log("[Cumulative API] No scores! Terms in DB:", debug.map((s) => s.term));
    }

    // Group data using plain objects (avoids nested Map type errors)
    // Structure: { [subject]: { [fullname]: { [termNum]: { score, source } } } }
    const grouped: any = {};

    for (const score of allScores) {
      const normTerm = normalizeTerm(score.term);
      const termNum = TERM_NUMBER_MAP[normTerm];
      if (!termNum || termNum > currentTerm) continue;

      if (!grouped[score.subject]) grouped[score.subject] = {};
      if (!grouped[score.subject][score.fullname]) grouped[score.subject][score.fullname] = {};
      if (!grouped[score.subject][score.fullname][termNum]) {
        const hasCA = (score.firstCa > 0 || score.secondCa > 0 || score.thirdCa > 0);
        const isAbsent = (score.exam === 0 || score.exam == null) && hasCA;
        grouped[score.subject][score.fullname][termNum] = {
          score: score.total ?? 0,
          source: isAbsent ? "absent" : "exam",
          isAbsent: isAbsent,
        };
      }
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

    // Build subjects array in Option E format
    const subjects: any[] = [];

    for (const subjectId in grouped) {
      const studentEntries = grouped[subjectId];
      const studentsList: any[] = [];

      for (const fullname in studentEntries) {
        const termEntries = studentEntries[fullname];
        const termScores: any = {};
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
          studentId: fullname,
          studentName: fullname,
          regNumber: "",
          termScores: termScores,
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