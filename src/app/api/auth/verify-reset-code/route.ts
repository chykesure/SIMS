import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/auth/verify-reset-code — Verify the 6-digit code and set new password
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, resetCode, newPassword } = body;

    if (!email || !resetCode || !newPassword) {
      return NextResponse.json(
        { success: false, message: "Email, reset code, and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: "New password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedCode = resetCode.trim();

    // Find the user by recovery email first, then fallback to login email
    let user = await db.user.findFirst({
      where: { recoveryEmail: sanitizedEmail },
    });

    if (!user) {
      // Fallback: search by login email
      user = await db.user.findFirst({
        where: { email: sanitizedEmail },
      });
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: "No account found with that email address" },
        { status: 404 }
      );
    }

    // Check if a reset code exists
    if (!user.resetCode || !user.resetCodeExpiry) {
      return NextResponse.json(
        { success: false, message: "No active password reset request. Please request a new code." },
        { status: 400 }
      );
    }

    // Check if the code has expired
    if (new Date() > user.resetCodeExpiry) {
      // Clear the expired code
      await db.user.update({
        where: { id: user.id },
        data: { resetCode: null, resetCodeExpiry: null },
      });
      return NextResponse.json(
        { success: false, message: "Reset code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Verify the code (case-insensitive)
    if (user.resetCode !== sanitizedCode) {
      return NextResponse.json(
        { success: false, message: "Invalid reset code. Please check and try again." },
        { status: 401 }
      );
    }

    // Update the password and clear the reset code
    await db.user.update({
      where: { id: user.id },
      data: {
        password: newPassword,
        resetCode: null,
        resetCodeExpiry: null,
      },
    });

    console.log(
      `[VerifyResetCode] Password reset successfully for ${user.email} (${user.role})`
    );

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully. You can now sign in with your new password.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("[VerifyResetCode] Error:", error);
    return NextResponse.json(
      { success: false, message: `Failed to reset password: ${message}` },
      { status: 500 }
    );
  }
}