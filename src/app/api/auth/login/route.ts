import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
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

    // If not found by email, try looking up a student by regNo and match their user
    if (!user) {
      const tenantId = request.headers.get("x-tenant-id");

      // Try to find student by regNo
      const student = tenantId
        ? await db.student.findFirst({
          where: { regNo: sanitizedEmail, tenantId },
        })
        : await db.student.findFirst({
          where: { regNo: sanitizedEmail },
        });

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
          // AUTO-CREATE: If student exists but no User account, create one
          const defaultPassword = student.regNo.replace(/[/\\s]/g, "").toLowerCase();

          // Only auto-create if the password matches the default
          if (sanitizedPassword === defaultPassword) {
            const hashedPassword = await bcrypt.hash(defaultPassword, 10);
            user = await db.user.create({
              data: {
                email: sanitizedEmail,
                username: student.fullname || `Student-${student.regNo}`,
                password: hashedPassword,
                role: "Student",
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

    // ─── Password verification (supports both bcrypt and legacy plain text) ───
    const isStudent = user.role.toLowerCase() === "student";
    let passwordValid = false;

    if (user.password.startsWith("$2")) {
      // bcrypt hash
      if (isStudent) {
        const strippedForm = sanitizedPassword.replace(/[/\\s]/g, "").toLowerCase();
        passwordValid =
          (await bcrypt.compare(sanitizedPassword.toLowerCase(), user.password)) ||
          (await bcrypt.compare(strippedForm, user.password));
      } else {
        passwordValid = await bcrypt.compare(sanitizedPassword, user.password);
      }
    } else {
      // Legacy plain text
      if (isStudent) {
        const strippedForm = sanitizedPassword.replace(/[/\\s]/g, "").toLowerCase();
        passwordValid =
          user.password.toLowerCase() === sanitizedPassword.toLowerCase() ||
          user.password.toLowerCase() === strippedForm;
      } else {
        passwordValid = user.password === sanitizedPassword;
      }
    }

    if (!passwordValid) {
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
        },
        { status: 500 }
      );
    }

    // ⛔ CHECK TENANT STATUS — Block login if not approved
    if (tenant.status === "pending") {
      // ─── Check if tenant has uploaded payment evidence ───────────
      try {
        const evidence = await db.paymentEvidence.findFirst({
          where: { tenantId: tenant.id },
          select: { id: true, status: true },
          orderBy: { createdAt: "desc" },
        });

        if (!evidence) {
          // ─── Fetch plan price so the payment page can show it ────────
          let planPriceNGN = 0;
          let planPriceUSD = 0;
          try {
            const planRow = await db.$queryRawUnsafe<Array<{ priceNGN: number; priceUSD: number }>>(
              `SELECT "priceNGN", "priceUSD" FROM "SubscriptionPlan" WHERE "planKey" = $1 AND "isActive" = true`,
              tenant.plan
            );
            if (planRow.length > 0) {
              planPriceNGN = Number(planRow[0].priceNGN) || 0;
              planPriceUSD = Number(planRow[0].priceUSD) || 0;
            }
          } catch (e) {
            console.error("[LOGIN] Failed to fetch plan price:", e);
          }

          // No evidence uploaded at all — redirect to upload
          return NextResponse.json({
            success: false,
            message: "Your school account is pending payment verification. Please upload your payment receipt to proceed.",
            code: "TENANT_PENDING_NO_EVIDENCE",
            tenantId: tenant.id,
            tenantName: tenant.name,
            tenantEmail: user.email,
            tenantPlan: tenant.plan,
            tenantStatus: tenant.status,
            planPriceNGN,
            planPriceUSD,
            tenantMaxStudents: tenant.maxStudents,
          }, { status: 403 });
        }

        if (evidence.status === "pending") {
          // Evidence uploaded but not yet reviewed
          return NextResponse.json({
            success: false,
            message: "Your payment receipt is being reviewed by our Cloud Engineer. This typically takes 24–48 hours. You will receive a confirmation email once approved.",
            code: "PAYMENT_PENDING_REVIEW",
          }, { status: 403 });
        }

        if (evidence.status === "rejected") {
          return NextResponse.json({
            success: false,
            message: "Your payment evidence was rejected. Please contact support or upload a new receipt.",
            code: "PAYMENT_REJECTED",
          }, { status: 403 });
        }

        // If evidence is verified, activate tenant and let them log in
        if (evidence.status === "verified") {
          await db.tenant.update({
            where: { id: tenant.id },
            data: { status: "active" },
          });
          // Don't return — fall through to the normal login flow below
        } else {
          return NextResponse.json({
            success: false,
            message: "Your school account is still pending approval. Please wait for the administrator to review and approve your registration.",
            code: "TENANT_PENDING",
          }, { status: 403 });
        }
      } catch (evidenceErr) {
        console.error("Evidence check error:", evidenceErr);
        // Fallback to original message if evidence check fails
        return NextResponse.json({
          success: false,
          message: "Your school account is still pending approval. Please wait for the administrator to review and approve your registration.",
          code: "TENANT_PENDING",
        }, { status: 403 });
      }
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

    // ─── Check monthly maintenance dues ───
    // Skip for students and superadmins — only check school admin/teacher/parent
    if (user.role !== "STUDENT" && user.role !== "SUPERADMIN" && tenant.id) {
      try {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Run all queries in parallel instead of sequentially
        const [plan, unpaidDues, paidDuesUnreviewed, paymentMod] = await Promise.all([
          db.subscriptionPlan.findUnique({ where: { planKey: tenant.plan } }).catch(() => null),
          db.monthlyDue.findMany({
            where: {
              tenantId: tenant.id,
              month: { lte: currentMonth },
              status: { in: ["unpaid", "overdue"] },
            },
          }),
          db.monthlyDue.findMany({
            where: {
              tenantId: tenant.id,
              month: { lte: currentMonth },
              status: "paid",
            },
          }).then(dues => dues.filter(d => !d.reviewedBy)),
          import("@/lib/payment-accounts").catch(() => ({ PAYMENT_ACCOUNTS: [] })),
        ]);
        const PAYMENT_ACCOUNTS = paymentMod.PAYMENT_ACCOUNTS;

        const planName = plan?.name || tenant.plan || "Unknown";
        const monthlyAmount = plan?.monthlyDueNGN ?? 0;

        // CASE 1: Evidence uploaded but not yet reviewed — soft block, just inform
        if (unpaidDues.length === 0 && paidDuesUnreviewed.length > 0) {
          const totalPending = paidDuesUnreviewed.reduce((s, d) => s + d.amount, 0);
          return NextResponse.json(
            {
              success: false,
              message: `Your payment evidence for ${paidDuesUnreviewed.length} month(s) totalling ₦${Number(totalPending).toLocaleString()} has been received and is currently being verified by our team. You will regain access once verification is complete. If this takes more than 24 hours, please contact support on WhatsApp: 09133273608.`,
              code: "PAYMENT_PENDING_REVIEW",
              tenantId: user.tenantId,
              tenantName: tenant.name,
              billing: {
                blockType: "pending_review",
                totalPendingReview: totalPending,
                pendingReviewMonths: paidDuesUnreviewed.map(d => d.month),
                planName,
              },
            },
            { status: 403 }
          );
        }

        // CASE 2: Has unpaid months (no evidence uploaded) — show account details page
        if (unpaidDues.length > 0) {
          const totalOwed = unpaidDues.reduce((s, d) => s + d.amount, 0);
          return NextResponse.json(
            {
              success: false,
              message: `Your school has ${unpaidDues.length} outstanding monthly maintenance due(s) totalling ₦${Number(totalOwed).toLocaleString()}. Please make payment and upload your evidence to continue.`,
              code: "MONTHLY_DUE_UNPAID",
              tenantId: user.tenantId,
              tenantName: tenant.name,
              billing: {
                blockType: "unpaid",
                totalOwed,
                unpaidMonths: unpaidDues.map(d => d.month),
                monthlyAmount: unpaidDues[0]?.amount || monthlyAmount,
                planName,
                paymentAccounts: PAYMENT_ACCOUNTS,
                pendingReviewMonths: paidDuesUnreviewed.map(d => d.month),
              },
            },
            { status: 403 }
          );
        }
      } catch {
        // Billing check failed — don't block login
      }
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
    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong on our end. Please try again in a few moments. If the problem persists, contact support.",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}