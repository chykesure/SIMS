// src/lib/cbt.ts
// Shared helpers for the CBT engine — paper assembly, grading, validation.
// SECURITY MODEL:
//   - `paper` (served to students) NEVER contains correct answers.
//   - `answerKey` (server-only) holds correctIndex + marks per question.
//   - Timer is server-enforced via attempt.deadlineAt; client timer is cosmetic.

import { db } from "@/lib/db";
import type { CbtAnswer, CbtExam, Prisma } from "@prisma/client";

export function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

export function getUserId(request: Request): string {
  return request.headers.get("x-user-id") || "";
}

/** Roles allowed to manage the question bank & exams */
export function isStaffRole(role: string): boolean {
  const r = (role || "").toUpperCase();
  return ["ADMIN", "TEACHER", "CLASS_TEACHER", "SUBJECT_TEACHER", "STAFF", "PRINCIPAL"].includes(r);
}

/** Fisher-Yates shuffle (returns a new array) */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface PaperItem {
  id: string;
  text: string;
  type: string;
  options: string[];
  marks: number;
}

export type AnswerKey = Record<string, { correctIndex: number; marks: number }>;

/**
 * Build a per-student paper from the exam's linked questions.
 * Applies: question shuffle, questionCount slice, option shuffle.
 * The answerKey maps questionId -> { correctIndex, marks } (post-shuffle options).
 */
export function buildPaper(
  exam: CbtExam,
  questions: { id: string; text: string; type: string; options: unknown; correctIndex: number; marks: number }[]
): { paper: PaperItem[]; answerKey: AnswerKey } {
  let pool = [...questions];

  if (exam.shuffleQuestions) pool = shuffle(pool);
  if (exam.questionCount > 0 && exam.questionCount < pool.length) {
    pool = pool.slice(0, exam.questionCount);
  }

  const paper: PaperItem[] = [];
  const answerKey: AnswerKey = {};

  for (const q of pool) {
    let options: string[] = Array.isArray(q.options) ? (q.options as string[]) : [];
    let correctIndex = q.correctIndex;

    if (exam.shuffleOptions && options.length > 1) {
      const indexed = options.map((opt, idx) => ({ opt, idx }));
      const mixed = shuffle(indexed);
      options = mixed.map((m) => m.opt);
      correctIndex = mixed.findIndex((m) => m.idx === q.correctIndex);
    }

    paper.push({
      id: q.id,
      text: q.text,
      type: q.type,
      options,
      marks: q.marks,
    });
    answerKey[q.id] = { correctIndex, marks: q.marks };
  }

  return { paper, answerKey };
}

export interface GradedQuestion {
  questionId: string;
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
  marksAwarded: number;
  marksAvailable: number;
}

export interface GradeResult {
  score: number;
  totalMarks: number;
  percentage: number;
  perQuestion: GradedQuestion[];
}

/** Grade saved answers against the server-only answer key */
export function gradeAnswers(paper: PaperItem[], answerKey: AnswerKey, answers: CbtAnswer[]): GradeResult {
  let score = 0;
  const totalMarks = paper.reduce((sum, p) => sum + (p.marks || 0), 0);

  const byQuestion = new Map(answers.map((a) => [a.questionId, a]));
  const perQuestion: GradedQuestion[] = paper.map((p) => {
    const key = answerKey[p.id];
    const saved = byQuestion.get(p.id);
    const selectedIndex = saved ? saved.selectedIndex : -1;
    const isCorrect = !!key && selectedIndex === key.correctIndex;
    const marksAwarded = isCorrect ? key.marks : 0;
    score += marksAwarded;
    return {
      questionId: p.id,
      selectedIndex,
      correctIndex: key ? key.correctIndex : -1,
      isCorrect,
      marksAwarded,
      marksAvailable: p.marks,
    };
  });

  return {
    score,
    totalMarks,
    percentage: totalMarks > 0 ? Math.round((score / totalMarks) * 1000) / 10 : 0,
    perQuestion,
  };
}

/** Parse + validate paper/answerKey JSON columns defensively */
export function parsePaper(raw: Prisma.JsonValue): PaperItem[] {
  if (!Array.isArray(raw)) return [];
  return raw as unknown as PaperItem[];
}

export function parseAnswerKey(raw: Prisma.JsonValue): AnswerKey {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as AnswerKey;
}

/**
 * Grade an attempt and mark it SUBMITTED (idempotent).
 * Used by the submit endpoint and by auto-close when the deadline passes.
 */
export async function finalizeAttempt(
  attemptId: string,
  tenantId: string,
  auto: boolean
): Promise<{ ok: true; score: number; totalMarks: number; percentage: number } | { ok: false; message: string }> {
  const attempt = await db.cbtAttempt.findFirst({
    where: { id: attemptId, tenantId },
    include: { answers: true },
  });
  if (!attempt) return { ok: false, message: "Attempt not found" };
  if (attempt.status === "SUBMITTED") {
    return {
      ok: true,
      score: attempt.score,
      totalMarks: attempt.totalMarks,
      percentage: attempt.totalMarks > 0 ? Math.round((attempt.score / attempt.totalMarks) * 1000) / 10 : 0,
    };
  }

  const grade = gradeAnswers(parsePaper(attempt.paper), parseAnswerKey(attempt.answerKey), attempt.answers);

  await db.$transaction([
    ...grade.perQuestion.map((q) =>
      db.cbtAnswer.updateMany({
        where: { attemptId, questionId: q.questionId },
        data: { isCorrect: q.isCorrect, marksAwarded: q.marksAwarded },
      })
    ),
    db.cbtAttempt.update({
      where: { id: attemptId },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        autoSubmitted: auto,
        score: grade.score,
        totalMarks: grade.totalMarks,
      },
    }),
  ]);

  return { ok: true, score: grade.score, totalMarks: grade.totalMarks, percentage: grade.percentage };
}

/** How long (ms) after deadline a late submit is still accepted & auto-flagged */
export const SUBMIT_GRACE_MS = 30_000;

export interface StudentAuth {
  userId: string;
  studentId: string;
  studentClass: string;
  studentName: string;
}

/** Authenticate a student-portal request: returns student record or an error response */
export async function requireStudent(
  request: Request
): Promise<{ ok: true; student: NonNullable<Awaited<ReturnType<typeof findStudent>>> } | { ok: false; status: number; message: string }> {
  const tenantId = getTenantId(request);
  const userId = getUserId(request);

  if (!tenantId) return { ok: false, status: 400, message: "Tenant ID required" };
  if (!userId) return { ok: false, status: 401, message: "Not authenticated" };

  const user = await db.user.findFirst({ where: { id: userId, tenantId } });
  if (!user) return { ok: false, status: 404, message: "User not found" };
  if ((user.role || "").toUpperCase() !== "STUDENT" || !user.studentId) {
    return { ok: false, status: 403, message: "Access denied. Not a student account." };
  }

  const student = await findStudent(tenantId, user.studentId);
  if (!student) return { ok: false, status: 404, message: "Student record not found" };

  return { ok: true, student };
}

async function findStudent(tenantId: string, studentId: string) {
  return db.student.findFirst({ where: { id: studentId, tenantId } });
}

export function jsonError(message: string, status = 400) {
  return Response.json({ success: false, message }, { status });
}