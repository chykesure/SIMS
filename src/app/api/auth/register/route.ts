import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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

    // Determine plan tier based on estimated student count
    const studentNum = Number(estimatedStudents) || 0;
    let plan = "basic";
    let maxStudents = 50;
    let maxUsers = 3;
    if (studentNum <= 50) {
      plan = "basic";
      maxStudents = 50;
      maxUsers = 3;
    } else if (studentNum <= 200) {
      plan = "intermediate";
      maxStudents = 200;
      maxUsers = 15;
    } else if (studentNum <= 500) {
      plan = "premium";
      maxStudents = 500;
      maxUsers = 100;
    } else {
      plan = "growth";
      maxStudents = 999999;
      maxUsers = 999999;
    }

    console.log("[REGISTER] Determined plan:", { plan, maxStudents, maxUsers, studentNum });

    // Create tenant with status "pending" — requires developer approval
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
        details: `School "${schoolName}" registered by ${adminName} (${adminEmail})`,
      },
    });

    // Registration successful but school is PENDING approval
    // Do NOT auto-login — return tenant data for the pending page
    return NextResponse.json(
      {
        success: true,
        message: "Registration successful! Your school account is pending approval.",
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
