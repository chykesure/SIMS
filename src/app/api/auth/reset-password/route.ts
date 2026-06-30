import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

// POST /api/auth/reset-password - Admin resets a user's password
export async function POST(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const { userId, newPassword, adminUserId } = body;

    if (!userId || !newPassword) {
      return NextResponse.json(
        { success: false, message: "User ID and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: "New password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Verify the requesting user has Admin or Staff role
    if (adminUserId) {
      const admin = await db.user.findFirst({
        where: { id: adminUserId, tenantId },
      });

      if (!admin || (admin.role !== "Admin" && admin.role !== "Staff" && admin.role !== "SuperAdmin")) {
        return NextResponse.json(
          { success: false, message: "Unauthorized. Only Admin or Staff can reset passwords." },
          { status: 403 }
        );
      }
    }

    // Find the target user
    const targetUser = await db.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Update password
    await db.user.update({
      where: { id: userId },
      data: { password: newPassword },
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to reset password: ${message}` },
      { status: 500 }
    );
  }
}
