// src/app/api/dev/monthly-dues/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET — fetch all schools' dues with optional filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const tenantId = searchParams.get('tenantId');

    const where: Record<string, unknown> = {};
    if (status && status !== 'all') {
      if (status === 'pending_review') {
        (where as Record<string, unknown>).status = 'paid';
        (where as Record<string, unknown>).reviewedBy = null;
      } else {
        where.status = status;
      }
    }
    if (tenantId) where.tenantId = tenantId;

    const dues = await db.monthlyDue.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const unpaid = dues.filter(d => d.status === 'unpaid').length;
    const overdue = dues.filter(d => d.status === 'overdue').length;
    const paid = dues.filter(d => d.status === 'paid' && d.reviewedBy).length;
    const pendingReview = dues.filter(d => d.status === 'paid' && !d.reviewedBy).length;
    const totalRevenue = dues.filter(d => d.status === 'paid' && d.reviewedBy).reduce((s, d) => s + d.amount, 0);

    return NextResponse.json({
      success: true,
      dues,
      stats: { unpaid, overdue, paid, pendingReview, totalRevenue, total: dues.length },
    });
  } catch (err: unknown) {
    console.error('Dev monthly dues GET error:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// PUT — approve, reject, or delete a due
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { dueId, action, reviewerName, reviewNote } = body;

    if (!dueId || !action) return NextResponse.json({ message: 'dueId and action are required' }, { status: 400 });

    const due = await db.monthlyDue.findUnique({ where: { id: dueId } });
    if (!due) return NextResponse.json({ message: 'Due record not found' }, { status: 404 });

    if (action === 'approve') {
      const updated = await db.monthlyDue.update({
        where: { id: dueId },
        data: {
          reviewedBy: reviewerName || 'Platform Admin',
          reviewNote: reviewNote || 'Approved',
          reviewedAt: new Date(),
        },
      });
      return NextResponse.json({ success: true, message: 'Payment verified and approved', due: updated });
    }

    if (action === 'reject') {
      const updated = await db.monthlyDue.update({
        where: { id: dueId },
        data: {
          status: 'unpaid',
          evidenceFileData: undefined,
          evidenceFileName: undefined,
          evidenceFileType: undefined,
          evidenceFileSize: undefined,
          reference: '',
          note: '',
          reviewedBy: undefined,
          reviewNote: reviewNote || 'Rejected by admin',
          reviewedAt: new Date(),
        },
      });
      return NextResponse.json({ success: true, message: 'Payment rejected — school can re-upload', due: updated });
    }

    if (action === 'delete') {
      await db.monthlyDue.delete({ where: { id: dueId } });
      return NextResponse.json({ success: true, message: 'Due record deleted' });
    }

    return NextResponse.json({ message: 'Invalid action. Use approve, reject, or delete' }, { status: 400 });
  } catch (err: unknown) {
    console.error('Dev monthly dues PUT error:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}