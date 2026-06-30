import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";

// ─── GET /api/previous-scores ───────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const headersList = await headers();
    const tenantId = headersList.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const session = searchParams.get("session");
    const term = parseInt(searchParams.get("term") || "0", 10);
    const classId = searchParams.get("classId");
    const subjectId = searchParams.get("subjectId");
    const studentId = searchParams.get("studentId");

    if (!session || !term || !classId) {
      return NextResponse.json(
        { success: false, message: "session, term, and classId are required" },
        { status: 400 }
      );
    }

    const where: Prisma.PreviousTermScoreWhereInput = {
      tenantId,
      session,
      term,
      classId,
    };

    if (subjectId) where.subjectId = subjectId;
    if (studentId) where.studentId = studentId;

    const scores = await db.previousTermScore.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: scores });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch previous scores: ${message}` },
      { status: 500 }
    );
  }
}

// ─── POST /api/previous-scores ──────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const headersList = await headers();
    const tenantId = headersList.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { scores, session, term, classId, subjectId, enteredBy } = body as {
      scores?: { studentId: string; totalScore: number; remark?: string }[];
      session?: string;
      term?: number;
      classId?: string;
      subjectId?: string;
      enteredBy?: string;
    };

    // Support both bulk (array) and single save
    const entries = scores
      ? scores.map((s) => ({
          tenantId,
          session,
          term,
          classId,
          subjectId,
          enteredBy,
          studentId: s.studentId,
          totalScore: s.totalScore,
          remark: s.remark || null,
        }))
      : [
          {
            tenantId,
            studentId: body.studentId,
            classId: body.classId,
            subjectId: body.subjectId,
            session: body.session,
            term: body.term,
            totalScore: body.totalScore,
            remark: body.remark || null,
            enteredBy: body.enteredBy || null,
          },
        ];

    if (!entries.length) {
      return NextResponse.json(
        { success: false, message: "No scores provided" },
        { status: 400 }
      );
    }

    const results: any[] = [];  
    for (const entry of entries) {
      if (!entry.studentId || !entry.classId || !entry.subjectId || !entry.session || !entry.term) {
        continue;
      }
      const result = await db.previousTermScore.upsert({
        where: {
          tenantId_studentId_classId_subjectId_session_term: {
            tenantId: entry.tenantId as string,
            studentId: entry.studentId,
            classId: entry.classId,
            subjectId: entry.subjectId,
            session: entry.session as string,
            term: entry.term as number,
          },
        },
        update: {
          totalScore: entry.totalScore,
          remark: entry.remark,
          enteredBy: entry.enteredBy,
        },
        create: {
          tenantId: entry.tenantId as string,
          studentId: entry.studentId,
          classId: entry.classId,
          subjectId: entry.subjectId,
          session: entry.session as string,
          term: entry.term as number,
          totalScore: entry.totalScore,
          remark: entry.remark,
          enteredBy: entry.enteredBy,
        },
      });
      results.push(result);
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: `Saved ${results.length} previous score(s)`,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to save previous scores: ${message}` },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/previous-scores ────────────────────────────────────────────
export async function DELETE(request: Request) {
  try {
    const headersList = await headers();
    const tenantId = headersList.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "id is required" },
        { status: 400 }
      );
    }

    await db.previousTermScore.delete({
      where: { id, tenantId },
    });

    return NextResponse.json({
      success: true,
      message: "Previous score deleted",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to delete previous score: ${message}` },
      { status: 500 }
    );
  }
}