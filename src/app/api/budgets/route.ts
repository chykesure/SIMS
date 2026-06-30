import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: NextRequest): string {
  return request.headers.get("x-tenant-id") || "";
}

// GET /api/budgets — List budgets with optional filters, includes entries
export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID is required" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const session = searchParams.get("session")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";

    const where: Record<string, unknown> = { tenantId };
    if (session) where.session = session;
    if (status) where.status = status;

    const budgets = await db.budget.findMany({
      where,
      include: { entries: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      { success: true, data: budgets },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch budgets: ${message}` },
      { status: 500 }
    );
  }
}

// POST /api/budgets — Create budget with entries array
export async function POST(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, session, term, description, status, entries } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { success: false, message: "Budget title is required" },
        { status: 400 }
      );
    }

    if (!session?.trim()) {
      return NextResponse.json(
        { success: false, message: "Budget session is required" },
        { status: 400 }
      );
    }

    // Validate status if provided
    const validStatuses = ["draft", "approved", "active", "closed"];
    const budgetStatus = status || "draft";
    if (!validStatuses.includes(budgetStatus)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate entries array
    const parsedEntries: Array<{
      category: string;
      description?: string;
      allocated: number;
      spent?: number;
    }> = Array.isArray(entries)
      ? entries.map((entry: Record<string, unknown>) => ({
          category: String(entry.category || "").trim(),
          description: String(entry.description || "").trim(),
          allocated: Number(entry.allocated) || 0,
          spent: Number(entry.spent) || 0,
        }))
      : [];

    // Validate each entry has a category
    for (const entry of parsedEntries) {
      if (!entry.category) {
        return NextResponse.json(
          { success: false, message: "Each budget entry must have a category" },
          { status: 400 }
        );
      }
      if (entry.allocated < 0) {
        return NextResponse.json(
          {
            success: false,
            message: `Allocated amount cannot be negative for category: ${entry.category}`,
          },
          { status: 400 }
        );
      }
      if (entry.spent < 0) {
        return NextResponse.json(
          {
            success: false,
            message: `Spent amount cannot be negative for category: ${entry.category}`,
          },
          { status: 400 }
        );
      }
    }

    // Calculate totalBudget from sum of entries.allocated
    const totalBudget = parsedEntries.reduce(
      (sum, entry) => sum + entry.allocated,
      0
    );
    const totalSpent = parsedEntries.reduce(
      (sum, entry) => sum + entry.spent,
      0
    );

    // Create budget with entries in a transaction
    const budget = await db.budget.create({
      data: {
        tenantId,
        title: title.trim(),
        session: session.trim(),
        term: term?.trim() || "",
        totalBudget,
        totalSpent,
        status: budgetStatus,
        description: description?.trim() || "",
        entries: {
          create: parsedEntries.map((entry) => ({
            tenantId,
            category: entry.category,
            description: entry.description,
            allocated: entry.allocated,
            spent: entry.spent,
          })),
        },
      },
      include: { entries: true },
    });

    return NextResponse.json(
      { success: true, message: "Budget created successfully", data: budget },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to create budget: ${message}` },
      { status: 500 }
    );
  }
}
