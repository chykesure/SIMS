import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ─── GET /api/payment-evidence/[id] ─────────────────────────────────────────
// Fetch a single payment evidence WITH fileData (for preview/download)

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = request.headers.get("x-tenant-id");

    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID is required" },
        { status: 400 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Evidence ID is required" },
        { status: 400 }
      );
    }

    const evidence = await db.paymentEvidence.findFirst({
      where: { id, tenantId },
    });

    if (!evidence) {
      return NextResponse.json(
        { success: false, message: "Payment evidence not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      evidence,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch evidence: ${message}` },
      { status: 500 }
    );
  }
}