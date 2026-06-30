import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { headers } from "next/headers";

// ─── GET /api/tenant ──────────────────────────────────────────────
export async function GET() {
  try {
    const headersList = await headers();
    const tenantId = headersList.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json({ success: false, message: "Tenant ID required" }, { status: 401 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true, name: true, slug: true, logo: true, motto: true,
        primaryColor: true, address: true, phone: true, email: true,
        website: true, state: true, status: true, plan: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ success: false, message: "School not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: tenant });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, message: `Failed to fetch school: ${message}` }, { status: 500 });
  }
}

// ─── PUT /api/tenant ──────────────────────────────────────────────
export async function PUT(request: Request) {
  try {
    const headersList = await headers();
    const tenantId = headersList.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json({ success: false, message: "Tenant ID required" }, { status: 401 });
    }

    const body = await request.json();
    const { name, logo, motto, primaryColor, address, phone, email, website, state } = body as {
      name?: string;
      logo?: string;
      motto?: string;
      primaryColor?: string;
      address?: string;
      phone?: string;
      email?: string;
      website?: string;
      state?: string;
    };

    const updateData: Record<string, string> = {};
    if (name !== undefined) updateData.name = name;
    if (logo !== undefined) updateData.logo = logo;
    if (motto !== undefined) updateData.motto = motto;
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (address !== undefined) updateData.address = address;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (website !== undefined) updateData.website = website;
    if (state !== undefined) updateData.state = state;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, message: "No fields to update" }, { status: 400 });
    }

    const updated = await db.tenant.update({
      where: { id: tenantId },
      data: updateData,
      select: {
        id: true, name: true, slug: true, logo: true, motto: true,
        primaryColor: true, address: true, phone: true, email: true,
        website: true, state: true, status: true, plan: true,
      },
    });

    return NextResponse.json({ success: true, data: updated, message: "School updated successfully" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, message: `Failed to update school: ${message}` }, { status: 500 });
  }
}