// src/app/api/dev/monthly-dues/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST — generate monthly dues for all approved schools (or specific tenant)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId: specificTenantId, month } = body;

    const now = new Date();
    const targetMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Get schools to generate for
    const where: Record<string, unknown> = { status: 'approved' };
    if (specificTenantId) where.id = specificTenantId;

    const tenants = await db.tenant.findMany({ where });

    let generated = 0;
    let skipped = 0;

    for (const tenant of tenants) {
      // Use raw SQL — Prisma client strips monthlyDueNGN
      let amount = 0;
      if (tenant.plan) {
        const rows = await db.$queryRawUnsafe(
          `SELECT "monthlyDueNGN" FROM "SubscriptionPlan" WHERE "planKey" = $1`,
          tenant.plan
        );
        const planRow = (rows as Record<string, unknown>[])[0];
        amount = Number(planRow?.monthlyDueNGN) || 0;
      }
      if (amount <= 0) { skipped++; continue; }

      const exists = await db.monthlyDue.findUnique({
        where: { tenantId_month: { tenantId: tenant.id, month: targetMonth } },
      });
      if (exists) { skipped++; continue; }

      await db.monthlyDue.create({
        data: {
          tenantId: tenant.id,
          tenantName: tenant.name,
          month: targetMonth,
          amount,
          status: 'unpaid',
        },
      });
      generated++;
    }

    return NextResponse.json({ success: true, message: `Generated ${generated} dues, skipped ${skipped}`, generated, skipped, month: targetMonth });
  } catch (err: unknown) {
    console.error('Generate dues error:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}