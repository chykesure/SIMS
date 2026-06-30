import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/dev/change-password - Change SuperAdmin password
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: "Current password and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: "New password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Find the SuperAdmin user
    const superAdmin = await db.user.findFirst({
      where: { role: "SuperAdmin" },
    });

    if (!superAdmin) {
      return NextResponse.json(
        { success: false, message: "SuperAdmin account not found" },
        { status: 404 }
      );
    }

    // Compare plain-text passwords (project stores passwords as plain text)
    if (superAdmin.password !== currentPassword) {
      return NextResponse.json(
        { success: false, message: "Current password is incorrect" },
        { status: 401 }
      );
    }

    // Update the password
    await db.user.update({
      where: { id: superAdmin.id },
      data: { password: newPassword },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        tenantId: superAdmin.tenantId,
        action: "password_changed",
        details: "SuperAdmin password was changed successfully",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to change password: ${message}` },
      { status: 500 }
    );
  }
}
