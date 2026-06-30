import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

// GET /api/classrooms/materials?classroomId= — List materials for a classroom
export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID required" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get("classroomId");

    if (!classroomId) {
      return NextResponse.json(
        { success: false, message: "classroomId is required" },
        { status: 400 }
      );
    }

    const materials = await db.classMaterial.findMany({
      where: { tenantId, classroomId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: materials });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch materials: ${message}` },
      { status: 500 }
    );
  }
}

// POST /api/classrooms/materials — Create material
// Required: classroomId, title
export async function POST(request: Request) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { classroomId, title, description, type, url, fileSize, uploadedBy, uploadedByName } = body;

    if (!classroomId || !title || !title.trim()) {
      return NextResponse.json(
        { success: false, message: "classroomId and title are required" },
        { status: 400 }
      );
    }

    // Verify classroom exists for this tenant
    const classroom = await db.classroom.findFirst({
      where: { id: classroomId, tenantId },
    });

    if (!classroom) {
      return NextResponse.json(
        { success: false, message: "Classroom not found" },
        { status: 404 }
      );
    }

    const material = await db.classMaterial.create({
      data: {
        tenantId,
        classroomId,
        title: title.trim(),
        description: description || "",
        type: type || "link",
        url: url || "",
        fileSize: fileSize || "",
        uploadedBy: uploadedBy || "",
        uploadedByName: uploadedByName || "",
      },
    });

    return NextResponse.json({ success: true, data: material }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to create material: ${message}` },
      { status: 500 }
    );
  }
}

// PUT /api/classrooms/materials — Update material by id
export async function PUT(request: Request) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { id, title, description, type, url, fileSize } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Material id is required" },
        { status: 400 }
      );
    }

    const existing = await db.classMaterial.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Material not found" },
        { status: 404 }
      );
    }

    const material = await db.classMaterial.update({
      where: { id },
      data: {
        title: title !== undefined ? title.trim() : undefined,
        description: description !== undefined ? description : undefined,
        type: type !== undefined ? type : undefined,
        url: url !== undefined ? url : undefined,
        fileSize: fileSize !== undefined ? fileSize : undefined,
      },
    });

    return NextResponse.json({ success: true, data: material });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to update material: ${message}` },
      { status: 500 }
    );
  }
}

// DELETE /api/classrooms/materials?id= — Delete material
export async function DELETE(request: Request) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID required" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Material id is required" },
        { status: 400 }
      );
    }

    const existing = await db.classMaterial.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Material not found" },
        { status: 404 }
      );
    }

    await db.classMaterial.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Material deleted" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to delete material: ${message}` },
      { status: 500 }
    );
  }
}
