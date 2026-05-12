import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);

    const subjects = await db.subject.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(subjects);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch subjects: ${message}` },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Subject name is required" },
        { status: 400 }
      );
    }

    const existing = await db.subject.findFirst({ where: { tenantId, name } });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Subject already exists" },
        { status: 409 }
      );
    }

    const subject = await db.subject.create({ data: { tenantId, name } });
    return NextResponse.json(subject, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to create subject: ${message}` },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const { id, name } = body;

    if (!id || !name) {
      return NextResponse.json(
        { success: false, message: "Subject id and name are required" },
        { status: 400 }
      );
    }

    const existing = await db.subject.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Subject not found" },
        { status: 404 }
      );
    }

    const subject = await db.subject.update({
      where: { id },
      data: { name },
    });

    return NextResponse.json(subject);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to update subject: ${message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Subject id is required" },
        { status: 400 }
      );
    }

    const existing = await db.subject.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Subject not found" },
        { status: 404 }
      );
    }

    await db.subject.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Subject deleted" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to delete subject: ${message}` },
      { status: 500 }
    );
  }
}
