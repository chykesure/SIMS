// src/app/api/portal/student/cbt/route.ts
// Student portal — CBT overview: available / upcoming / completed exams for the student's class

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/cbt";

export async function GET(request: Request) {
  try {
    const auth = await requireStudent(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
    }
    const { student } = auth;
    const now = new Date();

    // Published exams for the student's class, current window or future, plus recently-ended ones
    const exams = await db.cbtExam.findMany({
      where: {
        tenantId: student.tenantId,
        status: "PUBLISHED",
        class: student.class,
        endsAt: { gte: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30) }, // keep 30 days of history
      },
      orderBy: { startsAt: "asc" },
      include: {
        attempts: { where: { studentId: student.id }, orderBy: { attemptNo: "desc" } },
      },
    });

    const shaped = exams.map((exam) => {
      const submitted = exam.attempts.filter((a) => a.status === "SUBMITTED");
      const inProgress = exam.attempts.find((a) => a.status === "IN_PROGRESS");
      const best = submitted.reduce<number | null>((best, a) => {
        const pct = a.totalMarks > 0 ? (a.score / a.totalMarks) * 100 : 0;
        return best === null || pct > best ? pct : best;
      }, null);

      let window: "upcoming" | "open" | "closed";
      if (now < exam.startsAt) window = "upcoming";
      else if (now <= exam.endsAt) window = "open";
      else window = "closed";

      const attemptsLeft = Math.max(0, exam.attemptsAllowed - exam.attempts.length);

      return {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        subject: exam.subject,
        session: exam.session,
        term: exam.term,
        durationMinutes: exam.durationMinutes,
        attemptsAllowed: exam.attemptsAllowed,
        attemptsUsed: exam.attempts.length,
        attemptsLeft,
        hasInProgress: !!inProgress,
        inProgressAttemptId: inProgress?.id ?? null,
        startedAt: inProgress?.startedAt ?? null,
        deadlineAt: inProgress?.deadlineAt ?? null,
        window,
        startsAt: exam.startsAt,
        endsAt: exam.endsAt,
        bestPercentage: best,
        lastScore: submitted.length
          ? { score: submitted[0].score, totalMarks: submitted[0].totalMarks }
          : null,
      };
    });

    return NextResponse.json({ success: true, data: shaped });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ success: false, message: `Failed to load CBT list: ${message}` }, { status: 500 });
  }
}