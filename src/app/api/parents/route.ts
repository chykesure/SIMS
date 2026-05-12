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
        { email: { contains: q } },
        { phone: { contains: q } },
        { occupation: { contains: q } },
      ];
    }

    const parents = await db.parent.findMany({
      where,
      orderBy: { fullname: "asc" },
      include: {
        students: {
          include: {
            student: {
              select: {
                id: true,
                fullname: true,
                regNo: true,
                class: true,
              },
            },
          },
        },
      },
    });

    // Transform to include student count and student IDs
    const parentData = parents.map((p) => ({
      id: p.id,
      fullname: p.fullname,
      email: p.email,
      phone: p.phone,
      address: p.address,
      occupation: p.occupation,
      imageUrl: p.imageUrl,
      studentCount: p.students.length,
      studentIds: p.students.map((ps) => ps.studentId),
      students: p.students.map((ps) => ({
        id: ps.student.id,
        fullname: ps.student.fullname,
        regNo: ps.student.regNo,
        class: ps.student.class,
      })),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    return NextResponse.json(
      { success: true, data: parentData },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch parents: ${message}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const { fullname, email, phone, address, occupation, studentIds } = body;

    if (!fullname?.trim()) {
      return NextResponse.json(
        { success: false, message: "Fullname is required" },
        { status: 400 }
      );
    }

    if (!email?.trim()) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 }
      );
    }

    // Check if email already exists for a parent in this tenant
    const existingParent = await db.parent.findFirst({
      where: { tenantId, email: email.trim() },
    });
    if (existingParent) {
      return NextResponse.json(
        { success: false, message: "A parent with this email already exists" },
        { status: 409 }
      );
    }

    const parent = await db.parent.create({
      data: {
        tenantId,
        fullname: fullname.trim(),
        email: email.trim(),
        phone: phone?.trim() || "",
        address: address?.trim() || "",
        occupation: occupation?.trim() || "",
        imageUrl: "",
      },
    });

    // Link students if provided
    if (Array.isArray(studentIds) && studentIds.length > 0) {
      for (const studentId of studentIds) {
        // Check if the student exists and belongs to this tenant
        const student = await db.student.findFirst({
          where: { id: studentId, tenantId },
        });
        if (student) {
          // Check if this parent-student link already exists
          const existingLink = await db.parentStudent.findFirst({
            where: { parentId: parent.id, studentId },
          });
          if (!existingLink) {
            await db.parentStudent.create({
              data: {
                tenantId,
                parentId: parent.id,
                studentId,
              },
            });
          }
        }
      }
    }

    // Auto-create User login account for the parent
    const loginId = parent.email;
    const defaultPassword = "parent123";
    const existingUser = await db.user.findFirst({
      where: { tenantId, email: loginId },
    });

    if (!existingUser) {
      await db.user.create({
        data: {
          tenantId,
          email: loginId,
          username: parent.fullname,
          password: defaultPassword,
          role: "Parent",
          parentId: parent.id,
          imageUrl: "",
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Parent created successfully",
        data: {
          parent,
          credentials: {
            loginId,
            defaultPassword,
          },
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to create parent: ${message}` },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const { id, fullname, email, phone, address, occupation, studentIds } = body;

    if (!id?.trim()) {
      return NextResponse.json(
        { success: false, message: "Parent ID is required" },
        { status: 400 }
      );
    }

    const existing = await db.parent.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Parent not found" },
        { status: 404 }
      );
    }

    // Check email uniqueness if changed
    if (email?.trim() && email.trim() !== existing.email) {
      const emailExists = await db.parent.findFirst({
        where: { tenantId, email: email.trim(), id: { not: id } },
      });
      if (emailExists) {
        return NextResponse.json(
          { success: false, message: "A parent with this email already exists" },
          { status: 409 }
        );
      }
    }

    const parent = await db.parent.update({
      where: { id },
      data: {
        fullname: fullname?.trim() ?? existing.fullname,
        email: email?.trim() ?? existing.email,
        phone: phone?.trim() ?? existing.phone,
        address: address?.trim() ?? existing.address,
        occupation: occupation?.trim() ?? existing.occupation,
      },
    });

    // Update student links if studentIds provided
    if (Array.isArray(studentIds)) {
      // Remove all existing links
      await db.parentStudent.deleteMany({
        where: { parentId: id },
      });

      // Re-create links
      for (const studentId of studentIds) {
        const student = await db.student.findFirst({
          where: { id: studentId, tenantId },
        });
        if (student) {
          await db.parentStudent.create({
            data: {
              tenantId,
              parentId: id,
              studentId,
            },
          });
        }
      }
    }

    return NextResponse.json(
      { success: true, message: "Parent updated successfully", data: parent },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to update parent: ${message}` },
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
        { success: false, message: "Parent ID is required" },
        { status: 400 }
      );
    }

    const existing = await db.parent.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Parent not found" },
        { status: 404 }
      );
    }

    // Delete parent-student links first
    await db.parentStudent.deleteMany({ where: { parentId: id } });

    // Delete the parent
    await db.parent.delete({ where: { id } });

    return NextResponse.json(
      { success: true, message: "Parent deleted successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to delete parent: ${message}` },
      { status: 500 }
    );
  }
}
