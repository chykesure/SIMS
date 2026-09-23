// src/app/api/portal/student/cbt/attempts/[attemptId]/route.ts
// Resume / check an attempt.
// - IN_PROGRESS + within deadline -> return paper + saved answers + remaining time
// - IN_PROGRESS + past deadline   -> auto-grade & return result (server-enforced timer)
// - SUBMITTED                     -> return result summary

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStudent, parsePaper, finalizeAttempt, SUBMIT_GRACE_MS } from "@/lib/cbt";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const { attemptId } = await params;
    const auth = await requireStudent(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
    }
    const { student } = auth;

    const attempt = await db.cbtAttempt.findFirst({
      where: { id: attemptId, tenantId: student.tenantId, studentId: student.id },
      include: { answers: true, exam: { select: { id: true, title: true, subject: true, durationMinutes: true } } },
    });
    if (!attempt) {
      return NextResponse.json({ success: false, message: "Attempt not found" }, { status: 404 });
    }

    const now = new Date();

    // Expired while in progress -> auto-grade & close
    if (attempt.status === "IN_PROGRESS" && now > new Date(attempt.deadlineAt.getTime() + SUBMIT_GRACE_MS)) {
      const result = await finalizeAttempt(attempt.id, student.tenantId, true);
      if (!result.ok) {
        return NextResponse.json({ success: false, message: result.message }, { status: 500 });
      }
      return NextResponse.json({
        success: true,
        data: {
          state: "submitted",
          autoSubmitted: true,
          result: { score: result.score, totalMarks: result.totalMarks, percentage: result.percentage },
        },
      });
    }

    if (attempt.status === "IN_PROGRESS") {
      const savedAnswers: Record<string, number> = {};
      for (const a of attempt.answers) savedAnswers[a.questionId] = a.selectedIndex;

      return NextResponse.json({
        success: true,
        data: {
          state: "in_progress",
          attemptId: attempt.id,
          attemptNo: attempt.attemptNo,
          deadlineAt: attempt.deadlineAt,
          remainingSeconds: Math.max(0, Math.floor((attempt.deadlineAt.getTime() - now.getTime()) / 1000)),
          paper: parsePaper(attempt.paper), // safe: no answers included
          savedAnswers,
          exam: attempt.exam,
        },
      });
    }

    // SUBMITTED -> result summary
    const percentage = attempt.totalMarks > 0 ? Math.round((attempt.score / attempt.totalMarks) * 1000) / 10 : 0;
    return NextResponse.json({
      success: true,
      data: {
        state: "submitted",
        autoSubmitted: attempt.autoSubmitted,
        result: { score: attempt.score, totalMarks: attempt.totalMarks, percentage },
        exam: attempt.exam,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ success: false, message: `Failed to load attempt: ${message}` }, { status: 500 });
  }
}