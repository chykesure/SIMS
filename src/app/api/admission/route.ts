import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: NextRequest): string {
  return request.headers.get("x-tenant-id") || "";
}

// GET all admission records
export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);

    const records = await db.admissionRecord.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(records);
  } catch (error) {
    console.error("Error fetching admission records:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch admission records" },
      { status: 500 }
    );
  }
}

// POST create admission record
export async function POST(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const {
      fullname,
      gender,
      dateOfBirth,
      parentName,
      parentPhone,
      parentEmail,
      address,
      previousSchool,
      desiredClass,
    } = body;

    if (!fullname) {
      return NextResponse.json(
        { success: false, message: "Fullname is required" },
        { status: 400 }
      );
    }

    const record = await db.admissionRecord.create({
      data: {
        tenantId,
        fullname,
        gender: gender || "",
        dateOfBirth: dateOfBirth || "",
        parentName: parentName || "",
        parentPhone: parentPhone || "",
        parentEmail: parentEmail || "",
        address: address || "",
        previousSchool: previousSchool || "",
        desiredClass: desiredClass || "",
        status: "Pending",
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("Error creating admission record:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create admission record" },
      { status: 500 }
    );
  }
}

// PUT update admission record status (approve/reject)
export async function PUT(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const { id, status } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Admission record ID is required" },
        { status: 400 }
      );
    }

    if (!status || !["Pending", "Approved", "Rejected"].includes(status)) {
      return NextResponse.json(
        { success: false, message: "Status must be Pending, Approved, or Rejected" },
        { status: 400 }
      );
    }

    const existing = await db.admissionRecord.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Admission record not found" },
        { status: 404 }
      );
    }

    const record = await db.admissionRecord.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error("Error updating admission record:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update admission record" },
      { status: 500 }
    );
  }
}

// DELETE admission record by id
export async function DELETE(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID is required" },
        { status: 400 }
      );
    }

    const existing = await db.admissionRecord.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Admission record not found" },
        { status: 404 }
      );
    }

    await db.admissionRecord.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Admission record deleted successfully" });
  } catch (error) {
    console.error("Error deleting admission record:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete admission record" },
      { status: 500 }
    );
  }
}
