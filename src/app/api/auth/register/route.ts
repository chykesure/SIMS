import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail, buildRegistrationEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { school, admin } = body;

    // Support both formats: nested { school, admin } and flat fields
    const schoolName = school?.name || body.schoolName;
    const schoolMotto = school?.motto || body.schoolMotto || "";
    const schoolAddress = school?.address || body.schoolAddress || "";
    const schoolPhone = school?.phone || body.schoolPhone || "";
    const schoolEmail = school?.email || body.schoolEmail || "";
    const schoolState = school?.state || body.schoolState || "";
    const schoolLogo = school?.logo || body.schoolLogo || "";
    const estimatedStudents = school?.studentCount || body.studentCount || body.estimatedStudents || 0;
    const adminName = admin?.name || body.adminName;
    const adminEmail = admin?.email || body.adminEmail;
    const adminPassword = admin?.password || body.adminPassword;

    // Validate required fields
    if (!schoolName || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "School name, admin name, admin email, and admin password are required",
        },
        { status: 400 }
      );
    }

    if (adminPassword.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must be at least 6 characters long",
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid email address",
        },
        { status: 400 }
      );
    }

    // Check if school email is already used by another tenant
    if (schoolEmail && emailRegex.test(schoolEmail)) {
      const existingEmail = await db.tenant.findFirst({
        where: { email: schoolEmail },
      });
      if (existingEmail) {
        return NextResponse.json(
          {
            success: false,
            message: "A school with this email is already registered. Please contact support.",
          },
          { status: 409 }
        );
      }
    }

    // Check if admin email is already used
    const existingUser = await db.user.findFirst({
      where: { email: adminEmail },
    });
    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "This email is already registered. Please use a different email or contact support.",
        },
        { status: 409 }
      );
    }

    // Generate slug from school name
    let slug = schoolName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          message: "School name must contain valid characters",
        },
        { status: 400 }
      );
    }

    // Check if slug already exists, if so append a random number
    const existingSlug = await db.tenant.findUnique({
      where: { slug },
    });

    if (existingSlug) {
      const randomNum = Math.floor(Math.random() * 9000) + 1000;
      slug = `${slug}-${randomNum}`;

      const existingSlug2 = await db.tenant.findUnique({
        where: { slug },
      });
      if (existingSlug2) {
        slug = `${slug}-${Math.floor(Math.random() * 9000) + 1000}`;
      }
    }

    // ─── Determine plan tier from DB plans (not hardcoded) ─────────────
    const studentNum = Number(estimatedStudents) || 0;
    let plan = "basic";
    let maxStudents = 50;
    let maxUsers = 3;

    try {
      const dbPlans = await db.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      });

      if (dbPlans.length > 0) {
        // Find the smallest plan that fits the student count
        const fittingPlan = dbPlans
          .filter((p) => studentNum <= p.maxStudents)
          .sort((a, b) => a.maxStudents - b.maxStudents)[0];

        if (fittingPlan) {
          plan = fittingPlan.planKey;
          maxStudents = fittingPlan.maxStudents;
          maxUsers = fittingPlan.maxUsers;
        } else {
          // Student count exceeds all plans — pick the largest
          const largest = dbPlans[dbPlans.length - 1];
          plan = largest.planKey;
          maxStudents = largest.maxStudents;
          maxUsers = largest.maxUsers;
        }
      }
      // If no plans in DB, keep defaults
    } catch {
      // Fallback to default logic if DB read fails
      if (studentNum <= 50) {
        plan = "basic"; maxStudents = 50; maxUsers = 3;
      } else if (studentNum <= 200) {
        plan = "intermediate"; maxStudents = 200; maxUsers = 15;
      } else if (studentNum <= 500) {
        plan = "premium"; maxStudents = 500; maxUsers = 100;
      } else {
        plan = "growth"; maxStudents = 999999; maxUsers = 999999;
      }
    }

    console.log("[REGISTER] Determined plan:", { plan, maxStudents, maxUsers, studentNum });

    // Create tenant with status "pending" — requires cloud engineer approval
    const tenant = await db.tenant.create({
      data: {
        name: schoolName,
        slug,
        logo: schoolLogo,
        motto: schoolMotto,
        primaryColor: "#821329",
        address: schoolAddress,
        phone: schoolPhone,
        state: schoolState,
        email: schoolEmail,
        status: "pending",
        plan,
        maxStudents,
        maxUsers,
      },
    });

    // Create admin user
    const user = await db.user.create({
      data: {
        tenantId: tenant.id,
        email: adminEmail,
        password: adminPassword,
        username: adminName,
        role: "Admin",
        imageUrl: "",
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        tenantId: tenant.id,
        action: "school_registered",
        details: `School "${schoolName}" registered by ${adminName} (${adminEmail}) — ${plan} plan, awaiting payment approval`,
      },
    });

    // ─── Send registration email (fire-and-forget, don't block response) ─
    const emailHtml = buildRegistrationEmail({
      schoolName,
      adminName,
      adminEmail,
      plan,
    });

    // Send to both school email (if provided) and admin email
    const emailRecipients = [adminEmail];
    if (schoolEmail && schoolEmail !== adminEmail) {
      emailRecipients.push(schoolEmail);
    }

    // Fire emails without blocking the response
    Promise.all(
      emailRecipients.map((recipient) =>
        sendEmail({
          to: recipient,
          subject: `Welcome to SchoolDesk — ${schoolName} Registration Received`,
          html: emailHtml,
        })
      )
    ).then((results) => {
      const sent = results.filter(Boolean).length;
      console.log(`[REGISTER] Sent ${sent}/${emailRecipients.length} registration emails`);
    });

    // Registration successful but school is PENDING payment approval
    return NextResponse.json(
      {
        success: true,
        message: "Registration successful! Your payment is pending Cloud Engineer approval for Security & Cloud Storage.",
        requiresApproval: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          imageUrl: user.imageUrl,
          tenantId: user.tenantId,
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
          status: tenant.status,
          plan: tenant.plan,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      {
        success: false,
        message: `Registration failed: ${message}`,
      },
      { status: 500 }
    );
  }
}