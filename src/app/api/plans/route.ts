import { NextResponse } from "next/server";
import { getDisplayPlans } from "@/lib/plans";

export async function GET() {
  try {
    const plans = await getDisplayPlans();
    return NextResponse.json({ success: true, plans });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, message: `Failed to fetch plans: ${message}` },
      { status: 500 }
    );
  }
}