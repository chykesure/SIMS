import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);

    const classes = await db.class.findMany({
      where: { tenantId },
      orderBy: { title: "asc" },
    });
    return NextResponse.json(classes);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch classes: ${message}` },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const { title, arms } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { success: false, message: "Class title is required" },
        { status: 400 }
      );
    }

    const trimmedTitle = title.trim();

    // Bulk creation with arms
    if (Array.isArray(arms) && arms.length > 0) {
      const namesToCreate = arms
        .filter((arm: string) => typeof arm === "string" && arm.trim())
        .map((arm: string) => `${trimmedTitle} ${arm.trim()}`);

      // Also include the base title itself if no arms would be generated
      // But if arms are provided, only create arm-based classes
      if (namesToCreate.length === 0) {
        return NextResponse.json(
          { success: false, message: "No valid arms provided" },
          { status: 400 }
        );
      }

      // Check which ones already exist
      const existing = await db.class.findMany({
        where: {
          tenantId,
          title: { in: namesToCreate },
        },
        select: { title: true },
      });

      const existingTitles = new Set(existing.map((e: { title: string }) => e.title));

      const toCreate = namesToCreate.filter((n: string) => !existingTitles.has(n));
      const skipped = namesToCreate.filter((n: string) => existingTitles.has(n));
      const created: string[] = [];

      // Create each non-duplicate class
      for (const name of toCreate) {
        await db.class.create({ data: { tenantId, title: name } });
        created.push(name);
      }

      return NextResponse.json(
        { created, skipped },
        { status: created.length > 0 ? 201 : 200 }
      );
    }

    // Single class creation (backward compatible)
    const existing = await db.class.findFirst({ where: { tenantId, title: trimmedTitle } });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Class already exists" },
        { status: 409 }
      );
    }

    const cls = await db.class.create({ data: { tenantId, title: trimmedTitle } });
    return NextResponse.json(cls, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to create class: ${message}` },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const { id, title } = body;

    if (!id || !title) {
      return NextResponse.json(
        { success: false, message: "Class id and title are required" },
        { status: 400 }
      );
    }

    const existing = await db.class.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Class not found" },
        { status: 404 }
      );
    }

    const cls = await db.class.update({
      where: { id },
      data: { title },
    });

    return NextResponse.json(cls);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to update class: ${message}` },
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
        { success: false, message: "Class id is required" },
        { status: 400 }
      );
    }

    const existing = await db.class.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Class not found" },
        { status: 404 }
      );
    }

    await db.class.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Class deleted" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to delete class: ${message}` },
      { status: 500 }
    );
  }
}
