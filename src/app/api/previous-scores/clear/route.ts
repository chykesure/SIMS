// FILE: src/app/api/previous-scores/clear/route.ts
// Delete imported scores by term (clears BOTH ExamScore and PreviousTermScore)
// Create this file at: src/app/api/previous-scores/clear/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Map term number to text label (must match import-route.ts)
function termToText(term: number | string): string {
  const n = parseInt(String(term));
  if (n === 1) return 'First Term';
  if (n === 2) return 'Second Term';
  if (n === 3) return 'Third Term';
  return String(term);
}

export async function DELETE(request: NextRequest) {
  try {
    const headerTenantId = request.headers.get('x-tenant-id') || '';
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || headerTenantId;
    const sessionId = searchParams.get('sessionId');
    const classId = searchParams.get('classId');
    const term = searchParams.get('term');
    const clearAll = searchParams.get('all') === 'true';

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Missing tenantId' },
        { status: 400 }
      );
    }

    let examDeleted = 0;
    let prevDeleted = 0;
    let classTitle = '';
    let sessionLabel = '';
    let termLabel = '';

    // ── CLEAR ALL: delete everything for this tenant ──
    if (clearAll) {
      examDeleted = (await prisma.examScore.deleteMany({
        where: { tenantId },
      })).count;

      prevDeleted = (await prisma.previousTermScore.deleteMany({
        where: { tenantId },
      })).count;

      return NextResponse.json({
        success: true,
        message: 'All scores deleted',
        examDeleted,
        prevDeleted,
      });
    }

    // ── SELECTIVE: delete by class/session/term ──
    if (!sessionId || !classId || !term) {
      return NextResponse.json(
        { error: 'Missing required params: sessionId, classId, term (or use ?all=true)' },
        { status: 400 }
      );
    }

    const termNum = parseInt(term);
    termLabel = termToText(termNum);

    // Get class title and session label for ExamScore table
    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
      select: { title: true },
    });
    classTitle = classRecord?.title || classId;

    const sessionRecord = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { sessionOne: true, sessionTwo: true },
    });
    sessionLabel = sessionRecord
      ? `${sessionRecord.sessionOne}/${sessionRecord.sessionTwo}`
      : sessionId;

    // Delete from ExamScore (text-based)
    examDeleted = (await prisma.examScore.deleteMany({
      where: {
        tenantId,
        class: classTitle,
        session: sessionLabel,
        term: termLabel,
      },
    })).count;

    // Delete from PreviousTermScore (ID-based)
    prevDeleted = (await prisma.previousTermScore.deleteMany({
      where: {
        tenantId,
        classId,
        session: sessionId,
        term: termNum,
      },
    })).count;

    return NextResponse.json({
      success: true,
      message: `Scores cleared for ${classTitle} - ${termLabel} (${sessionLabel})`,
      examDeleted,
      prevDeleted,
      classTitle,
      termLabel,
      sessionLabel,
    });
  } catch (error: any) {
    console.error('Score Clear Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to clear scores' },
      { status: 500 }
    );
  }
}
