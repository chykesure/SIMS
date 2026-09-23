// src/app/api/portal/student/cbt/attempts/[attemptId]/answer/route.ts
// Auto-save a single answer while the attempt is in progress.
// Validates the question belongs to the served paper and the index to its options.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStudent, parsePaper, SUBMIT_GRACE_MS } from "@/lib/cbt";

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
    if (attempt.status !== "IN_PROGRESS") {
      return NextResponse.json({ success: false, message: "This attempt has already been submitted" }, { status: 409 });
    }
    if (now > new Date(attempt.deadlineAt.getTime() + SUBMIT_GRACE_MS)) {
      // Deadline passed — close it server-side; the client will be told on next load
      return NextResponse.json({ success: false, message: "Time is up — answers can no longer be saved" }, { status: 410 });
    }

    const body = await request.json();
    const { questionId, selectedIndex } = body;
    if (!questionId) return NextResponse.json({ success: false, message: "questionId is required" }, { status: 400 });

    const paper = parsePaper(attempt.paper);
    const item = paper.find((p) => p.id === questionId);
    if (!item) return NextResponse.json({ success: false, message: "Question is not part of this attempt" }, { status: 400 });

    const idx = Number(selectedIndex);
    if (!Number.isInteger(idx) || idx < -1 || idx >= item.options.length) {
      return NextResponse.json({ success: false, message: "Invalid option index" }, { status: 400 });
    }

    await db.cbtAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      create: { tenantId: student.tenantId, attemptId, questionId, selectedIndex: idx, answeredAt: now },
      update: { selectedIndex: idx, answeredAt: now },
    });

    return NextResponse.json({ success: true, data: { saved: true } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ success: false, message: `Failed to save answer: ${message}` }, { status: 500 });
  }
}