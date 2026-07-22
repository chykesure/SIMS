import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  createLoginSecurityCheck,
  sanitizeInput,
} from "@/lib/security";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email, "email");
    const sanitizedPassword = sanitizeInput(password, "password");

    if (!sanitizedEmail || !sanitizedPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Email and password are required",
        },
        { status: 400 }
      );
    }

    // ---- Security: Create login security check ----
    const loginSecurity = createLoginSecurityCheck(sanitizedEmail, request);

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

    // Find user by email (also support regNo for student login)
    let user = await db.user.findFirst({
      where: { email: sanitizedEmail },
    });

    // If not found by email, try looking up a student by regNo (case-insensitive)
    // If not found by email, try looking up a student by regNo and match their user
    if (!user) {
      const tenantId = request.headers.get("x-tenant-id");

      // SQLite doesn't support mode: "insensitive", so fetch all and filter in JS
      const allStudents = tenantId
        ? await db.student.findMany({ where: { tenantId } })
        : await db.student.findMany();

      const student = allStudents.find(
        (s) => s.regNo.toLowerCase() === sanitizedEmail.toLowerCase()
      );

      if (student) {
        // Look for an existing User linked to this student
        const existingUser = tenantId
          ? await db.user.findFirst({
            where: { studentId: student.id, tenantId },
          })
          : await db.user.findFirst({
            where: { studentId: student.id },
          });

        if (existingUser) {
          user = existingUser;
        } else {
          // 🔥 AUTO-CREATE: If student exists but no User account, create one
          const defaultPassword = student.regNo.toLowerCase();

          // Only auto-create if the password matches the default (case-insensitive)
          if (sanitizedPassword.toLowerCase() === defaultPassword.toLowerCase()) {
            user = await db.user.create({
              data: {
                email: sanitizedEmail,
                username: student.fullname || `Student-${student.regNo}`,
                password: defaultPassword,
                role: "STUDENT",
                studentId: student.id,
                tenantId: student.tenantId,
                imageUrl: student.imageUrl || undefined,
              },
            });
          } else {
            // Student exists, User doesn't exist yet — wrong password
            await loginSecurity.onFailed("User not found (no account)");

            return NextResponse.json(
              {
                success: false,
                message: "No login account found for this student. Please contact your school admin to create your login credentials.",
                code: "NO_USER_ACCOUNT",
              },
              { status: 401 }
            );
          }
        }
      }
    }

    if (!user) {
      // ---- Security: Log failed attempt ----
      await loginSecurity.onFailed("User not found");

      return NextResponse.json(
        {
          success: false,
          message: "No account found with this email or registration number. Please double-check and try again.",
          code: "USER_NOT_FOUND",
        },
        { status: 401 }
      );
    }

    // Plain text password comparison (for demo with SQLite)
    // Case-insensitive for student accounts (regNo passwords)
    if (user.role === "STUDENT") {
      if (user.password.toLowerCase() !== sanitizedPassword.toLowerCase()) {
        await loginSecurity.onFailed("Invalid password");
        return NextResponse.json(
          { success: false, message: "The password you entered is incorrect. Please check your password and try again.", code: "INVALID_PASSWORD" },
          { status: 401 }
        );
      }
    } else if (user.password !== sanitizedPassword) {
      await loginSecurity.onFailed("Invalid password");
      return NextResponse.json(
        { success: false, message: "The password you entered is incorrect. Please check your password and try again.", code: "INVALID_PASSWORD" },
        { status: 401 }
      );
    }

    // Fetch tenant info
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
    });

    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          message: "Tenant not found",
          code: "SERVER_ERROR",
        },
        { status: 500 }
      );
    }

    // CHECK TENANT STATUS — Block login if not approved
    if (tenant.status === "pending") {
      return NextResponse.json(
        {
          success: false,
          message: "Your school account is still pending approval. Please wait for the administrator to review and approve your registration.",
          code: "TENANT_PENDING",
        },
        { status: 403 }
      );
    }

    if (tenant.status === "rejected") {
      return NextResponse.json(
        {
          success: false,
          message: tenant.rejectionReason
            ? `Your school registration was rejected: ${tenant.rejectionReason}`
            : "Your school registration was rejected. Please contact support for more information.",
          code: "TENANT_REJECTED",
        },
        { status: 403 }
      );
    }

    if (tenant.status === "suspended") {
      return NextResponse.json(
        {
          success: false,
          message: "Your school account has been suspended. Please contact the administrator for assistance.",
          code: "TENANT_SUSPENDED",
        },
        { status: 403 }
      );
    }

    // ---- Security: Log successful login ----
    await loginSecurity.onSuccess();

    // Create login history entry
    await db.loginHistory.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        userName: user.username,
        email: user.email,
        imageUrl: user.imageUrl,
        status: "login",
      },
    });

    // Return user data (excluding password) and tenant data
    return NextResponse.json(
      {
        success: true,
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          imageUrl: user.imageUrl,
          tenantId: user.tenantId,
          studentId: user.studentId,
          teacherId: user.teacherId,
          parentId: user.parentId,
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          logo: tenant.logo,
          motto: tenant.motto,
          primaryColor: tenant.primaryColor,
          address: tenant.address,
          phone: tenant.phone,
          email: tenant.email,
          website: tenant.website,
          state: tenant.state,
          status: tenant.status,
          plan: tenant.plan,
          maxStudents: tenant.maxStudents,
          maxUsers: tenant.maxUsers,
          planStart: tenant.planStart,
          planEnd: tenant.planEnd,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Login API error:", error);

    // Detect connectivity / database reachability errors caused by network issues
    const errMsg = error instanceof Error ? error.message.toLowerCase() : "";
    const isNetworkRelated =
      errMsg.includes("econnrefused") ||
      errMsg.includes("enotfound") ||
      errMsg.includes("etimedout") ||
      errMsg.includes("econnreset") ||
      errMsg.includes("socket hang up") ||
      errMsg.includes("can't reach database") ||
      errMsg.includes("unable to connect") ||
      errMsg.includes("fetch failed") ||
      errMsg.includes("network") ||
      errMsg.includes("prisma") ||
      errMsg.includes("sqlite") ||
      errMsg.includes("database");

    return NextResponse.json(
      {
        success: false,
        message: isNetworkRelated
          ? "The server could not process your request due to a network issue. Please check your internet connection and try again."
          : "Something went wrong on our end. Please try again in a few moments. If the problem persists, contact support.",
        code: isNetworkRelated ? "SERVICE_UNAVAILABLE" : "SERVER_ERROR",
      },
      { status: 503 }
    );
  }
}