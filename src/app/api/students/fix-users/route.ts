import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const tenantId = request.headers.get("x-tenant-id");

    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID required" },
        { status: 400 }
      );
    }

    // Get all students in this tenant
    const allStudents = await db.student.findMany({
      where: { tenantId },
      select: {
        id: true,
        regNo: true,
        fullname: true,
        imageUrl: true,
        tenantId: true,
      },
    });

    if (allStudents.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No students found",
        created: 0,
      });
    }

    // Get all User records that are linked to students in this tenant
    const existingUsers = await db.user.findMany({
      where: {
        tenantId,
        studentId: { not: null },
      },
      select: { studentId: true },
    });

    // Build a set of student IDs that already have User accounts
    const existingStudentIds = new Set(
      existingUsers.map((u) => u.studentId)
    );

    // Filter to only students WITHOUT a User account
    const studentsWithoutUsers = allStudents.filter(
      (s) => !existingStudentIds.has(s.id)
    );

    if (studentsWithoutUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All students already have login accounts",
        created: 0,
      });
    }

    // Batch create User accounts for all missing students
    const results = await Promise.all(
      studentsWithoutUsers.map((student) => {
        const defaultPassword = student.regNo.toLowerCase();

        return db.user.create({
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
      })
    );

    return NextResponse.json({
      success: true,
      message: `Created ${results.length} login accounts for students`,
      created: results.length,
      students: studentsWithoutUsers.map((s) => ({
        regNo: s.regNo,
        fullname: s.fullname,
      })),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fix student users: ${message}` },
      { status: 500 }
    );
  }
}