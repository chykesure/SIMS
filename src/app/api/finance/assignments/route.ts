import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const { searchParams } = new URL(request.url);
    const className = searchParams.get("className");
    const session = searchParams.get("session");
    const term = searchParams.get("term");
    const feeTypeId = searchParams.get("feeTypeId");

    const where: Record<string, unknown> = { tenantId };
    if (className) where.className = className;
    if (session) where.session = session;
    if (term) where.term = term;
    if (feeTypeId) where.feeTypeId = feeTypeId;

    const assignments = await db.feeAssignment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        feeType: {
          select: { id: true, name: true, frequency: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: assignments });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch fee assignments: ${message}` },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const { feeTypeId, className, session, term, amount, dueDate, isActive } = body;

    if (!feeTypeId) {
      return NextResponse.json(
        { success: false, message: "Fee type ID is required" },
        { status: 400 }
      );
    }

    if (!session?.trim()) {
      return NextResponse.json(
        { success: false, message: "Session is required" },
        { status: 400 }
      );
    }

    // Verify fee type belongs to the tenant
    const feeType = await db.feeType.findFirst({
      where: { id: feeTypeId, tenantId },
    });
    if (!feeType) {
      return NextResponse.json(
        { success: false, message: "Fee type not found" },
        { status: 404 }
      );
    }

    const assignment = await db.feeAssignment.create({
      data: {
        tenantId,
        feeTypeId,
        className: className?.trim() || "all",
        session: session.trim(),
        term: term?.trim() || "",
        amount: amount ?? feeType.amount,
        dueDate: dueDate?.trim() || "",
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(
      { success: true, message: "Fee assignment created successfully", data: assignment },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to create fee assignment: ${message}` },
      { status: 500 }
    );
  }
}
