// src/app/api/cbt/questions/[id]/route.ts
// CBT Question Bank — update & delete (teacher/admin)

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantId, getUserId, isStaffRole, jsonError } from "@/lib/cbt";

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

    const existing = await db.cbtQuestion.findFirst({ where: { id, tenantId } });
    if (!existing) return jsonError("Question not found", 404);

    const body = await request.json();
    const { subject, class: klass, type, text, options, correctIndex, marks, explanation } = body;

    if (!subject?.trim()) return jsonError("Subject is required");
    if (!text?.trim()) return jsonError("Question text is required");
    if (!Array.isArray(options) || options.length < 2) return jsonError("At least 2 options are required");
    const cleanedOptions = options.map((o: unknown) => String(o ?? "").trim()).filter((o: string) => o.length > 0);
    if (cleanedOptions.length < 2) return jsonError("At least 2 non-empty options are required");
    const idx = Number(correctIndex);
    if (!Number.isInteger(idx) || idx < 0 || idx >= cleanedOptions.length) {
      return jsonError("Select which option is correct");
    }

    const question = await db.cbtQuestion.update({
      where: { id },
      data: {
        subject: subject.trim(),
        class: (klass || "").trim(),
        type: type === "TRUE_FALSE" ? "TRUE_FALSE" : "MCQ",
        text: text.trim(),
        options: cleanedOptions,
        correctIndex: idx,
        marks: Math.max(1, Math.min(100, Number(marks) || 1)),
        explanation: (explanation || "").trim(),
      },
    });

    return NextResponse.json({ success: true, data: question, message: "Question updated" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ success: false, message: `Failed to update question: ${message}` }, { status: 500 });
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

    const existing = await db.cbtQuestion.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { examLinks: true } } },
    });
    if (!existing) return jsonError("Question not found", 404);

    if (existing._count.examLinks > 0) {
      const usedIn = await db.cbtExamQuestion.findMany({
        where: { questionId: id },
        select: { exam: { select: { title: true } } },
        take: 3,
      });
      const names = usedIn.map((u) => u.exam.title).join(", ");
      return jsonError(
        `This question is linked to ${existing._count.examLinks} exam(s) (${names}). Remove it from those exams first.`,
        409
      );
    }

    await db.cbtQuestion.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Question deleted" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ success: false, message: `Failed to delete question: ${message}` }, { status: 500 });
  }
}