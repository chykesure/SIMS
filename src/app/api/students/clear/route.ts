// FILE: src/app/api/students/clear/route.ts
// DELETE all students for a tenant (with confirmation check)
// Create this file in: src/app/api/students/clear/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function getTenantId(request: Request): string {
  return request.headers.get('x-tenant-id') || '';
}

// DELETE /api/students/clear?classId=xxx — Clear all students in a specific class
// DELETE /api/students/clear?all=true — Clear ALL students for the tenant
export async function DELETE(request: Request) {
  try {
    const tenantId = getTenantId(request);

    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const clearAll = searchParams.get('all');

    let deletedCount = 0;

    if (classId) {
      // Delete students in a specific class
      // First get the class title
      const classRecord = await db.class.findUnique({
        where: { id: classId },
        select: { title: true },
      });

      if (!classRecord) {
        return NextResponse.json(
          { success: false, message: 'Class not found' },
          { status: 404 }
        );
      }

      const result = await db.student.deleteMany({
        where: { class: classRecord.title, tenantId },
      });
      deletedCount = result.count;

    } else if (clearAll === 'true') {
      // Delete ALL students for the tenant
      const result = await db.student.deleteMany({
        where: { tenantId },
      });
      deletedCount = result.count;

    } else {
      return NextResponse.json(
        { success: false, message: 'Provide classId or all=true parameter' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedCount} student(s)`,
      deletedCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { success: false, message: `Failed to clear students: ${message}` },
      { status: 500 }
    );
  }
}
