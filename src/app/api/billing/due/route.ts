// src/app/api/billing/due/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Helper: get monthlyDueNGN for a tenant using raw SQL
async function getMonthlyRate(tenantPlan: string | null): Promise<number> {
  if (!tenantPlan) return 0;
  const rows = await db.$queryRawUnsafe(
    `SELECT "monthlyDueNGN" FROM "SubscriptionPlan" WHERE "planKey" = $1`,
    tenantPlan
  );
  const row = (rows as Record<string, unknown>[])[0];
  return Number(row?.monthlyDueNGN) || 0;
}

// GET — fetch dues for the school, auto-generate current month
export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) return NextResponse.json({ message: 'Missing tenant' }, { status: 400 });

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Auto-generate current month if missing
    const existing = await db.monthlyDue.findUnique({ where: { tenantId_month: { tenantId, month: currentMonth } } });
    if (!existing) {
      const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
      const amount = await getMonthlyRate(tenant?.plan || null);
      if (amount > 0) {
        await db.monthlyDue.create({ data: { tenantId, tenantName: tenant?.name || 'Unknown', month: currentMonth, amount, status: 'unpaid' } });
      }
    }

    // Mark old unpaid as overdue
    await db.monthlyDue.updateMany({
      where: { tenantId, status: 'unpaid', month: { lt: currentMonth } },
      data: { status: 'overdue' },
    });

    const dues = await db.monthlyDue.findMany({ where: { tenantId }, orderBy: { month: 'desc' } });

    const totalOutstanding = dues.filter(d => d.status === 'unpaid' || d.status === 'overdue').reduce((s, d) => s + d.amount, 0);
    const totalPaid = dues.filter(d => d.status === 'paid').reduce((s, d) => s + d.amount, 0);

    // Get monthly rate from plan using raw SQL
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    const monthlyRate = await getMonthlyRate(tenant?.plan || null);

    return NextResponse.json({ success: true, dues, totalOutstanding, totalPaid, monthlyRate });
  } catch (err: unknown) {
    console.error('Billing GET error:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// POST — upload payment evidence for a specific month
export async function POST(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) return NextResponse.json({ message: 'Missing tenant' }, { status: 400 });

    const body = await req.json();
    const { month, evidence, evidenceName, evidenceType } = body;

    if (!month || !evidence) {
      return NextResponse.json({ message: 'Month and evidence image are required' }, { status: 400 });
    }

    const due = await db.monthlyDue.findUnique({ where: { tenantId_month: { tenantId, month } } });
    if (!due) return NextResponse.json({ message: 'No due found for this month' }, { status: 404 });

    const updated = await db.monthlyDue.update({
      where: { id: due.id },
      data: {
        status: 'paid',
        evidenceFileData: evidence,
        evidenceFileName: evidenceName || 'payment-evidence',
        evidenceFileType: evidenceType || 'image/png',
      },
    });

    return NextResponse.json({ success: true, message: 'Payment evidence uploaded. Awaiting verification.', due: updated });
  } catch (err: unknown) {
    console.error('Billing POST error:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}