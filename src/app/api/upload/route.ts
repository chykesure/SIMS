// src/app/api/upload/route.ts
// Generic file upload endpoint (assignment attachments, student photos,
// school logo, ...). Accepts multipart FormData with a "file" field,
// stores the file base64 in the DB and returns its serving URL.
// Response: { success: true, url: "/api/files/<id>" }

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID is required" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "No file provided" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    // Convert to base64 and store in the database
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await db.uploadedFile.create({
      data: {
        tenantId,
        name: file.name || "file",
        type: file.type || "application/octet-stream",
        size: file.size,
        data: buffer.toString("base64"),
      },
    });

    return NextResponse.json({ success: true, url: `/api/files/${uploaded.id}` });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Upload failed: ${message}` },
      { status: 500 }
    );
  }
}