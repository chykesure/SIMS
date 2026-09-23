// src/app/api/cbt/exams/route.ts
// CBT Exams — list & create (teacher/admin)

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantId, getUserId, isStaffRole, jsonError } from "@/lib/cbt";

export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) return jsonError("Tenant ID required", 400);

    const { searchParams } = new URL(request.url);
    const session = searchParams.get("session") || "";
    const term = searchParams.get("term") || "";
    const klass = searchParams.get("class") || "";
    const subject = searchParams.get("subject") || "";
    const status = searchParams.get("status") || "";

    const where: Record<string, unknown> = { tenantId };
    if (session) where.session = session;
    if (term) where.term = term;
    if (klass) where.class = klass;
    if (subject) where.subject = subject;
    if (["DRAFT", "PUBLISHED", "CLOSED"].includes(status)) where.status = status;

    const exams = await db.cbtExam.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        _count: { select: { questions: true, attempts: true } },
      },
    });

    return NextResponse.json({ success: true, data: exams });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ success: false, message: `Failed to fetch exams: ${message}` }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    if (!tenantId) return jsonError("Tenant ID required", 400);

    const user = userId ? await db.user.findFirst({ where: { id: userId, tenantId } }) : null;
    if (!user || !isStaffRole(user.role)) return jsonError("Access denied", 403);

    const body = await request.json();
    const {
      title, description, subject, class: klass, session, term,
      durationMinutes, questionCount, shuffleQuestions, shuffleOptions,
      attemptsAllowed, startsAt, endsAt, questionIds, status,
    } = body;

    if (!title?.trim()) return jsonError("Exam title is required");
    if (!subject?.trim()) return jsonError("Subject is required");
    if (!klass?.trim()) return jsonError("Class is required");
    if (!session?.trim()) return jsonError("Academic session is required");
    if (!term?.trim()) return jsonError("Term is required");

    const duration = Number(durationMinutes);
    if (!Number.isInteger(duration) || duration < 1 || duration > 300) {
      return jsonError("Duration must be between 1 and 300 minutes");
    }

    if (!Array.isArray(questionIds) || questionIds.length < 1) {
      return jsonError("Select at least one question for this exam");
    }

    const start = startsAt ? new Date(startsAt) : null;
    const end = endsAt ? new Date(endsAt) : null;
    if (!start || isNaN(start.getTime())) return jsonError("Valid start date/time is required");
    if (!end || isNaN(end.getTime())) return jsonError("Valid end date/time is required");
    if (end <= start) return jsonError("End date must be after the start date");

    const questions = await db.cbtQuestion.findMany({
      where: { tenantId, id: { in: questionIds } },
      select: { id: true },
    });
    if (questions.length < 1) return jsonError("Selected questions could not be found");

    const qCount = Math.max(0, Number(questionCount) || 0); // 0 = all
    if (qCount > 0 && qCount > questions.length) {
      return jsonError(`Questions per student (${qCount}) cannot exceed the selected question pool (${questions.length})`);
    }

    const attempts = Math.max(1, Math.min(10, Number(attemptsAllowed) || 1));
    const examStatus = status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";

    const exam = await db.cbtExam.create({
      data: {
        tenantId,
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
        attemptsAllowed: attempts,
        startsAt: start,
        endsAt: end,
        status: examStatus,
        createdBy: userId,
        createdByName: user.username || user.email || "Staff",
        questions: {
          create: questions.map((q, i) => ({
            tenantId,
            questionId: q.id,
            order: i,
          })),
        },
      },
      include: { _count: { select: { questions: true, attempts: true } } },
    });

    return NextResponse.json({
      success: true,
      data: exam,
      message: examStatus === "PUBLISHED" ? "Exam created and published" : "Exam saved as draft",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ success: false, message: `Failed to create exam: ${message}` }, { status: 500 });
  }
}