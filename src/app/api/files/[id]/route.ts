// src/app/api/files/[id]/route.ts
// Serves files uploaded through /api/upload (stored base64 in the DB).
// GET /api/files/<id> — returns the raw file bytes with its original
// name and type so browsers download/preview them correctly.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const file = await db.uploadedFile.findUnique({ where: { id } });
    if (!file) {
      return NextResponse.json(
        { success: false, message: "File not found" },
        { status: 404 }
      );
    }

    const bytes = Buffer.from(file.data, "base64");
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "Content-Length": String(bytes.length),
        "Content-Disposition": `inline; filename="${encodeURIComponent(file.name)}"`,
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch file: ${message}` },
      { status: 500 }
    );
  }
}