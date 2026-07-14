import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId")?.trim();
    const tenantId = searchParams.get("tenantId")?.trim();

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    // If impersonating, resolve to the real admin user
    let targetUserId = userId;
    if (userId === "impersonated-admin" && tenantId) {
      const admin = await db.user.findFirst({
        where: { tenantId, role: "Admin" },
        select: { id: true, recoveryEmail: true },
      });
      if (admin) {
        return NextResponse.json({
          success: true,
          recoveryEmail: admin.recoveryEmail || "",
        });
      }
      return NextResponse.json({ success: true, recoveryEmail: "" });
    }

    const user = await db.user.findUnique({
      where: { id: targetUserId },
      select: { recoveryEmail: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      recoveryEmail: user.recoveryEmail || "",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch recovery email: ${message}` },
      { status: 500 }
    );
  }
}