import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  createLoginSecurityCheck,
  sanitizeInput,
} from "@/lib/security";

// Super Admin credentials — configurable via environment variables
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "admin@schooldesk.com";
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || "schooldesk2024";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email, "email");
    const sanitizedPassword = sanitizeInput(password, "password");

    if (!sanitizedEmail || !sanitizedPassword) {
      return NextResponse.json(
        { success: false, message: "Email and password are required" },
        { status: 400 }
      );
    }

    // ---- Security: Create login security check (platform-level) ----
    const loginSecurity = createLoginSecurityCheck(
      sanitizedEmail,
      request,
      "platform"
    );

    // ---- Security: Pre-check rate limit ----
    const preCheck = loginSecurity.preCheck();
    if (!preCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: preCheck.reason || "Too many login attempts. Please try again later.",
          code: "RATE_LIMITED",
          lockoutMinutes: preCheck.lockoutMinutes,
        },
        { status: 429 }
      );
    }

    // Validate super admin credentials
    if (
      sanitizedEmail !== SUPER_ADMIN_EMAIL ||
      sanitizedPassword !== SUPER_ADMIN_PASSWORD
    ) {
      // ---- Security: Log failed attempt ----
      await loginSecurity.onFailed("Invalid developer credentials");

      return NextResponse.json(
        { success: false, message: "Invalid developer credentials" },
        { status: 401 }
      );
    }

    // ---- Security: Log successful login ----
    await loginSecurity.onSuccess();

    // Create login history entry (system-level)
    await db.securityAuditLog.create({
      data: {
        tenantId: "platform",
        eventType: "login_success",
        severity: "info",
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          request.headers.get("x-real-ip")?.trim() ||
          "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
        email: SUPER_ADMIN_EMAIL,
        details: "Super admin login successful",
        metadata: JSON.stringify({ role: "SuperAdmin" }),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Developer login successful",
        user: {
          id: "super-admin",
          email: SUPER_ADMIN_EMAIL,
          username: "Platform Admin",
          role: "SuperAdmin",
          imageUrl: "",
          tenantId: null,
        },
        tenant: null,
        isSuperAdmin: true,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, message: `Login failed: ${message}` },
      { status: 500 }
    );
  }
}
