import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

// ─── GET: List all vouchers with optional filters ────────────────────────────
export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const { searchParams } = new URL(request.url);

    const type = searchParams.get("type") || "";
    const status = searchParams.get("status") || "";
    const session = searchParams.get("session") || "";
    const term = searchParams.get("term") || "";
    const search = searchParams.get("search")?.trim() || "";

    // Build the where clause dynamically
    const where: Record<string, unknown> = { tenantId };

    if (type) where.type = type;
    if (status) where.status = status;
    if (session) where.session = session;
    if (term) where.term = term;

    if (search) {
      where.OR = [
        { voucherNo: { contains: search } },
        { title: { contains: search } },
        { payeeName: { contains: search } },
        { description: { contains: search } },
        { particulars: { contains: search } },
      ];
    }

    const vouchers = await db.voucher.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: vouchers });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      {
        success: false,
        message: `Failed to fetch vouchers: ${message}`,
      },
      { status: 500 }
    );
  }
}

// ─── POST: Create a new voucher ──────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();

    const {
      type,
      title,
      description,
      amount,
      date,
      payeeName,
      payeeDetails,
      particulars,
      authorizedBy,
      status,
      term,
      session,
    } = body;

    // Validate required fields
    if (!type) {
      return NextResponse.json(
        { success: false, message: "Voucher type is required" },
        { status: 400 }
      );
    }

    const validTypes = ["payment", "receipt", "credit_note", "debit_note"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid voucher type. Must be one of: ${validTypes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Auto-generate voucher number: VCH-YYYYMM-NNNN (per tenant, sequential)
    const now = new Date();
    const yearMonth =
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, "0");
    const prefix = `VCH-${yearMonth}-`;

    // Find the highest voucher number for this tenant in the current month
    const latestVoucher = await db.voucher.findFirst({
      where: {
        tenantId,
        voucherNo: { startsWith: prefix },
      },
      orderBy: { voucherNo: "desc" },
      select: { voucherNo: true },
    });

    let nextSeq = 1;
    if (latestVoucher) {
      const seqPart = latestVoucher.voucherNo.replace(prefix, "");
      const parsed = parseInt(seqPart, 10);
      if (!isNaN(parsed)) {
        nextSeq = parsed + 1;
      }
    }

    const voucherNo = `${prefix}${nextSeq.toString().padStart(4, "0")}`;

    // Validate status if provided
    const validStatuses = ["draft", "approved", "cancelled"];
    const voucherStatus = status || "draft";
    if (!validStatuses.includes(voucherStatus)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const voucher = await db.voucher.create({
      data: {
        tenantId,
        voucherNo,
        type,
        title: title || "",
        description: description || "",
        amount: amount ?? 0,
        date: date || "",
        payeeName: payeeName || "",
        payeeDetails: payeeDetails || "",
        particulars: particulars || "",
        authorizedBy: authorizedBy || "",
        status: voucherStatus,
        term: term || "",
        session: session || "",
      },
    });

    return NextResponse.json({ success: true, data: voucher }, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      {
        success: false,
        message: `Failed to create voucher: ${message}`,
      },
      { status: 500 }
    );
  }
}
