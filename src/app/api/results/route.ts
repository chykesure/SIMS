import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

// GET /api/results?session=xxx&class=xxx&term=xxx&fullname=xxx
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
    if (fullname) where.fullname = fullname;

    const records = await db.studentRecord.findMany({
      where,
      orderBy: { classPosition: "asc" },
    });

    return NextResponse.json(records);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch student records: ${message}` },
      { status: 500 }
    );
  }
}

// POST /api/results - Create or update student record
export async function POST(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const {
      session,
      class: cls,
      classRef,
      term,
      fullname,
      totalScore,
      average,
      percentage,
      attendance,
      subjectsTaken,
      subjectsPassed,
      subjectsFailed,
      classPosition,
      overallPosition,
      totalStudents,
    } = body;

    if (!session || !cls || !term || !fullname) {
      return NextResponse.json(
        { success: false, message: "Session, class, term, and fullname are required" },
        { status: 400 }
      );
    }

    // Check if a record already exists for this combination
    const existing = await db.studentRecord.findFirst({
      where: {
        tenantId,
        session,
        class: cls,
        term,
        fullname,
      },
    });

    let record;
    if (existing) {
      record = await db.studentRecord.update({
        where: { id: existing.id },
        data: {
          classRef: classRef || "",
          totalScore: Number(totalScore) || 0,
          average: Number(average) || 0,
          percentage: Number(percentage) || 0,
          attendance: Number(attendance) || 0,
          subjectsTaken: Number(subjectsTaken) || 0,
          subjectsPassed: Number(subjectsPassed) || 0,
          subjectsFailed: Number(subjectsFailed) || 0,
          classPosition: Number(classPosition) || 0,
          overallPosition: Number(overallPosition) || 0,
          totalStudents: Number(totalStudents) || 0,
        },
      });
    } else {
      record = await db.studentRecord.create({
        data: {
          tenantId,
          session,
          class: cls,
          classRef: classRef || "",
          term,
          fullname,
          totalScore: Number(totalScore) || 0,
          average: Number(average) || 0,
          percentage: Number(percentage) || 0,
          attendance: Number(attendance) || 0,
          subjectsTaken: Number(subjectsTaken) || 0,
          subjectsPassed: Number(subjectsPassed) || 0,
          subjectsFailed: Number(subjectsFailed) || 0,
          classPosition: Number(classPosition) || 0,
          overallPosition: Number(overallPosition) || 0,
          totalStudents: Number(totalStudents) || 0,
        },
      });
    }

    return NextResponse.json(record, { status: existing ? 200 : 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to save student record: ${message}` },
      { status: 500 }
    );
  }
}

// PUT /api/results - Update student record by id
export async function PUT(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Record id is required" },
        { status: 400 }
      );
    }

    const existing = await db.studentRecord.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Student record not found" },
        { status: 404 }
      );
    }

    const record = await db.studentRecord.update({
      where: { id },
      data: {
        totalScore: Number(data.totalScore) || 0,
        average: Number(data.average) || 0,
        percentage: Number(data.percentage) || 0,
        attendance: Number(data.attendance) || 0,
        subjectsTaken: Number(data.subjectsTaken) || 0,
        subjectsPassed: Number(data.subjectsPassed) || 0,
        subjectsFailed: Number(data.subjectsFailed) || 0,
        classPosition: Number(data.classPosition) || 0,
        overallPosition: Number(data.overallPosition) || 0,
        totalStudents: Number(data.totalStudents) || 0,
      },
    });

    return NextResponse.json(record);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to update student record: ${message}` },
      { status: 500 }
    );
  }
}

// DELETE /api/results?id=xxx
export async function DELETE(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Record id is required" },
        { status: 400 }
      );
    }

    const existing = await db.studentRecord.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Student record not found" },
        { status: 404 }
      );
    }

    await db.studentRecord.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Student record deleted" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to delete student record: ${message}` },
      { status: 500 }
    );
  }
}
