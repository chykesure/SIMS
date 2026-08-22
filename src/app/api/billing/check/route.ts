// src/app/api/billing/check/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST — check if tenant has unpaid/overdue dues (called by login route)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId } = body;

    if (!tenantId) return NextResponse.json({ allowed: true }, { status: 200 });

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Check for any unpaid or overdue dues for current or past months
    const unpaidDues = await db.monthlyDue.findMany({
      where: {
        tenantId,
        status: { in: ['unpaid', 'overdue'] },
        month: { lte: currentMonth },
      },
      orderBy: { month: 'asc' },
    });

    if (unpaidDues.length === 0) {
      return NextResponse.json({ allowed: true }, { status: 200 });
    }

    const totalOwed = unpaidDues.reduce((s, d) => s + d.amount, 0);
    const unpaidMonths = unpaidDues.map(d => d.month);

    return NextResponse.json({
      allowed: false,
      reason: 'Your school has outstanding monthly maintenance dues. Please contact support or make payment to continue using the platform.',
      totalOwed,
      unpaidMonths,
    });
  } catch (err: unknown) {
    console.error('Billing check error:', err);
    // On error, allow login (don't block due to server issues)
    return NextResponse.json({ allowed: true }, { status: 200 });
  }
}