import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: NextRequest): string {
  return request.headers.get("x-tenant-id") || "";
}

// GET class or subject positions
export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const session = searchParams.get("session");
    const cls = searchParams.get("class");
    const term = searchParams.get("term");

    if (!type || !session || !cls || !term) {
      return NextResponse.json(
        { error: "type, session, class, and term query parameters are required" },
        { status: 400 }
      );
    }

    if (type === "class") {
      const positions = await db.classPosition.findMany({
        where: { tenantId, session, class: cls, term },
        orderBy: { position: "asc" },
      });
      return NextResponse.json(positions);
    }

    if (type === "subject") {
      const subject = searchParams.get("subject");
      if (!subject) {
        return NextResponse.json(
          { error: "subject query parameter is required for subject positions" },
          { status: 400 }
        );
      }
      const positions = await db.subjectPosition.findMany({
        where: { tenantId, session, class: cls, term, subject },
        orderBy: { position: "asc" },
      });
      return NextResponse.json(positions);
    }

    return NextResponse.json(
      { error: "Invalid type. Use 'class' or 'subject'." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error fetching positions:", error);
    return NextResponse.json(
      { error: "Failed to fetch positions" },
      { status: 500 }
    );
  }
}

// POST create position record
export async function POST(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const { type, session, class: cls, term, fullname, score, total, subject, position, totalStudents, overallPosition } = body;

    if (!type || !session || !cls || !term || !fullname) {
      return NextResponse.json(
        { error: "type, session, class, term, and fullname are required" },
        { status: 400 }
      );
    }

    if (type === "class") {
      const record = await db.classPosition.create({
        data: {
          tenantId,
          session,
          class: cls,
          term,
          fullname,
          score: score || 0,
          position: position || 0,
          totalStudents: totalStudents || 0,
          overallPosition: overallPosition || 0,
        },
      });
      return NextResponse.json(record, { status: 201 });
    }

    if (type === "subject") {
      if (!subject) {
        return NextResponse.json(
          { error: "subject is required for subject positions" },
          { status: 400 }
        );
      }
      const record = await db.subjectPosition.create({
        data: {
          tenantId,
          session,
          class: cls,
          term,
          fullname,
          subject,
          total: total || 0,
          position: position || 0,
          totalStudents: totalStudents || 0,
        },
      });
      return NextResponse.json(record, { status: 201 });
    }

    return NextResponse.json(
      { error: "Invalid type. Use 'class' or 'subject'." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error creating position record:", error);
    return NextResponse.json(
      { error: "Failed to create position record" },
      { status: 500 }
    );
  }
}

// PUT update position record
export async function PUT(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const { id, type, score, total, position, totalStudents, overallPosition } = body;

    if (!id || !type) {
      return NextResponse.json(
        { error: "ID and type are required" },
        { status: 400 }
      );
    }

    if (type === "class") {
      const existing = await db.classPosition.findFirst({ where: { id, tenantId } });
      if (!existing) {
        return NextResponse.json(
          { error: "Class position record not found" },
          { status: 404 }
        );
      }

      const updateData: Record<string, unknown> = {};
      if (score !== undefined) updateData.score = score;
      if (position !== undefined) updateData.position = position;
      if (totalStudents !== undefined) updateData.totalStudents = totalStudents;
      if (overallPosition !== undefined) updateData.overallPosition = overallPosition;

      const record = await db.classPosition.update({
        where: { id },
        data: updateData,
      });
      return NextResponse.json(record);
    }

    if (type === "subject") {
      const existing = await db.subjectPosition.findFirst({ where: { id, tenantId } });
      if (!existing) {
        return NextResponse.json(
          { error: "Subject position record not found" },
          { status: 404 }
        );
      }

      const updateData: Record<string, unknown> = {};
      if (total !== undefined) updateData.total = total;
      if (position !== undefined) updateData.position = position;
      if (totalStudents !== undefined) updateData.totalStudents = totalStudents;

      const record = await db.subjectPosition.update({
        where: { id },
        data: updateData,
      });
      return NextResponse.json(record);
    }

    return NextResponse.json(
      { error: "Invalid type. Use 'class' or 'subject'." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating position record:", error);
    return NextResponse.json(
      { error: "Failed to update position record" },
      { status: 500 }
    );
  }
}

// DELETE position record
export async function DELETE(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type");

    if (!id || !type) {
      return NextResponse.json(
        { error: "ID and type are required" },
        { status: 400 }
      );
    }

    if (type === "class") {
      const existing = await db.classPosition.findFirst({ where: { id, tenantId } });
      if (!existing) {
        return NextResponse.json(
          { error: "Class position record not found" },
          { status: 404 }
        );
      }
      await db.classPosition.delete({ where: { id } });
    } else if (type === "subject") {
      const existing = await db.subjectPosition.findFirst({ where: { id, tenantId } });
      if (!existing) {
        return NextResponse.json(
          { error: "Subject position record not found" },
          { status: 404 }
        );
      }
      await db.subjectPosition.delete({ where: { id } });
    } else {
      return NextResponse.json(
        { error: "Invalid type. Use 'class' or 'subject'." },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: "Position record deleted successfully" });
  } catch (error) {
    console.error("Error deleting position record:", error);
    return NextResponse.json(
      { error: "Failed to delete position record" },
      { status: 500 }
    );
  }
}
