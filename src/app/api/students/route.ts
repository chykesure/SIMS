import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const { searchParams } = new URL(request.url);
    const classFilter = searchParams.get("class");
    const q = searchParams.get("q")?.trim() || "";

    const where: Record<string, unknown> = { tenantId };
    if (classFilter) {
      where.class = { equals: classFilter };
    }
    if (q) {
      where.OR = [
        { fullname: { contains: q } },
        { regNo: { contains: q } },
        { gender: { contains: q } },
        { class: { contains: q } },
      ];
    }

    const students = await db.student.findMany({
      where,
      orderBy: { fullname: "asc" },
    });

    return NextResponse.json(students);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch students: ${message}` },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const { regNo, fullname, gender, dateOfBirth, class: studentClass, classRef, basic, department, parentNo, stateOfOrigin, lga, homeAddress, imageUrl } = body;

    if (!regNo || !fullname || !studentClass) {
      return NextResponse.json(
        { success: false, message: "Reg number, fullname and class are required" },
        { status: 400 }
      );
    }

    const existing = await db.student.findFirst({ where: { tenantId, regNo } });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Student with this reg number already exists" },
        { status: 409 }
      );
    }

    // Check plan limit for students
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    if (tenant) {
      const studentCount = await db.student.count({ where: { tenantId } });
      if (studentCount >= tenant.maxStudents) {
        return NextResponse.json(
          {
            success: false,
            message: `Student limit reached (${tenant.maxStudents}). Upgrade your plan to add more students.`,
            code: "PLAN_LIMIT",
          },
          { status: 403 }
        );
      }
    }

    const student = await db.student.create({
      data: {
        tenantId,
        regNo,
        fullname,
        gender: gender || "",
        dateOfBirth: dateOfBirth || "",
        class: studentClass,
        classRef: classRef || "",
        basic: basic || "",
        department: department || "",
        parentNo: parentNo || "",
        stateOfOrigin: stateOfOrigin || "",
        lga: lga || "",
        homeAddress: homeAddress || "",
        imageUrl: imageUrl || "",
      },
    });

    // Auto-create User login account for the student
    const defaultPassword = regNo.toLowerCase();
    const existingUser = await db.user.findFirst({
      where: { tenantId, email: regNo },
    });

    if (!existingUser) {
      await db.user.create({
        data: {
          tenantId,
          email: regNo,
          username: fullname,
          password: defaultPassword,
          role: "Student",
          studentId: student.id,
          imageUrl: imageUrl || "",
        },
      });
    }

    return NextResponse.json(
      {
        ...student,
        credentials: {
          loginId: regNo,
          defaultPassword,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to create student: ${message}` },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Student id is required" },
        { status: 400 }
      );
    }

    const existing = await db.student.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 }
      );
    }

    const student = await db.student.update({
      where: { id },
      data: {
        fullname: data.fullname,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth,
        class: data.class,
        classRef: data.classRef,
        basic: data.basic,
        department: data.department,
        parentNo: data.parentNo,
        stateOfOrigin: data.stateOfOrigin,
        lga: data.lga,
        homeAddress: data.homeAddress,
        imageUrl: data.imageUrl,
      },
    });

    return NextResponse.json(student);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to update student: ${message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Student id is required" },
        { status: 400 }
      );
    }

    const existing = await db.student.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 }
      );
    }

    // Delete associated User account
    await db.user.deleteMany({ where: { studentId: id, tenantId } });

    // Delete associated ParentStudent links
    await db.parentStudent.deleteMany({ where: { studentId: id, tenantId } });

    await db.student.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Student deleted" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to delete student: ${message}` },
      { status: 500 }
    );
  }
}
