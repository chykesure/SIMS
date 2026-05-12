import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "income" | "expense"
    const session = searchParams.get("session");
    const term = searchParams.get("term");
    const category = searchParams.get("category");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Record<string, unknown> = { tenantId };
    if (type) where.type = type;
    if (session) where.session = session;
    if (term) where.term = term;
    if (category) where.category = category;

    // Date range filter
    if (startDate || endDate) {
      const dateFilter: Record<string, unknown> = {};
      if (startDate) dateFilter.gte = startDate;
      if (endDate) dateFilter.lte = endDate;
      where.date = dateFilter;
    }

    const entries = await db.incomeExpense.findMany({
      where,
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ success: true, data: entries });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch income/expenses: ${message}` },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const {
      type,
      category,
      description,
      amount,
      date,
      reference,
      paidTo,
      receivedFrom,
      method,
      term,
      session,
    } = body;

    if (!type || !["income", "expense"].includes(type)) {
      return NextResponse.json(
        { success: false, message: "Type must be either 'income' or 'expense'" },
        { status: 400 }
      );
    }

    if (!category?.trim()) {
      return NextResponse.json(
        { success: false, message: "Category is required" },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, message: "Amount must be greater than zero" },
        { status: 400 }
      );
    }

    if (!date?.trim()) {
      return NextResponse.json(
        { success: false, message: "Date is required" },
        { status: 400 }
      );
    }

    const entry = await db.incomeExpense.create({
      data: {
        tenantId,
        type,
        category: category.trim(),
        description: description?.trim() || "",
        amount: amount,
        date: date.trim(),
        reference: reference?.trim() || "",
        paidTo: paidTo?.trim() || "",
        receivedFrom: receivedFrom?.trim() || "",
        method: method || "cash",
        term: term?.trim() || "",
        session: session?.trim() || "",
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `${type === "income" ? "Income" : "Expense"} recorded successfully`,
        data: entry,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to create income/expense entry: ${message}` },
      { status: 500 }
    );
  }
}
