import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET all sessions across all schools
// Query params: ?tenantId=xxx (filter by school)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    const where = tenantId ? { tenantId } : {};

    const sessions = await db.session.findMany({
      where,
      include: {
        tenant: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalSchools = await db.tenant.count();
    const schoolsWithSessions = await db.tenant.count({
      where: { sessions: { some: {} } },
    });

    return NextResponse.json({
      sessions,
      summary: {
        totalSchools,
        schoolsWithSessions,
        totalSessions: sessions.length,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, message: `Failed to fetch sessions: ${message}` },
      { status: 500 }
    );
  }
}

// POST - Create a session for any school (dev override)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tenantId, sessionOne, sessionTwo, active } = body;

    if (!tenantId || !sessionOne || !sessionTwo) {
      return NextResponse.json(
        { success: false, message: "tenantId, sessionOne, and sessionTwo are required" },
        { status: 400 }
      );
    }

    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return NextResponse.json(
        { success: false, message: "School not found" },
        { status: 404 }
      );
    }

    const activeValue = active === "Yes" ? "Yes" : "No";

    if (activeValue === "Yes") {
      await db.session.updateMany({
        where: { tenantId, active: "Yes" },
        data: { active: "No" },
      });
    }

    const session = await db.session.create({
      data: {
        tenantId,
        sessionOne: sessionOne.trim(),
        sessionTwo: sessionTwo.trim(),
        active: activeValue,
      },
      include: {
        tenant: { select: { name: true } },
      },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, message: `Failed to create session: ${message}` },
      { status: 500 }
    );
  }
}

// PUT - Update a session (dev override)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, sessionOne, sessionTwo, active } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Session id is required" },
        { status: 400 }
      );
    }

    const existing = await db.session.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Session not found" },
        { status: 404 }
      );
    }

    const activeValue = active === "Yes" ? "Yes" : "No";

    if (activeValue === "Yes") {
      await db.session.updateMany({
        where: { tenantId: existing.tenantId, active: "Yes", NOT: { id } },
        data: { active: "No" },
      });
    }

    const session = await db.session.update({
      where: { id },
      data: {
        sessionOne: sessionOne?.trim() || existing.sessionOne,
        sessionTwo: sessionTwo?.trim() || existing.sessionTwo,
        active: activeValue,
      },
      include: {
        tenant: { select: { name: true } },
      },
    });

    return NextResponse.json(session);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, message: `Failed to update session: ${message}` },
      { status: 500 }
    );
  }
}

// DELETE - Remove a session (dev override)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Session id is required" },
        { status: 400 }
      );
    }

    await db.session.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Session deleted" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, message: `Failed to delete session: ${message}` },
      { status: 500 }
    );
  }
}