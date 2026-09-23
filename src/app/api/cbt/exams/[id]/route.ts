// src/app/api/cbt/exams/[id]/route.ts
// CBT Exam — detail, update (incl. publish/unpublish), delete

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantId, getUserId, isStaffRole, jsonError } from "@/lib/cbt";

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
      include: {
        questions: {
          orderBy: { order: "asc" },
          include: {
            question: {
              select: { id: true, text: true, type: true, options: true, marks: true, correctIndex: true, subject: true, class: true },
            },
          },
        },
        _count: { select: { attempts: true } },
      },
    });
    if (!exam) return jsonError("Exam not found", 404);

    return NextResponse.json({ success: true, data: exam });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ success: false, message: `Failed to fetch exam: ${message}` }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    if (!tenantId) return jsonError("Tenant ID required", 400);

    const user = userId ? await db.user.findFirst({ where: { id: userId, tenantId } }) : null;
    if (!user || !isStaffRole(user.role)) return jsonError("Access denied", 403);

    const exam = await db.cbtExam.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { attempts: true } } },
    });
    if (!exam) return jsonError("Exam not found", 404);

    const body = await request.json();
    const { title, description, subject, class: klass, session, term, durationMinutes, questionCount, shuffleQuestions, shuffleOptions, attemptsAllowed, startsAt, endsAt, questionIds, status } = body;

    const data: Record<string, unknown> = {};

    // --- Status-only toggle (publish / unpublish / close) ---
    if (status !== undefined && (status === "DRAFT" || status === "PUBLISHED" || status === "CLOSED")) {
      if (status === "PUBLISHED" && exam.status === "DRAFT") {
        const count = await db.cbtExamQuestion.count({ where: { examId: id } });
        if (count === 0) return jsonError("Add at least one question before publishing");
      }
      data.status = status;
    }

    // --- Full field edit ---
    if (title !== undefined) {
      if (exam._count.attempts > 0) {
        return jsonError("This exam already has submissions — only status can be changed", 409);
      }
      if (!title?.trim()) return jsonError("Exam title is required");
      if (!subject?.trim()) return jsonError("Subject is required");
      if (!klass?.trim()) return jsonError("Class is required");
      if (!session?.trim()) return jsonError("Academic session is required");
      if (!term?.trim()) return jsonError("Term is required");
      const duration = Number(durationMinutes);
      if (!Number.isInteger(duration) || duration < 1 || duration > 300) {
        return jsonError("Duration must be between 1 and 300 minutes");
      }

      let ids = Array.isArray(questionIds) ? questionIds : null;
      if (!ids || ids.length < 1) {
        const links = await db.cbtExamQuestion.findMany({ where: { examId: id }, orderBy: { order: "asc" }, select: { questionId: true } });
        ids = links.map((l) => l.questionId);
        if (ids.length < 1) return jsonError("Select at least one question for this exam");
      }
      const questions = await db.cbtQuestion.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true } });
      if (questions.length < 1) return jsonError("Selected questions could not be found");

      const qCount = Math.max(0, Number(questionCount) || 0);
      if (qCount > 0 && qCount > questions.length) {
        return jsonError(`Questions per student (${qCount}) cannot exceed the selected question pool (${questions.length})`);
      }

      const start = startsAt ? new Date(startsAt) : null;
      const end = endsAt ? new Date(endsAt) : null;
      if (!start || isNaN(start.getTime())) return jsonError("Valid start date/time is required");
      if (!end || isNaN(end.getTime())) return jsonError("Valid end date/time is required");
      if (end <= start) return jsonError("End date must be after the start date");

      Object.assign(data, {
        title: title.trim(),
        description: (description || "").trim(),
        subject: subject.trim(),
        class: klass.trim(),
        session: session.trim(),
        term: term.trim(),
        durationMinutes: duration,
        questionCount: qCount,
        shuffleQuestions: !!shuffleQuestions,
        shuffleOptions: !!shuffleOptions,
        attemptsAllowed: Math.max(1, Math.min(10, Number(attemptsAllowed) || 1)),
        startsAt: start,
        endsAt: end,
      });

      // Replace question links
      await db.$transaction([
        db.cbtExamQuestion.deleteMany({ where: { examId: id } }),
        ...questions.map((q, i) =>
          db.cbtExamQuestion.create({ data: { tenantId, examId: id, questionId: q.id, order: i } })
        ),
      ]);
    }

    const updated = await db.cbtExam.update({
      where: { id },
      data,
      include: { _count: { select: { questions: true, attempts: true } } },
    });

    return NextResponse.json({ success: true, data: updated, message: "Exam updated" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ success: false, message: `Failed to update exam: ${message}` }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    if (!tenantId) return jsonError("Tenant ID required", 400);

    const user = userId ? await db.user.findFirst({ where: { id: userId, tenantId } }) : null;
    if (!user || !isStaffRole(user.role)) return jsonError("Access denied", 403);

    const exam = await db.cbtExam.findFirst({ where: { id, tenantId } });
    if (!exam) return jsonError("Exam not found", 404);

    // Cascade: answers -> attempts -> examQuestions -> exam
    await db.$transaction([
      db.cbtAnswer.deleteMany({ where: { attempt: { examId: id } } }),
      db.cbtAttempt.deleteMany({ where: { examId: id } }),
      db.cbtExamQuestion.deleteMany({ where: { examId: id } }),
      db.cbtExam.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true, message: "Exam and all its submissions deleted" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ success: false, message: `Failed to delete exam: ${message}` }, { status: 500 });
  }
}