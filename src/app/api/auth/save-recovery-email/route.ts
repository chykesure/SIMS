import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, tenantId, recoveryEmail } = body;

    if (!userId?.trim()) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    const trimmed = recoveryEmail?.trim() || "";
    if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return NextResponse.json(
        { success: false, message: "Invalid email format" },
        { status: 400 }
      );
    }

    // If impersonating, resolve to the real admin user
    let targetUserId = userId;
    if (userId === "impersonated-admin" && tenantId) {
      const admin = await db.user.findFirst({
        where: { tenantId, role: "Admin" },
        select: { id: true },
      });
      if (admin) {
        targetUserId = admin.id;
      } else {
        return NextResponse.json(
          { success: false, message: "No admin user exists for this school yet." },
          { status: 404 }
        );
      }
    }

    const existing = await db.user.findUnique({ where: { id: targetUserId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    await db.user.update({
      where: { id: targetUserId },
      data: { recoveryEmail: trimmed || null },
    });

    return NextResponse.json({
      success: true,
      message: "Recovery email updated successfully",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to save recovery email: ${message}` },
      { status: 500 }
    );
  }
}