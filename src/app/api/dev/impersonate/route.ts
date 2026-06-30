import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { schoolId } = body;

    if (!schoolId || typeof schoolId !== "string") {
      return NextResponse.json(
        { success: false, message: "School ID is required" },
        { status: 400 }
      );
    }

    // Find the school/tenant
    const tenant = await db.tenant.findUnique({
      where: { id: schoolId },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, message: "School not found" },
        { status: 404 }
      );
    }

    // Find the first admin user of this school
    const adminUser = await db.user.findFirst({
      where: { tenantId: schoolId, role: "Admin" },
    });

    // If no admin user exists, create a virtual one for impersonation
    const impersonatedUser = adminUser || {
      id: "impersonated-admin",
      email: tenant.email || "admin@impersonated.com",
      username: "Platform Admin",
      role: "Admin",
      imageUrl: "",
      tenantId: tenant.id,
      studentId: null,
      teacherId: null,
      parentId: null,
    };

    // Find the active session for this school
    const activeSession = await db.session.findFirst({
      where: { tenantId: schoolId, active: "Yes" },
    });

    // Log impersonation in security audit
    await db.securityAuditLog.create({
      data: {
        tenantId: "platform",
        eventType: "impersonation_start",
        severity: "warning",
        ipAddress:
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          request.headers.get("x-real-ip")?.trim() ||
          "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
        email: "Platform Admin",
        details: `Impersonating school: ${tenant.name} (${tenant.id})`,
        metadata: JSON.stringify({
          targetTenantId: tenant.id,
          targetSchool: tenant.name,
          impersonatedUser: impersonatedUser.email,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Impersonating ${tenant.name}`,
      user: {
        id: impersonatedUser.id,
        email: impersonatedUser.email,
        username: impersonatedUser.username,
        role: "Admin",
        imageUrl: impersonatedUser.imageUrl || "",
        tenantId: impersonatedUser.tenantId,
        studentId: impersonatedUser.studentId || null,
        teacherId: impersonatedUser.teacherId || null,
        parentId: impersonatedUser.parentId || null,
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
      isImpersonating: true,
      sessionId: activeSession?.id || null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, message: `Impersonation failed: ${message}` },
      { status: 500 }
    );
  }
}