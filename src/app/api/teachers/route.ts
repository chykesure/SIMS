import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: NextRequest): string {
  return request.headers.get("x-tenant-id") || "";
}

export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";

    const where: Record<string, unknown> = { tenantId };
    if (q) {
      where.OR = [
        { fullname: { contains: q } },
        { subject: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
      ];
    }

    const teachers = await db.teacher.findMany({
      where,
      orderBy: { fullname: "asc" },
    });

    return NextResponse.json(
      { success: true, data: teachers },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch teachers: ${message}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const { fullname, subject, gender, phone, email, address } = body;

    if (!fullname?.trim()) {
      return NextResponse.json(
        { success: false, message: "Fullname is required" },
        { status: 400 }
      );
    }

    // Generate email if not provided
    let teacherEmail = email?.trim() || "";
    if (!teacherEmail) {
      const nameParts = fullname.trim().toLowerCase().split(" ");
      const first = nameParts[0] || "teacher";
      const last = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
      teacherEmail = last ? `${first}.${last}@school.sims.ng` : `${first}@school.sims.ng`;
    }

    const teacher = await db.teacher.create({
      data: {
        tenantId,
        fullname: fullname.trim(),
        subject: subject?.trim() || "",
        gender: gender?.trim() || "",
        phone: phone?.trim() || "",
        email: teacherEmail,
        address: address?.trim() || "",
        active: "Yes",
        imageUrl: "",
      },
    });

    // Auto-create User login account for the teacher
    const defaultPassword = "teacher123";
    const existingUser = await db.user.findFirst({
      where: { tenantId, email: teacherEmail },
    });

    if (!existingUser) {
      await db.user.create({
        data: {
          tenantId,
          email: teacherEmail,
          username: fullname.trim(),
          password: defaultPassword,
          role: "Teacher",
          teacherId: teacher.id,
          imageUrl: "",
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Teacher created successfully",
        data: teacher,
        credentials: {
          loginId: teacherEmail,
          defaultPassword,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to create teacher: ${message}` },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const { id, fullname, subject, gender, phone, email, address, active } = body;

    if (!id?.trim()) {
      return NextResponse.json(
        { success: false, message: "Teacher ID is required" },
        { status: 400 }
      );
    }

    const existing = await db.teacher.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Teacher not found" },
        { status: 404 }
      );
    }

    const teacher = await db.teacher.update({
      where: { id },
      data: {
        fullname: fullname?.trim() ?? existing.fullname,
        subject: subject?.trim() ?? existing.subject,
        gender: gender?.trim() ?? existing.gender,
        phone: phone?.trim() ?? existing.phone,
        email: email?.trim() ?? existing.email,
        address: address?.trim() ?? existing.address,
        active: active ?? existing.active,
      },
    });

    return NextResponse.json(
      { success: true, message: "Teacher updated successfully", data: teacher },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to update teacher: ${message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim();

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Teacher ID is required" },
        { status: 400 }
      );
    }

    const existing = await db.teacher.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Teacher not found" },
        { status: 404 }
      );
    }

    // Delete associated User account
    await db.user.deleteMany({ where: { teacherId: id, tenantId } });

    await db.teacher.delete({ where: { id } });

    return NextResponse.json(
      { success: true, message: "Teacher deleted successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to delete teacher: ${message}` },
      { status: 500 }
    );
  }
}
