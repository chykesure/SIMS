import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

// ── Auto-generate RegNo ──
// Format: ABBR/SESSION/0001 (e.g. TKA/2025-2026/0001)
async function generateRegNo(tenantId: string): Promise<string> {
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  const schoolName = tenant?.name || "SCH";
  const skipWords = ["of", "the", "and", "for", "in", "on", "at", "to", "a", "an"];
  const abbr = schoolName
    .split(/\s+/)
    .filter((w) => !skipWords.includes(w.toLowerCase()))
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 3) || "SCH";

  // Get active session from Session table
  const activeSession = await db.session.findFirst({
    where: { tenantId, active: "Yes" },
  });

  // Fallback to Resumption table, then current year
  const session = activeSession
    ? `${activeSession.sessionOne}/${activeSession.sessionTwo}`
    : await db.resumption.findFirst({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
      }).then((r) => r?.session || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);

  const count = await db.student.count({ where: { tenantId } });
  const nextNum = count + 1;
  const padded = String(nextNum).padStart(4, "0");

  const regNo = `${abbr}/${session}/${padded}`;

  const existing = await db.student.findFirst({
    where: { tenantId, regNo },
  });
  if (existing) {
    let attempt = nextNum + 1;
    while (attempt < nextNum + 100) {
      const candidate = `${abbr}/${session}/${String(attempt).padStart(4, "0")}`;
      const taken = await db.student.findFirst({
        where: { tenantId, regNo: candidate },
      });
      if (!taken) return candidate;
      attempt++;
    }
    return `${abbr}/${session}/${padded}-${Date.now().toString(36)}`;
  }

  return regNo;
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
    const { fullname, gender, dateOfBirth, class: studentClass, classRef, basic, department, parentNo, stateOfOrigin, lga, homeAddress, imageUrl } = body;

    if (!fullname || !studentClass) {
      return NextResponse.json(
        { success: false, message: "Fullname and class are required" },
        { status: 400 }
      );
    }

    // ─── Check for active session ───
    const activeSession = await db.session.findFirst({
      where: { tenantId, active: "Yes" },
    });

    if (!activeSession) {
      return NextResponse.json(
        {
          success: false,
          message: "No active academic session found. Please set an active session before adding students.",
          code: "NO_ACTIVE_SESSION",
        },
        { status: 400 }
      );
    }

    // ─── Check for duplicate student (same fullname + class in same tenant) ───
    const duplicate = await db.student.findFirst({
      where: { tenantId, fullname, class: studentClass },
    });
    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message: `A student named "${fullname}" already exists in class "${studentClass}". Duplicate entries are not allowed.`,
          code: "DUPLICATE_STUDENT",
        },
        { status: 409 }
      );
    }

    const regNo = await generateRegNo(tenantId);

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

    const defaultPassword = regNo.replace(/[/\\s]/g, "").toLowerCase();
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    const existingUser = await db.user.findFirst({
      where: { tenantId, email: regNo },
    });

    if (!existingUser) {
      await db.user.create({
        data: {
          tenantId,
          email: regNo,
          username: fullname,
          password: hashedPassword,
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

    // If fullname or class is being changed, check for duplicates (excluding current student)
    if (data.fullname || data.class) {
      const newFullname = data.fullname || existing.fullname;
      const newClass = data.class || existing.class;
      const duplicate = await db.student.findFirst({
        where: {
          tenantId,
          fullname: newFullname,
          class: newClass,
          id: { not: id },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            message: `A student named "${newFullname}" already exists in class "${newClass}". Duplicate entries are not allowed.`,
            code: "DUPLICATE_STUDENT",
          },
          { status: 409 }
        );
      }
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

    // Sync imageUrl to User table so report cards and portal pick it up
    if (data.imageUrl !== undefined) {
      await db.user.updateMany({
        where: { studentId: id, tenantId },
        data: { imageUrl: data.imageUrl },
      }).catch(() => { /* silent — user record may not exist */ });
    }

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

    await db.user.deleteMany({ where: { studentId: id, tenantId } });
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