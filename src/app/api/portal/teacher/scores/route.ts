import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

function getUserId(request: Request): string {
  return request.headers.get("x-user-id") || "";
}

// GET /api/portal/teacher/scores?session=xxx&term=xxx&class=xxx&subject=xxx
export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID required" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const session = searchParams.get("session");
    const term = searchParams.get("term");
    const cls = searchParams.get("class");
    const subject = searchParams.get("subject");

    const where: Record<string, unknown> = { tenantId };
    if (session) where.session = session;
    if (term) where.term = term;
    if (cls) where.class = cls;
    if (subject) where.subject = subject;

    const scores = await db.examScore.findMany({
      where,
      orderBy: { fullname: "asc" },
    });

    return NextResponse.json({ success: true, data: scores });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch scores: ${message}` },
      { status: 500 }
    );
  }
}

// POST /api/portal/teacher/scores — Upsert exam scores
// Body: { session, term, class, subject, scores: [{ fullname, studentId, firstCa, secondCa, thirdCa, exam, total }] }
export async function POST(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    if (!tenantId || !userId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID and User ID required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { session, term, class: cls, subject, scores } = body;

    if (!session || !term || !cls || !subject || !scores || !Array.isArray(scores)) {
      return NextResponse.json(
        { success: false, message: "session, term, class, subject, and scores are required" },
        { status: 400 }
      );
    }

    let created = 0;
    let updated = 0;

    for (const scoreData of scores) {
      const { fullname, firstCa, secondCa, thirdCa, exam } = scoreData;
      const total = (Number(firstCa) || 0) + (Number(secondCa) || 0) + (Number(thirdCa) || 0) + (Number(exam) || 0);

      // Check for existing score
      const existing = await db.examScore.findFirst({
        where: {
          tenantId,
          session,
          term,
          class: cls,
          fullname,
          subject,
        },
      });

      if (existing) {
        await db.examScore.update({
          where: { id: existing.id },
          data: {
            firstCa: Number(firstCa) || 0,
            secondCa: Number(secondCa) || 0,
            thirdCa: Number(thirdCa) || 0,
            exam: Number(exam) || 0,
            total,
          },
        });
        updated++;
      } else {
        await db.examScore.create({
          data: {
            tenantId,
            session,
            class: cls,
            term,
            fullname,
            subject,
            firstCa: Number(firstCa) || 0,
            secondCa: Number(secondCa) || 0,
            thirdCa: Number(thirdCa) || 0,
            exam: Number(exam) || 0,
            total,
          },
        });
        created++;
      }
    }

    // Log activity
    await db.activityLog.create({
      data: {
        tenantId,
        action: "teacher_scores_saved",
        details: `Teacher saved ${scores.length} exam scores for ${cls} - ${subject} (${term}, ${session}). Created: ${created}, Updated: ${updated}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: { created, updated, total: scores.length },
      message: `Scores saved: ${created} new, ${updated} updated`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to save scores: ${message}` },
      { status: 500 }
    );
  }
}
