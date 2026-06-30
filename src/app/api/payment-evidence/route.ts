import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_BASE64_SIZE = 5 * 1024 * 1024; // 5MB base64 (~3.5MB actual file)

// ─── POST /api/payment-evidence ───────────────────────────────────────────────
// School uploads payment evidence

export async function POST(request: Request) {
  try {
    const tenantId = request.headers.get("x-tenant-id");

    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      targetPlan,
      type,
      amountUSD,
      amountNGN,
      fileName,
      fileSize,
      fileType,
      fileData,
      reference,
      note,
    } = body;

    // Validate required fields
    if (!targetPlan || !["free", "basic", "premium"].includes(targetPlan)) {
      return NextResponse.json(
        { success: false, message: "Invalid target plan. Must be free, basic, or premium." },
        { status: 400 }
      );
    }

    if (!fileData) {
      return NextResponse.json(
        { success: false, message: "Payment evidence file is required." },
        { status: 400 }
      );
    }

    // Validate file size (5MB base64 limit)
    if (fileData.length > MAX_BASE64_SIZE) {
      return NextResponse.json(
        { success: false, message: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Fetch tenant info to store alongside evidence
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, email: true },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, message: "Tenant not found." },
        { status: 404 }
      );
    }

    // Create payment evidence
    const evidence = await db.paymentEvidence.create({
      data: {
        tenantId,
        tenantName: tenant.name,
        tenantEmail: tenant.email,
        type: type || "new_subscription",
        targetPlan,
        amountUSD: amountUSD ? parseFloat(amountUSD) : 0,
        amountNGN: amountNGN ? parseFloat(amountNGN) : 0,
        fileName: fileName || "",
        fileSize: fileSize || "0",
        fileType: fileType || "",
        fileData,
        reference: reference || "",
        note: note || "",
      },
    });

    // Return created record WITHOUT fileData to keep response small
    const { fileData: _fileData, ...evidenceWithoutFile } = evidence;

    return NextResponse.json({
      success: true,
      message: "Payment evidence submitted successfully.",
      evidence: evidenceWithoutFile,
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

// ─── GET /api/payment-evidence ────────────────────────────────────────────────
// School lists their own payment submissions

export async function GET(request: Request) {
  try {
    const tenantId = request.headers.get("x-tenant-id");

    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID is required" },
        { status: 400 }
      );
    }

    // Fetch all payment evidence for this tenant (WITHOUT fileData)
    const evidences = await db.paymentEvidence.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        tenantId: true,
        tenantName: true,
        tenantEmail: true,
        type: true,
        targetPlan: true,
        amountUSD: true,
        amountNGN: true,
        fileName: true,
        fileSize: true,
        fileType: true,
        reference: true,
        note: true,
        status: true,
        reviewedBy: true,
        reviewNote: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Compute count stats
    const pending = evidences.filter((e) => e.status === "pending").length;
    const verified = evidences.filter((e) => e.status === "verified").length;
    const rejected = evidences.filter((e) => e.status === "rejected").length;

    return NextResponse.json({
      success: true,
      evidences,
      counts: {
        total: evidences.length,
        pending,
        verified,
        rejected,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch payment evidence: ${message}` },
      { status: 500 }
    );
  }
}