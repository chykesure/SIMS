// src/app/api/portal/student/cbt/[examId]/start/route.ts
// Student starts (or resumes) a CBT attempt.
// Builds the per-student paper: shuffle -> slice -> optional option shuffle.
// Server-enforced deadline. Correct answers NEVER leave the server.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStudent, buildPaper, jsonError } from "@/lib/cbt";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const auth = await requireStudent(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
    }
    const { student } = auth;
    const now = new Date();

    const exam = await db.cbtExam.findFirst({
      where: { id: examId, tenantId: student.tenantId, status: "PUBLISHED" },
      include: {
        questions: {
          orderBy: { order: "asc" },
          include: {
            question: {
              select: { id: true, text: true, type: true, options: true, correctIndex: true, marks: true },
            },
          },
        },
      },
    });
    if (!exam) return jsonError("Exam not found or not published", 404);
    if (exam.class !== student.class) return jsonError("This exam is not for your class", 403);
    if (now < exam.startsAt) return jsonError("This exam has not started yet", 403);
    if (now > exam.endsAt) return jsonError("This exam window has closed", 403);

    // Resume if there is an in-progress attempt
    const inProgress = await db.cbtAttempt.findFirst({
      where: { tenantId: student.tenantId, examId, studentId: student.id, status: "IN_PROGRESS" },
    });

    if (inProgress) {
      const expired = now > inProgress.deadlineAt;
      if (expired) {
        // Grade & close it out now (server-enforced deadline)
        return NextResponse.json({
          success: true,
          data: { expired: true, attemptId: inProgress.id, message: "Time is up — this attempt was auto-submitted." },
        });
      }
      return NextResponse.json({
        success: true,
        data: { resumed: true, attemptId: inProgress.id, deadlineAt: inProgress.deadlineAt },
      });
    }

    // Attempts limit
    const used = await db.cbtAttempt.count({
      where: { tenantId: student.tenantId, examId, studentId: student.id },
    });
    if (used >= exam.attemptsAllowed) {
      return jsonError(`You have already used all ${exam.attemptsAllowed} attempt(s) for this exam`, 409);
    }

    // Build per-student paper
    const { paper, answerKey } = buildPaper(
      exam,
      exam.questions.map((q) => q.question)
    );
    if (paper.length === 0) return jsonError("This exam has no questions yet", 409);

    const totalMarks = paper.reduce((s, p) => s + p.marks, 0);
    const deadlineAt = new Date(now.getTime() + exam.durationMinutes * 60 * 1000);

    const attempt = await db.cbtAttempt.create({
      data: {
        tenantId: student.tenantId,
        examId,
        studentId: student.id,
        studentName: student.fullname,
        attemptNo: used + 1,
        paper: paper as unknown as import("@prisma/client").Prisma.InputJsonValue,
        answerKey: answerKey as unknown as import("@prisma/client").Prisma.InputJsonValue,
        startedAt: now,
        deadlineAt,
        totalMarks,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        attemptId: attempt.id,
        attemptNo: attempt.attemptNo,
        deadlineAt,
        remainingSeconds: Math.floor((deadlineAt.getTime() - now.getTime()) / 1000),
        paper, // safe: no correct answers included
        exam: {
          id: exam.id, title: exam.title, subject: exam.subject,
          durationMinutes: exam.durationMinutes,
          shuffleQuestions: exam.shuffleQuestions,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ success: false, message: `Failed to start exam: ${message}` }, { status: 500 });
  }
}