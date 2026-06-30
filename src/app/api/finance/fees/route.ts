import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const { searchParams } = new URL(request.url);
    const includeAssignments = searchParams.get("includeAssignments") === "true";

    const feeTypes = await db.feeType.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: includeAssignments
        ? {
            assignments: {
              orderBy: { createdAt: "desc" },
            },
          }
        : undefined,
    });

    return NextResponse.json({ success: true, data: feeTypes });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch fee types: ${message}` },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const { name, description, amount, frequency, isActive } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, message: "Fee type name is required" },
        { status: 400 }
      );
    }

    // Check for duplicate fee type name within the tenant
    const existing = await db.feeType.findFirst({
      where: { tenantId, name: name.trim() },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "A fee type with this name already exists" },
        { status: 409 }
      );
    }

    const feeType = await db.feeType.create({
      data: {
        tenantId,
        name: name.trim(),
        description: description?.trim() || "",
        amount: amount ?? 0,
        frequency: frequency || "termly",
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(
      { success: true, message: "Fee type created successfully", data: feeType },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to create fee type: ${message}` },
      { status: 500 }
    );
  }
}
