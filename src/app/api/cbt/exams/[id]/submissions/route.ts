// src/app/api/cbt/exams/[id]/submissions/route.ts
// Teacher/admin view of a specific exam's attempts + performance stats

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantId, jsonError, parsePaper } from "@/lib/cbt";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = getTenantId(request);
    if (!tenantId) return jsonError("Tenant ID required", 400);

    const exam = await db.cbtExam.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { questions: true } } },
    });
    if (!exam) return jsonError("Exam not found", 404);

    const attempts = await db.cbtAttempt.findMany({
      where: { tenantId, examId: id },
      orderBy: { startedAt: "desc" },
      include: { _count: { select: { answers: true } } },
    });

    // Exam total marks = sum of marks of the questions served per attempt may differ
    // (questionCount slice) — use each attempt's own totalMarks.
    const submitted = attempts.filter((a) => a.status === "SUBMITTED");
    const scores = submitted.map((a) => (a.totalMarks > 0 ? (a.score / a.totalMarks) * 100 : 0));
    const avg = scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
    const highest = scores.length ? Math.max(...scores) : 0;
    const lowest = scores.length ? Math.min(...scores) : 0;
    const passRate = scores.length
      ? (scores.filter((s) => s >= 50).length / scores.length) * 100
      : 0;

    const attemptCount = attempts.length;
    const distinctStudents = new Set(attempts.map((a) => a.studentId)).size;

    return NextResponse.json({
      success: true,
      data: {
        exam: {
          id: exam.id, title: exam.title, subject: exam.subject, class: exam.class,
          session: exam.session, term: exam.term, status: exam.status,
          durationMinutes: exam.durationMinutes, attemptsAllowed: exam.attemptsAllowed,
          questionCount: exam.questionCount, questionPool: exam._count.questions,
          startsAt: exam.startsAt, endsAt: exam.endsAt,
        },
        stats: {
          attemptCount,
          distinctStudents,
          submittedCount: submitted.length,
          inProgressCount: attemptCount - submitted.length,
          avgScore: Math.round(avg * 10) / 10,
          highestScore: Math.round(highest * 10) / 10,
          lowestScore: Math.round(lowest * 10) / 10,
          passRate: Math.round(passRate * 10) / 10,
        },
        attempts: attempts.map((a) => ({
          id: a.id,
          studentId: a.studentId,
          studentName: a.studentName,
          attemptNo: a.attemptNo,
          status: a.status,
          startedAt: a.startedAt,
          submittedAt: a.submittedAt,
          autoSubmitted: a.autoSubmitted,
          score: a.score,
          totalMarks: a.totalMarks,
          percentage: a.totalMarks > 0 ? Math.round((a.score / a.totalMarks) * 1000) / 10 : 0,
          answeredCount: a._count.answers,
          paperCount: parsePaper(a.paper).length,
        })),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ success: false, message: `Failed to fetch submissions: ${message}` }, { status: 500 });
  }
}