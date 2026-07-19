import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

function getUserId(request: Request): string {
  return request.headers.get("x-user-id") || "";
}

async function getSchoolSettings(tenantId: string) {
  try {
    const settings = await db.schoolSettings.findFirst({
      where: { tenantId },
    });
    return settings || null;
  } catch {
    return null;
  }
}

function clampScore(value: number, max: number): number {
  const num = Number(value) || 0;
  return Math.max(0, Math.min(max, Math.round(num * 100) / 100));
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

    // Fetch school settings for score validation
    const settings = await getSchoolSettings(tenantId);
    const ca1Max = settings?.ca1Max || 20;
    const ca2Max = settings?.ca2Max || 20;
    const ca3Max = settings?.ca3Max || 10;
    const examMax = settings?.examMax || 60;

    let created = 0;
    let updated = 0;

    // Fetch ALL existing scores for this class/subject/term/session ONCE for efficiency
    const existingScores = await db.examScore.findMany({
      where: { tenantId, session, term, class: cls, subject },
    });

    // Build a map: normalized fullname → existing record (first match)
    const existingMap = new Map<string, (typeof existingScores)[0]>();
    for (const es of existingScores) {
      const key = es.fullname.trim().toUpperCase();
      if (!existingMap.has(key)) existingMap.set(key, es);
    }

    for (const scoreData of scores) {
      const { fullname, firstCa, secondCa, thirdCa, exam } = scoreData;

      // Validate and clamp each score field to its configured maximum
      const validFirstCa = clampScore(firstCa, ca1Max);
      const validSecondCa = clampScore(secondCa, ca2Max);
      const validThirdCa = clampScore(thirdCa, ca3Max);
      const validExam = clampScore(exam, examMax);

      const total = validFirstCa + validSecondCa + validThirdCa + validExam;

      const canonicalName = String(fullname).trim();
      const fullnameNorm = canonicalName.toUpperCase();
      const existing = existingMap.get(fullnameNorm);

      if (existing) {
        // Update existing record — also fix the fullname to canonical form
        await db.examScore.update({
          where: { id: existing.id },
          data: {
            fullname: canonicalName,
            firstCa: validFirstCa,
            secondCa: validSecondCa,
            thirdCa: validThirdCa,
            exam: validExam,
            total,
          },
        });

        // Delete any duplicate records (different case variations of same name)
        for (const es of existingScores) {
          if (es.id !== existing.id && es.fullname.trim().toUpperCase() === fullnameNorm) {
            await db.examScore.delete({ where: { id: es.id } });
          }
        }

        updated++;
      } else {
        await db.examScore.create({
          data: {
            tenantId,
            session,
            class: cls,
            term,
            fullname: canonicalName,
            subject,
            firstCa: validFirstCa,
            secondCa: validSecondCa,
            thirdCa: validThirdCa,
            exam: validExam,
            total,
          },
        });
        created++;
        existingMap.set(fullnameNorm, { id: "__new__" } as any); // prevent duplicates in same batch
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