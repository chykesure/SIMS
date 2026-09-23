// src/app/api/portal/student/cbt/attempts/[attemptId]/submit/route.ts
// Submit an attempt: server-side grading against the answer key.
// Late submissions (within grace) are accepted but flagged autoSubmitted = true.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStudent, finalizeAttempt, SUBMIT_GRACE_MS } from "@/lib/cbt";

export async function POST(
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
    });
    if (!attempt) return NextResponse.json({ success: false, message: "Attempt not found" }, { status: 404 });

    const now = new Date();
    if (attempt.status === "SUBMITTED") {
      // Idempotent — return existing result
      const percentage = attempt.totalMarks > 0 ? Math.round((attempt.score / attempt.totalMarks) * 1000) / 10 : 0;
      return NextResponse.json({
        success: true,
        data: { result: { score: attempt.score, totalMarks: attempt.totalMarks, percentage } },
      });
    }

    const auto = now > attempt.deadlineAt;
    if (auto && now > new Date(attempt.deadlineAt.getTime() + SUBMIT_GRACE_MS)) {
      // Way past grace — finalize as auto-submitted anyway (timer integrity wins)
      const result = await finalizeAttempt(attempt.id, student.tenantId, true);
      if (!result.ok) return NextResponse.json({ success: false, message: result.message }, { status: 500 });
      return NextResponse.json({ success: true, data: { result, autoSubmitted: true } });
    }

    const result = await finalizeAttempt(attempt.id, student.tenantId, auto);
    if (!result.ok) return NextResponse.json({ success: false, message: result.message }, { status: 500 });

    return NextResponse.json({
      success: true,
      data: { result: { score: result.score, totalMarks: result.totalMarks, percentage: result.percentage }, autoSubmitted: auto },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ success: false, message: `Failed to submit attempt: ${message}` }, { status: 500 });
  }
}