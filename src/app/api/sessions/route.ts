import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

// GET all sessions
export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);

    const sessions = await db.session.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(sessions);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch sessions: ${message}` },
      { status: 500 }
    );
  }
}

// POST create a new session
export async function POST(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const { sessionOne, sessionTwo, active } = body;

    if (!sessionOne || typeof sessionOne !== "string" || sessionOne.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: "Session start year is required" },
        { status: 400 }
      );
    }

    if (!sessionTwo || typeof sessionTwo !== "string" || sessionTwo.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: "Session end year is required" },
        { status: 400 }
      );
    }

    const trimmedOne = sessionOne.trim();
    const trimmedTwo = sessionTwo.trim();
    const activeValue = active === "Yes" ? "Yes" : "No";

    // If setting this session as active, deactivate all others first
    if (activeValue === "Yes") {
      await db.session.updateMany({
        where: { tenantId, active: "Yes" },
        data: { active: "No" },
      });
    }

    const session = await db.session.create({
      data: {
        tenantId,
        sessionOne: trimmedOne,
        sessionTwo: trimmedTwo,
        active: activeValue,
      },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to create session: ${message}` },
      { status: 500 }
    );
  }
}

// PUT update a session
export async function PUT(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const { id, sessionOne, sessionTwo, active } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { success: false, message: "Session id is required" },
        { status: 400 }
      );
    }

    if (!sessionOne || typeof sessionOne !== "string" || sessionOne.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: "Session start year is required" },
        { status: 400 }
      );
    }

    if (!sessionTwo || typeof sessionTwo !== "string" || sessionTwo.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: "Session end year is required" },
        { status: 400 }
      );
    }

    const trimmedOne = sessionOne.trim();
    const trimmedTwo = sessionTwo.trim();
    const activeValue = active === "Yes" ? "Yes" : "No";

    // If setting this session as active, deactivate all others first
    if (activeValue === "Yes") {
      await db.session.updateMany({
        where: {
          tenantId,
          active: "Yes",
          NOT: { id },
        },
        data: { active: "No" },
      });
    }

    const existing = await db.session.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Session not found" },
        { status: 404 }
      );
    }

    const session = await db.session.update({
      where: { id },
      data: {
        sessionOne: trimmedOne,
        sessionTwo: trimmedTwo,
        active: activeValue,
      },
    });

    return NextResponse.json(session);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to update session: ${message}` },
      { status: 500 }
    );
  }
}

// DELETE a session by id
export async function DELETE(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Session id is required" },
        { status: 400 }
      );
    }

    const existing = await db.session.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Session not found" },
        { status: 404 }
      );
    }

    await db.session.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Session deleted successfully" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to delete session: ${message}` },
      { status: 500 }
    );
  }
}
