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
          message: preCheck.reason || "Too many login attempts.",
          code: "RATE_LIMITED",
          lockoutMinutes: preCheck.lockoutMinutes,
        },
        { status: 429 }
      );
    }

    // Step 1: Find user by email (handles returning students, admin, teacher)
    let user = await db.user.findFirst({
      where: { email: sanitizedEmail },
    });

    // Step 2: If no user found, try student regNo lookup
    if (!user) {
      const tenantId = request.headers.get("x-tenant-id");
      const trimmedReg = sanitizedEmail.trim();

      // Try 3 variations: exact, lowercase, uppercase
      let student = await db.student.findFirst({
        where: { regNo: trimmedReg },
      });

      if (!student) {
        student = await db.student.findFirst({
          where: { regNo: trimmedReg.toLowerCase() },
        });
      }

      if (!student) {
        student = await db.student.findFirst({
          where: { regNo: trimmedReg.toUpperCase() },
        });
      }

      console.log("[LOGIN DEBUG] Looking for student with regNo:", trimmedReg, "| Found:", student?.id || "NOT FOUND");

      if (student) {
        // Look for existing User linked to this student
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
          // AUTO-CREATE User on first login
          const defaultPassword = student.regNo.toLowerCase();

          if (sanitizedPassword.toLowerCase() === defaultPassword.toLowerCase()) {
            user = await db.user.create({
              data: {
                email: student.regNo,
                username: student.fullname || `Student-${student.regNo}`,
                password: defaultPassword,
                role: "STUDENT",
                studentId: student.id,
                tenantId: student.tenantId,
                imageUrl: student.imageUrl || undefined,
              },
            });
            console.log("[LOGIN DEBUG] Auto-created user for student:", student.regNo);
          } else {
            console.log("[LOGIN DEBUG] Wrong password for student:", student.regNo, "| typed:", sanitizedPassword, "| expected:", defaultPassword);
            await loginSecurity.onFailed("User not found (no account)");
            return NextResponse.json(
              {
                success: false,
                message: "No login account found for this student. Please contact your school admin.",
                code: "NO_USER_ACCOUNT",
              },
              { status: 401 }
            );
          }
        }
      } else {
        console.log("[LOGIN DEBUG] No student found for:", trimmedReg);
      }
    }

    if (!user) {
      await loginSecurity.onFailed("User not found");
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Password check
    if (user.password.toLowerCase() !== sanitizedPassword.toLowerCase()) {
      // For student users: fallback to default password (regNo) and auto-fix
      if (user.studentId) {
        const student = await db.student.findUnique({
          where: { id: user.studentId },
        });
        if (student) {
          const defaultPw = student.regNo.toLowerCase();
          if (sanitizedPassword.toLowerCase() === defaultPw) {
            // Update stored password to match the default
            await db.user.update({
              where: { id: user.id },
              data: { password: defaultPw, role: "STUDENT" },
            });
            // Continue to login (don't return error)
          } else {
            console.log("[LOGIN DEBUG] Student password mismatch. Stored:", user.password, "| Typed:", sanitizedPassword, "| Default would be:", defaultPw);
            await loginSecurity.onFailed("Invalid password");
            return NextResponse.json(
              { success: false, message: "Invalid email or password" },
              { status: 401 }
            );
          }
        } else {
          await loginSecurity.onFailed("Invalid password");
          return NextResponse.json(
            { success: false, message: "Invalid email or password" },
            { status: 401 }
          );
        }
      } else {
        console.log("[LOGIN DEBUG] Password mismatch for user:", user.email);
        await loginSecurity.onFailed("Invalid password");
        return NextResponse.json(
          { success: false, message: "Invalid email or password" },
          { status: 401 }
        );
      }
    }

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
        { success: false, message: tenant.rejectionReason || "Registration rejected.", code: "TENANT_REJECTED" },
        { status: 403 }
      );
    }

    if (tenant.status === "suspended") {
      return NextResponse.json(
        { success: false, message: "School account suspended.", code: "TENANT_SUSPENDED" },
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
    console.error("[LOGIN ERROR]", error);
    return NextResponse.json(
      { success: false, message: `Login failed: ${message}` },
      { status: 500 }
    );
  }
}