import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

function generateSchoolInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID is required" },
        { status: 401 }
      );
    }

    // Get tenant info for school initials
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return NextResponse.json(
        { success: false, message: "Tenant not found" },
        { status: 404 }
      );
    }

    const schoolInitials = generateSchoolInitials(tenant.name);

    // Get active session
    const activeSession = await db.session.findFirst({
      where: { tenantId, active: "Yes" },
    });
    const sessionLabel = activeSession
      ? `${activeSession.sessionOne}/${activeSession.sessionTwo}`
      : new Date().getFullYear().toString();

    // Get the last student reg number for this school+session
    // Try slash format first (AGS/2025/2026/0058), fall back to dash format (AGS-2025/2026-001)
    const slashPrefix = `${schoolInitials}/${sessionLabel}/`;
    const dashPrefix = `${schoolInitials}-${sessionLabel}-`;

    const lastStudent = await db.student.findFirst({
      where: {
        tenantId,
        OR: [
          { regNo: { startsWith: slashPrefix } },
          { regNo: { startsWith: dashPrefix } },
        ],
      },
      orderBy: { regNo: "desc" },
    });

    let nextSeqNum = 1;
    if (lastStudent?.regNo) {
      // Extract the last number from either format
      const parts = lastStudent.regNo.split(/[\/-]/);
      const lastNum = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastNum)) {
        nextSeqNum = lastNum + 1;
      }
    }

    // Use slash format: AGS/2025/2026/059
    const regNo = `${slashPrefix}${String(nextSeqNum).padStart(3, "0")}`;

    return NextResponse.json({
      success: true,
      regNo,
      schoolInitials,
      sessionLabel,
      nextSeqNum,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to generate reg number: ${message}` },
      { status: 500 }
    );
  }
}