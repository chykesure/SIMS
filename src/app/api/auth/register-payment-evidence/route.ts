//src/app/api/auth/register-payment-evidence/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/auth/register-payment-evidence
// Unauthenticated — used right after registration before login
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      tenantId,
      adminEmail,
      targetPlan,
      amountNGN,
      amountUSD,
      fileData,
      fileName,
      fileSize,
      fileType,
      reference,
      note,
    } = body as {
      tenantId?: string;
      adminEmail?: string;
      targetPlan?: string;
      amountNGN?: number;
      amountUSD?: number;
      fileData?: string;
      fileName?: string;
      fileSize?: string;
      fileType?: string;
      reference?: string;
      note?: string;
    };

    // ─── Validate required fields ─────────────────────────────────────
    if (!tenantId || !adminEmail) {
      return NextResponse.json(
        { success: false, message: "Tenant ID and admin email are required." },
        { status: 400 }
      );
    }

    if (!fileData || typeof fileData !== "string" || fileData.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Payment receipt image is required." },
        { status: 400 }
      );
    }

    // ─── Verify tenant exists and admin email matches ─────────────────
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, email: true, status: true, plan: true },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, message: "School account not found." },
        { status: 404 }
      );
    }

    // Verify the admin email belongs to this tenant
    const adminUser = await db.user.findFirst({
      where: { tenantId, email: adminEmail },
      select: { id: true, email: true },
    });

    if (!adminUser) {
      return NextResponse.json(
        { success: false, message: "Admin account not found for this school." },
        { status: 404 }
      );
    }

    // ─── Check for existing pending evidence (prevent duplicates) ─────
    const existingPending = await db.paymentEvidence.findFirst({
      where: { tenantId, status: "pending" },
    });

    if (existingPending) {
      return NextResponse.json(
        {
          success: false,
          message: "You already have a pending payment verification. Please wait for the Cloud Engineer to review it.",
        },
        { status: 409 }
      );
    }

    // ─── Create the payment evidence record ───────────────────────────
    const evidence = await db.paymentEvidence.create({
      data: {
        tenantId,
        tenantName: tenant.name,
        tenantEmail: tenant.email || adminEmail,
        type: "new_subscription",
        targetPlan: targetPlan || tenant.plan || "basic",
        amountUSD: amountUSD ?? 0,
        amountNGN: amountNGN ?? 0,
        fileData: fileData.trim(),
        fileName: fileName || "receipt.jpg",
        fileSize: fileSize || "0",
        fileType: fileType || "image/jpeg",
        reference: reference ?? "",
        note: note ?? "",
      },
    });

    // ─── Log activity ─────────────────────────────────────────────────
    await db.activityLog.create({
      data: {
        tenantId,
        action: "registration_payment_evidence_uploaded",
        details: `Payment evidence uploaded by ${adminEmail} for "${targetPlan || tenant.plan}" plan (₦${(amountNGN ?? 0).toLocaleString()}). Awaiting Cloud Engineer verification.`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Payment receipt uploaded successfully! Your Cloud Engineer will verify it within 24–48 hours.",
      evidence: {
        id: evidence.id,
        status: evidence.status,
        createdAt: evidence.createdAt,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("[REGISTER PAYMENT EVIDENCE]", error);
    return NextResponse.json(
      { success: false, message: `Failed to upload payment evidence: ${message}` },
      { status: 500 }
    );
  }
}

// GET /api/auth/register-payment-evidence?tenantId=xxx&email=xxx
// Check if a pending tenant has already uploaded evidence
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const email = searchParams.get("email");

    if (!tenantId || !email) {
      return NextResponse.json(
        { success: false, message: "tenantId and email query params are required." },
        { status: 400 }
      );
    }

    // Verify the user belongs to this tenant
    const user = await db.user.findFirst({
      where: { tenantId, email },
      select: { id: true, tenantId: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Account not found." },
        { status: 404 }
      );
    }

    const evidence = await db.paymentEvidence.findFirst({
      where: { tenantId },
      select: { id: true, status: true, createdAt: true, reviewedAt: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      hasEvidence: !!evidence,
      evidenceStatus: evidence?.status || null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Check failed: ${message}` },
      { status: 500 }
    );
  }
}