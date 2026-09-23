// src/app/api/cbt/questions/route.ts
// CBT Question Bank — list & create (teacher/admin)

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantId, getUserId, isStaffRole, jsonError } from "@/lib/cbt";

export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) return jsonError("Tenant ID required", 400);

    const { searchParams } = new URL(request.url);
    const subject = searchParams.get("subject") || "";
    const klass = searchParams.get("class") || "";
    const type = searchParams.get("type") || "";
    const search = (searchParams.get("search") || "").trim();

    const where: Record<string, unknown> = { tenantId };
    if (subject) where.subject = subject;
    if (klass) where.class = klass;
    if (type === "MCQ" || type === "TRUE_FALSE") where.type = type;
    if (search) where.text = { contains: search };

    const questions = await db.cbtQuestion.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const [total, mcqCount, tfCount] = await Promise.all([
      db.cbtQuestion.count({ where: { tenantId } }),
      db.cbtQuestion.count({ where: { tenantId, type: "MCQ" } }),
      db.cbtQuestion.count({ where: { tenantId, type: "TRUE_FALSE" } }),
    ]);

    return NextResponse.json({
      success: true,
      data: { questions, stats: { total, mcqCount, tfCount } },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ success: false, message: `Failed to fetch questions: ${message}` }, { status: 500 });
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
    const { subject, class: klass, type, text, options, correctIndex, marks, explanation } = body;

    if (!subject?.trim()) return jsonError("Subject is required");
    if (!text?.trim()) return jsonError("Question text is required");
    if (!Array.isArray(options) || options.length < 2) return jsonError("At least 2 options are required");
    const cleanedOptions = options.map((o: unknown) => String(o ?? "").trim()).filter((o: string) => o.length > 0);
    if (cleanedOptions.length < 2) return jsonError("At least 2 non-empty options are required");
    if (cleanedOptions.some((o: string, i: number) => cleanedOptions.indexOf(o) !== i)) {
      return jsonError("Options must be unique");
    }
    const idx = Number(correctIndex);
    if (!Number.isInteger(idx) || idx < 0 || idx >= cleanedOptions.length) {
      return jsonError("Select which option is correct");
    }

    const questionType = type === "TRUE_FALSE" ? "TRUE_FALSE" : "MCQ";

    const question = await db.cbtQuestion.create({
      data: {
        tenantId,
        subject: subject.trim(),
        class: (klass || "").trim(),
        type: questionType,
        text: text.trim(),
        options: cleanedOptions,
        correctIndex: idx,
        marks: Math.max(1, Math.min(100, Number(marks) || 1)),
        explanation: (explanation || "").trim(),
        createdBy: userId,
      },
    });

    return NextResponse.json({ success: true, data: question, message: "Question added to the bank" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ success: false, message: `Failed to create question: ${message}` }, { status: 500 });
  }
}