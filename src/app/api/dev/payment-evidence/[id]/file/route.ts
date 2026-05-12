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

    // Decode base64 to buffer
    const fileBuffer = Buffer.from(record.fileData, "base64");

    // Determine content type from stored fileType or infer from extension
    const contentType = record.fileType || "application/octet-stream";

    // Sanitize filename for Content-Disposition header
    const sanitizedFileName = record.fileName
      .replace(/[^a-zA-Z0-9._-]/g, "_");

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${sanitizedFileName}"`,
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
