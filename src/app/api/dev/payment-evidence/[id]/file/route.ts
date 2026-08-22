import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ─── GET /api/dev/payment-evidence/[id]/file ────────────────────────────
// Serve the raw file data for developer to view/download

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const record = await db.paymentEvidence.findUnique({
      where: { id },
      select: {
        id: true,
        fileName: true,
        fileData: true,
        fileType: true,
        tenantId: true,
        tenantName: true,
        type: true,
        targetPlan: true,
      },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, message: "Payment evidence not found" },
        { status: 404 }
      );
    }

    if (!record.fileData) {
      return NextResponse.json(
        { success: false, message: "No file data associated with this record" },
        { status: 404 }
      );
    }

    // Strip data-URL prefix if present (e.g. "data:application/pdf;base64,")
    let raw = record.fileData;
    const commaIdx = raw.indexOf(',');
    if (commaIdx !== -1) {
      raw = raw.substring(commaIdx + 1);
    }

    // Decode base64 to buffer
    const fileBuffer = Buffer.from(raw, "base64");

    // Determine content type from stored fileType or infer from extension
    const contentType = record.fileType || "application/octet-stream";

    // Sanitize filename for Content-Disposition header
    const sanitizedFileName = record.fileName
      .replace(/[^a-zA-Z0-9._-]/g, "_");

    // For PDFs, use inline so the browser can render them in an iframe
    // For other files, use attachment to force download
    const isPdf = contentType === "application/pdf" || (record.fileName && record.fileName.toLowerCase().endsWith(".pdf"));
    const disposition = isPdf ? `inline; filename="${sanitizedFileName}"` : `attachment; filename="${sanitizedFileName}"`;

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": disposition,
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch file: ${message}` },
      { status: 500 }
    );
  }
}