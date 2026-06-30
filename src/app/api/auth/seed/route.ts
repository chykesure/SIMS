import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  try {
    const existingTenants = await db.tenant.count();
    const existingUsers = await db.user.count();
    const existingSubjects = await db.subject.count();
    const existingClasses = await db.class.count();
    const existingSessions = await db.session.count();
    const existingTeacherRemarks = await db.teacherRemark.count();
    const existingPrincipalRemarks = await db.principalRemark.count();

    // --- Create default tenant ---
    let tenantId = "";
    if (existingTenants === 0) {
      const tenant = await db.tenant.create({
        data: {
          name: "Reality High School",
          slug: "reality-high-school",
          motto: "Excellence in Education",
          primaryColor: "#821329",
          address: "Lagos, Nigeria",
          status: "approved",
          plan: "premium",
          maxStudents: 99999,
          maxUsers: 25,
        },
      });
      tenantId = tenant.id;
    } else {
      const firstTenant = await db.tenant.findFirst();
      if (firstTenant) tenantId = firstTenant.id;
    }

    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Failed to create or find tenant" },
        { status: 500 }
      );
    }

    // --- Seed Admin/Staff Users ---
    if (existingUsers === 0) {
      await db.user.createMany({
        data: [
          {
            tenantId,
            email: "admin@reality.com",
            password: "admin123",
            username: "Admin",
            role: "Admin",
            imageUrl: "",
          },
          {
            tenantId,
            email: "staff@reality.com",
            password: "staff123",
            username: "Staff",
            role: "Staff",
            imageUrl: "",
          },
        ],
      });
    }

    // --- Seed Subjects ---
    if (existingSubjects === 0) {
      const subjects = [
        "Mathematics", "English", "Basic Science", "Social Studies",
        "Civic Education", "CRK", "Agricultural Science", "Physical Education",
        "Computer Studies", "Home Economics", "Fine Art", "Business Studies",
        "Yoruba", "French", "Basic Technology",
      ];
      await db.subject.createMany({
        data: subjects.map((name) => ({ tenantId, name })),
      });
    }

    // --- Seed Classes ---
    if (existingClasses === 0) {
      const classes = [
        "JSS1A", "JSS1B", "JSS1C", "JSS2A", "JSS2B", "JSS2C",
        "JSS3A", "JSS3B", "JSS3C", "SSS1A", "SSS1B", "SSS1C",
        "SSS2A", "SSS2B", "SSS2C", "SSS3A", "SSS3B", "SSS3C",
      ];
      await db.class.createMany({
        data: classes.map((title) => ({ tenantId, title })),
      });
    }

    // --- Seed Sessions ---
    if (existingSessions === 0) {
      await db.session.createMany({
        data: [
          { tenantId, sessionOne: "2023", sessionTwo: "2024", active: "Yes" },
          { tenantId, sessionOne: "2024", sessionTwo: "2025", active: "No" },
        ],
      });
    }

    // --- Seed Teacher Remarks ---
    if (existingTeacherRemarks === 0) {
      const remarks = ["Excellent student", "Good performance", "Needs improvement", "Satisfactory", "Outstanding work"];
      await db.teacherRemark.createMany({
        data: remarks.map((remark) => ({ tenantId, remark })),
      });
    }

    // --- Seed Principal Remarks ---
    if (existingPrincipalRemarks === 0) {
      const remarks = ["A well-behaved student", "Keep it up", "More effort required", "Good academic performance"];
      await db.principalRemark.createMany({
        data: remarks.map((remark) => ({ tenantId, remark })),
      });
    }

    // --- Seed Portal Demo Accounts (idempotent) ---
    const studentUser = await db.user.findFirst({ where: { tenantId, role: "Student" } });
    const teacherUser = await db.user.findFirst({ where: { tenantId, role: "Teacher" } });
    const parentUser = await db.user.findFirst({ where: { tenantId, role: "Parent" } });

    if (!studentUser) {
      // Create a demo student
      const student = await db.student.create({
        data: {
          tenantId,
          regNo: "REG-001",
          fullname: "Adebayo Johnson",
          gender: "Male",
          class: "JSS1A",
          classRef: "",
          stateOfOrigin: "Lagos",
          parentNo: "08012345678",
        },
      });

      // Create user account for the student
      await db.user.create({
        data: {
          tenantId,
          email: "REG-001",
          password: "student123",
          username: "Adebayo Johnson",
          role: "Student",
          studentId: student.id,
        },
      });

      // Create demo teacher
      const teacher = await db.teacher.create({
        data: {
          tenantId,
          fullname: "Mrs. Adekoya",
          subject: "Mathematics",
          gender: "Female",
          phone: "08098765432",
          email: "adekoya@reality.com",
        },
      });

      await db.user.create({
        data: {
          tenantId,
          email: "adekoya@reality.com",
          password: "teacher123",
          username: "Mrs. Adekoya",
          role: "Teacher",
          teacherId: teacher.id,
        },
      });

      // Create demo parent
      const parent = await db.parent.create({
        data: {
          tenantId,
          fullname: "Mr. Johnson Adebayo",
          email: "johnson.parent@reality.com",
          phone: "08012345678",
          address: "12 Lagos Street, Ikeja",
          occupation: "Engineer",
        },
      });

      await db.user.create({
        data: {
          tenantId,
          email: "johnson.parent@reality.com",
          password: "parent123",
          username: "Mr. Johnson Adebayo",
          role: "Parent",
          parentId: parent.id,
        },
      });

      // Link parent to student
      await db.parentStudent.create({
        data: {
          tenantId,
          parentId: parent.id,
          studentId: student.id,
        },
      });

      // Create a second student linked to same parent
      const student2 = await db.student.create({
        data: {
          tenantId,
          regNo: "REG-002",
          fullname: "Blessing Adebayo",
          gender: "Female",
          class: "SSS1A",
          classRef: "",
          stateOfOrigin: "Lagos",
          parentNo: "08012345678",
        },
      });

      await db.parentStudent.create({
        data: {
          tenantId,
          parentId: parent.id,
          studentId: student2.id,
        },
      });
    }

    return NextResponse.json(
      { success: true, message: "Database seeded successfully", tenantId },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Seed failed: ${message}` },
      { status: 500 }
    );
  }
}
