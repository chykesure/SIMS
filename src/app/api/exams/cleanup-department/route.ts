// FILE: src/app/api/exams/cleanup-department/route.ts
// Run ONCE after assigning departments to subjects to clean up wrong scores.
// Call: GET /api/exams/cleanup-department?session=2025/2026&class=SSS2A&term=Third Term
// This deletes exam scores where the subject belongs to a department
// but the student is NOT in that department.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const { searchParams } = new URL(request.url);
    const session = searchParams.get("session");
    const cls = searchParams.get("class");
    const term = searchParams.get("term");

    if (!session || !cls || !term) {
      return NextResponse.json(
        { success: false, message: "session, class, and term are required" },
        { status: 400 }
      );
    }

    // 1. Get all subjects with a department assigned
    const subjects = await db.subject.findMany({
      where: { tenantId, department: { not: "" } },
    });

    if (subjects.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No subjects with department assigned. Nothing to clean up.",
        deletedCount: 0,
      });
    }

    // Build a map: subjectName -> department
    const subjectDeptMap = new Map<string, string>();
    for (const s of subjects) {
      subjectDeptMap.set(s.name.toLowerCase(), s.department.toLowerCase());
    }

    // 2. Get all exam scores for this session/class/term
    const scores = await db.examScore.findMany({
      where: { tenantId, session, class: cls, term },
    });

    if (scores.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No scores found for this class/term.",
        deletedCount: 0,
      });
    }

    // 3. Get all students in this class with their departments
    const students = await db.student.findMany({
      where: { tenantId, class: cls },
      select: { fullname: true, department: true },
    });
    const studentDeptMap = new Map<string, string>();
    for (const s of students) {
      studentDeptMap.set(s.fullname.toLowerCase(), (s.department || "").toLowerCase());
    }

    // 4. Find scores to delete:
    //    - Subject has a department (e.g. Chemistry -> Science)
    //    - Student has a department (e.g. Art)
    //    - They don't match
    const toDelete: string[] = [];
    for (const score of scores) {
      const subjDept = subjectDeptMap.get(score.subject.toLowerCase());
      if (!subjDept) continue; // subject has no department — skip (common subject)

      const stuDept = studentDeptMap.get(score.fullname.toLowerCase());
      if (!stuDept) continue; // student has no department — skip (junior)

      if (subjDept !== stuDept) {
        toDelete.push(score.id);
      }
    }

    // 5. Delete the wrong scores
    if (toDelete.length > 0) {
      await db.examScore.deleteMany({
        where: { id: { in: toDelete } },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${toDelete.length} wrong department score(s) from ${cls} - ${term}`,
      deletedCount: toDelete.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Cleanup failed: ${message}` },
      { status: 500 }
    );
  }
}