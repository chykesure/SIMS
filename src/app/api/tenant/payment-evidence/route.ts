import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId) throw new Error("Tenant ID is required");
  return tenantId;
}

// GET /api/tenant/payment-evidence
export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, email: true },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, message: "Tenant not found" },
        { status: 404 }
      );
    }

    const evidences = await db.paymentEvidence.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, evidences });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch payment evidence: ${message}` },
      { status: 500 }
    );
  }
}

// POST /api/tenant/payment-evidence
export async function POST(request: Request) {
  try {
    const tenantId = getTenantId(request);

    const body = await request.json();
    const {
      type,
      targetPlan,
      amountUSD,
      amountNGN,
      fileData,
      fileName,
      fileSize,
      fileType,
      reference,
      note,
    } = body as {
      type?: string;
      targetPlan?: string;
      amountUSD?: number;
      amountNGN?: number;
      fileData?: string;
      fileName?: string;
      fileSize?: string;
      fileType?: string;
      reference?: string;
      note?: string;
    };

    if (!targetPlan || !["basic", "premium"].includes(targetPlan)) {
      return NextResponse.json(
        {
          success: false,
          message: "targetPlan is required and must be 'basic' or 'premium'",
        },
        { status: 400 }
      );
    }

    if (!fileData || typeof fileData !== "string" || fileData.trim() === "") {
      return NextResponse.json(
        { success: false, message: "fileData (base64 image) is required" },
        { status: 400 }
      );
    }

    const validTypes = ["new_subscription", "renewal", "upgrade"];
    const paymentType = type && validTypes.includes(type) ? type : "new_subscription";

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, email: true },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, message: "Tenant not found" },
        { status: 404 }
      );
    }

    const existingPending = await db.paymentEvidence.findFirst({
      where: { tenantId, status: "pending" },
    });

    if (existingPending) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You already have a pending payment verification. Please wait for it to be reviewed.",
        },
        { status: 409 }
      );
    }

    const evidence = await db.paymentEvidence.create({
      data: {
        tenantId,
        tenantName: tenant.name,
        tenantEmail: tenant.email || "",
        type: paymentType,
        targetPlan,
        amountUSD: amountUSD ?? 0,
        amountNGN: amountNGN ?? 0,
        fileData: fileData.trim(),
        fileName: fileName || "",
        fileSize: fileSize || "",
        fileType: fileType || "",
        reference: reference ?? "",
        note: note ?? "",
      },
    });

    await db.activityLog.create({
      data: {
        tenantId,
        action: "payment_evidence_submitted",
        details: `Payment evidence submitted for "${targetPlan}" plan (${paymentType}).`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Payment evidence submitted successfully",
      evidence,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to submit payment evidence: ${message}` },
      { status: 500 }
    );
  }
}