import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("id");

    if (!schoolId) {
      return NextResponse.json(
        { success: false, message: "School ID is required" },
        { status: 400 }
      );
    }

    const tenant = await db.tenant.findUnique({
      where: { id: schoolId },
      include: {
        _count: {
          select: {
            users: true,
            students: true,
            teachers: true,
            classes: true,
            subjects: true,
            sessions: true,
            examScores: true,
            studentRecords: true,
            activityLogs: true,
            admissionRecords: true,
            loginHistories: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, message: "School not found" },
        { status: 404 }
      );
    }

    // Fetch recent activity for this school
    const recentActivity = await db.activityLog.findMany({
      where: { tenantId: schoolId },
      orderBy: { createdAt: "desc" },
      take: 15,
    });

    // Fetch users for this school
    const users = await db.user.findMany({
      where: { tenantId: schoolId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        imageUrl: true,
        createdAt: true,
      },
    });

    // Fetch classes for this school
    const classes = await db.class.findMany({
      where: { tenantId: schoolId },
      orderBy: { title: "asc" },
    });

    // Fetch sessions for this school
    const sessions = await db.session.findMany({
      where: { tenantId: schoolId },
      orderBy: { createdAt: "desc" },
    });

    // Fetch recent student records (latest computed results)
    const recentRecords = await db.studentRecord.findMany({
      where: { tenantId: schoolId },
      orderBy: { createdAt: "desc" },
      take: 10,
      distinct: ["fullname"],
    });

    // Fetch recent admission records
    const recentAdmissions = await db.admissionRecord.findMany({
      where: { tenantId: schoolId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      school: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        logo: tenant.logo,
        motto: tenant.motto,
        primaryColor: tenant.primaryColor,
        email: tenant.email,
        phone: tenant.phone,
        state: tenant.state,
        country: tenant.country,
        address: tenant.address,
        website: tenant.website,
        status: tenant.status,
        plan: tenant.plan,
        maxStudents: tenant.maxStudents,
        maxUsers: tenant.maxUsers,
        planStart: tenant.planStart,
        planEnd: tenant.planEnd,
        rejectionReason: tenant.rejectionReason,
        isActive: tenant.isActive,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
        ...tenant._count,
      },
      users,
      classes,
      sessions,
      recentActivity,
      recentRecords,
      recentAdmissions,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, message: `Failed to fetch school details: ${message}` },
      { status: 500 }
    );
  }
}
