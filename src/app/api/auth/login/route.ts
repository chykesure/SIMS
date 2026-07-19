import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import {
  createLoginSecurityCheck,
  sanitizeInput,
} from "@/lib/security";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    const sanitizedEmail = sanitizeInput(email, "email");
    const sanitizedPassword = sanitizeInput(password, "password");

    if (!sanitizedEmail || !sanitizedPassword) {
      return NextResponse.json(
        { success: false, message: "Email and password are required" },
        { status: 400 }
      );
    }

    const loginSecurity = createLoginSecurityCheck(sanitizedEmail, request);

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

    // Step 1: Try finding User by email first (handles returning students & admin/teacher)
    let user = await db.user.findFirst({
      where: { email: sanitizedEmail },
    });

    // Step 2: If no user found, try student regNo lookup (case-insensitive via raw SQL)
    if (!user) {
      const tenantId = request.headers.get("x-tenant-id");
      const searchRegNo = sanitizedEmail.trim().toUpperCase();

      let studentRow: any = null;

      if (tenantId) {
        const rows = await db.$queryRaw`
          SELECT * FROM "Student" 
          WHERE UPPER(TRIM("regNo")) = ${searchRegNo} AND "tenantId" = ${tenantId} 
          LIMIT 1
        `;
        studentRow = (rows as any[])[0] || null;
      } else {
        const rows = await db.$queryRaw`
          SELECT * FROM "Student" 
          WHERE UPPER(TRIM("regNo")) = ${searchRegNo} 
          LIMIT 1
        `;
        studentRow = (rows as any[])[0] || null;
      }

      if (studentRow) {
        // Look for existing User linked to this student
        const existingUser = tenantId
          ? await db.user.findFirst({
              where: { studentId: studentRow.id, tenantId },
            })
          : await db.user.findFirst({
              where: { studentId: studentRow.id },
            });

        if (existingUser) {
          user = existingUser;
        } else {
          // AUTO-CREATE User account on first login
          const defaultPassword = studentRow.regNo.toLowerCase();

          if (sanitizedPassword.toLowerCase() === defaultPassword.toLowerCase()) {
            user = await db.user.create({
              data: {
                email: studentRow.regNo,
                username: studentRow.fullname || `Student-${studentRow.regNo}`,
                password: defaultPassword,
                role: "STUDENT",
                studentId: studentRow.id,
                tenantId: studentRow.tenantId,
                imageUrl: studentRow.imageUrl || undefined,
              },
            });
          } else {
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
      await loginSecurity.onFailed("User not found");
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Password comparison (case-insensitive)
    if (user.password.toLowerCase() !== sanitizedPassword.toLowerCase()) {
      await loginSecurity.onFailed("Invalid password");
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Fetch tenant
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, message: "Tenant not found" },
        { status: 500 }
      );
    }

    if (tenant.status === "pending") {
      return NextResponse.json(
        { success: false, message: "Your school account is still pending approval.", code: "TENANT_PENDING" },
        { status: 403 }
      );
    }

    if (tenant.status === "rejected") {
      return NextResponse.json(
        { success: false, message: tenant.rejectionReason || "Your school registration was rejected.", code: "TENANT_REJECTED" },
        { status: 403 }
      );
    }

    if (tenant.status === "suspended") {
      return NextResponse.json(
        { success: false, message: "Your school account has been suspended.", code: "TENANT_SUSPENDED" },
        { status: 403 }
      );
    }

    await loginSecurity.onSuccess();

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
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("LOGIN ERROR:", error);
    return NextResponse.json(
      { success: false, message: `Login failed: ${message}` },
      { status: 500 }
    );
  }
}