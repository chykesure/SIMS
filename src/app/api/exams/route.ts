import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

// GET /api/exams?session=xxx&class=xxx&term=xxx&fullname=xxx
export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const { searchParams } = new URL(request.url);
    const session = searchParams.get("session");
    const cls = searchParams.get("class");
    const term = searchParams.get("term");
    const fullname = searchParams.get("fullname");

    const where: Record<string, unknown> = { tenantId };
    if (session) where.session = session;
    if (cls) where.class = cls;
    if (term) where.term = term;

    let scores;
    if (fullname) {
      // Case-insensitive fullname match: fetch all for session/class/term, then filter
      scores = await db.examScore.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
      const fullnameNorm = fullname.trim().toUpperCase();
      scores = scores.filter(
        (s: any) => s.fullname.trim().toUpperCase() === fullnameNorm
      );
    } else {
      scores = await db.examScore.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json(scores);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch exam scores: ${message}` },
      { status: 500 }
    );
  }
}

// POST /api/exams - Create exam score
export async function POST(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const { session, class: cls, term, fullname, subject, firstCa, secondCa, thirdCa, exam } = body;

    if (!session || !cls || !term || !fullname || !subject) {
      return NextResponse.json(
        { success: false, message: "Session, class, term, fullname, and subject are required" },
        { status: 400 }
      );
    }

    // Check for duplicate entry
    const existing = await db.examScore.findFirst({
      where: {
        tenantId,
        session,
        class: cls,
        term,
        fullname,
        subject,
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: `A score already exists for "${fullname}" in "${subject}" for ${term}. Edit the existing record instead.`,
          existingId: existing.id,
        },
        { status: 409 }
      );
    }

    const total = (Number(firstCa) || 0) + (Number(secondCa) || 0) + (Number(thirdCa) || 0) + (Number(exam) || 0);

    const score = await db.examScore.create({
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

    // Log activity
    await db.activityLog.create({
      data: {
        tenantId,
        action: "exam_score_created",
        details: `Exam score created for "${fullname}" in "${subject}" for ${term} (${session} - ${cls}). Total: ${total}`,
      },
    });

    return NextResponse.json(score, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to create exam score: ${message}` },
      { status: 500 }
    );
  }
}

// PUT /api/exams - Update exam score by id
export async function PUT(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const { id, firstCa, secondCa, thirdCa, exam } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Exam score id is required" },
        { status: 400 }
      );
    }

    const total = (Number(firstCa) || 0) + (Number(secondCa) || 0) + (Number(thirdCa) || 0) + (Number(exam) || 0);

    const existing = await db.examScore.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Exam score not found" },
        { status: 404 }
      );
    }

    const score = await db.examScore.update({
      where: { id },
      data: {
        firstCa: Number(firstCa),
        secondCa: Number(secondCa),
        thirdCa: Number(thirdCa) || 0,
        exam: Number(exam),
        total,
      },
    });

    return NextResponse.json(score);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to update exam score: ${message}` },
      { status: 500 }
    );
  }
}

// DELETE /api/exams?id=xxx - Delete exam score by id
export async function DELETE(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Exam score id is required" },
        { status: 400 }
      );
    }

    const existing = await db.examScore.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Exam score not found" },
        { status: 404 }
      );
    }

    await db.examScore.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Exam score deleted" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to delete exam score: ${message}` },
      { status: 500 }
    );
  }
}