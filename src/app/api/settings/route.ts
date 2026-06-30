import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

// GET /api/settings?type=resumptions|teacher-remarks|principal-remarks|signatures
export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    switch (type) {
      case "resumptions": {
        const records = await db.resumption.findMany({
          where: { tenantId },
          orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(records);
      }
      case "teacher-remarks": {
        const remarks = await db.teacherRemark.findMany({
          where: { tenantId },
          orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(remarks);
      }
      case "principal-remarks": {
        const remarks = await db.principalRemark.findMany({
          where: { tenantId },
          orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(remarks);
      }
      case "school-settings": {
        let settings = await db.schoolSettings.findFirst({ where: { tenantId } });
        if (!settings) {
          settings = await db.schoolSettings.create({ data: { tenantId } });
        }
        return NextResponse.json(settings);
      }
      case "signatures": {
        const teacherSig = await db.teacherSignature.findFirst({ where: { tenantId } });
        const principalSig = await db.principalSignature.findFirst({ where: { tenantId } });
        return NextResponse.json({
          teacherSignature: teacherSig || { name: "", imageUrl: "" },
          principalSignature: principalSig || { name: "", imageUrl: "" },
        });
      }
      default:
        return NextResponse.json(
          { success: false, message: "Invalid or missing type parameter" },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to fetch settings: ${message}` },
      { status: 500 }
    );
  }
}

// POST /api/settings - Create or update record based on type in body
export async function POST(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const { type } = body;

    switch (type) {
      case "resumption": {
        const { session, term, openTerm, nextTerm, nextTermLabel, noSchoolOpen } = body;
        if (!session || !term) {
          return NextResponse.json(
            { success: false, message: "Session and term are required" },
            { status: 400 }
          );
        }
        const existing = await db.resumption.findFirst({
          where: { tenantId, session, term },
        });
        if (existing) {
          const updated = await db.resumption.update({
            where: { id: existing.id },
            data: {
              openTerm: openTerm || "",
              nextTerm: nextTerm || "",
              nextTermLabel: nextTermLabel || "",
              noSchoolOpen: Number(noSchoolOpen) || 0,
            },
          });
          return NextResponse.json(updated);
        }
        const record = await db.resumption.create({
          data: {
            tenantId,
            session,
            term,
            openTerm: openTerm || "",
            nextTerm: nextTerm || "",
            nextTermLabel: nextTermLabel || "",
            noSchoolOpen: Number(noSchoolOpen) || 0,
          },
        });
        return NextResponse.json(record, { status: 201 });
      }
      case "teacher-remark": {
        const { remark, session, term, studentName } = body;
        if (!remark || remark.trim().length === 0) {
          return NextResponse.json(
            { success: false, message: "Remark text is required" },
            { status: 400 }
          );
        }
        const existing = await db.teacherRemark.findFirst({
          where: {
            tenantId,
            remark: remark.trim(),
            session: session || null,
            term: term || null,
            studentName: studentName || null,
          },
        });
        if (existing) {
          const updated = await db.teacherRemark.update({
            where: { id: existing.id },
            data: { remark: remark.trim() },
          });
          return NextResponse.json(updated);
        }
        const record = await db.teacherRemark.create({
          data: {
            tenantId,
            remark: remark.trim(),
            session: session || null,
            term: term || null,
            studentName: studentName || null,
          },
        });
        return NextResponse.json(record, { status: 201 });
      }
      case "principal-remark": {
        const { remark, session, term, studentName } = body;
        if (!remark || remark.trim().length === 0) {
          return NextResponse.json(
            { success: false, message: "Remark text is required" },
            { status: 400 }
          );
        }
        const existing = await db.principalRemark.findFirst({
          where: {
            tenantId,
            remark: remark.trim(),
            session: session || null,
            term: term || null,
            studentName: studentName || null,
          },
        });
        if (existing) {
          const updated = await db.principalRemark.update({
            where: { id: existing.id },
            data: { remark: remark.trim() },
          });
          return NextResponse.json(updated);
        }
        const record = await db.principalRemark.create({
          data: {
            tenantId,
            remark: remark.trim(),
            session: session || null,
            term: term || null,
            studentName: studentName || null,
          },
        });
        return NextResponse.json(record, { status: 201 });
      }
      case "school-settings": {
        const { caCount, ca1Max, ca2Max, ca3Max, ca1Label, ca2Label, ca3Label, examMax, examLabel, totalMax } = body;
        let settings = await db.schoolSettings.findFirst({ where: { tenantId } });
        if (settings) {
          const updated = await db.schoolSettings.update({
            where: { id: settings.id },
            data: {
              caCount: Number(caCount) || 2,
              ca1Max: Number(ca1Max) || 15,
              ca2Max: Number(ca2Max) || 15,
              ca3Max: Number(ca3Max) || 10,
              ca1Label: ca1Label || "1st CA",
              ca2Label: ca2Label || "2nd CA",
              ca3Label: ca3Label || "3rd CA",
              examMax: Number(examMax) || 60,
              examLabel: examLabel || "Exam",
              totalMax: Number(totalMax) || 100,
            },
          });
          return NextResponse.json(updated);
        }
        const record = await db.schoolSettings.create({
          data: {
            tenantId,
            caCount: Number(caCount) || 2,
            ca1Max: Number(ca1Max) || 15,
            ca2Max: Number(ca2Max) || 15,
            ca3Max: Number(ca3Max) || 10,
            ca1Label: ca1Label || "1st CA",
            ca2Label: ca2Label || "2nd CA",
            ca3Label: ca3Label || "3rd CA",
            examMax: Number(examMax) || 60,
            examLabel: examLabel || "Exam",
            totalMax: Number(totalMax) || 100,
          },
        });
        return NextResponse.json(record, { status: 201 });
      }
      case "teacher-signature": {
        const { name, imageUrl } = body;
        const existing = await db.teacherSignature.findFirst({ where: { tenantId } });
        if (existing) {
          const updated = await db.teacherSignature.update({
            where: { id: existing.id },
            data: { name: name || "", imageUrl: imageUrl || "" },
          });
          return NextResponse.json(updated);
        }
        const record = await db.teacherSignature.create({
          data: { tenantId, name: name || "", imageUrl: imageUrl || "" },
        });
        return NextResponse.json(record, { status: 201 });
      }
      case "principal-signature": {
        const { name, imageUrl } = body;
        const existing = await db.principalSignature.findFirst({ where: { tenantId } });
        if (existing) {
          const updated = await db.principalSignature.update({
            where: { id: existing.id },
            data: { name: name || "", imageUrl: imageUrl || "" },
          });
          return NextResponse.json(updated);
        }
        const record = await db.principalSignature.create({
          data: { tenantId, name: name || "", imageUrl: imageUrl || "" },
        });
        return NextResponse.json(record, { status: 201 });
      }
      default:
        return NextResponse.json(
          { success: false, message: "Invalid or missing type in body" },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to create settings record: ${message}` },
      { status: 500 }
    );
  }
}

// PUT /api/settings - Update record based on type and id
export async function PUT(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const { type, id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Record id is required" },
        { status: 400 }
      );
    }

    switch (type) {
      case "resumption": {
        const { session, term, openTerm, nextTerm, noSchoolOpen } = body;
        const existing = await db.resumption.findFirst({ where: { id, tenantId } });
        if (!existing) {
          return NextResponse.json(
            { success: false, message: "Resumption record not found" },
            { status: 404 }
          );
        }
        const record = await db.resumption.update({
          where: { id },
          data: {
            session: session ?? undefined,
            term: term ?? undefined,
            openTerm: openTerm ?? undefined,
            nextTerm: nextTerm ?? undefined,
            noSchoolOpen: Number(noSchoolOpen) ?? 0,
          },
        });
        return NextResponse.json(record);
      }
      case "teacher-remark": {
        const { remark } = body;
        if (!remark || remark.trim().length === 0) {
          return NextResponse.json(
            { success: false, message: "Remark text is required" },
            { status: 400 }
          );
        }
        const existing = await db.teacherRemark.findFirst({ where: { id, tenantId } });
        if (!existing) {
          return NextResponse.json(
            { success: false, message: "Teacher remark not found" },
            { status: 404 }
          );
        }
        const record = await db.teacherRemark.update({
          where: { id },
          data: { remark: remark.trim() },
        });
        return NextResponse.json(record);
      }
      case "principal-remark": {
        const { remark } = body;
        if (!remark || remark.trim().length === 0) {
          return NextResponse.json(
            { success: false, message: "Remark text is required" },
            { status: 400 }
          );
        }
        const existing = await db.principalRemark.findFirst({ where: { id, tenantId } });
        if (!existing) {
          return NextResponse.json(
            { success: false, message: "Principal remark not found" },
            { status: 404 }
          );
        }
        const record = await db.principalRemark.update({
          where: { id },
          data: { remark: remark.trim() },
        });
        return NextResponse.json(record);
      }
      default:
        return NextResponse.json(
          { success: false, message: "Invalid or missing type in body" },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to update settings record: ${message}` },
      { status: 500 }
    );
  }
}

// DELETE /api/settings?id=xxx&type=resumption|teacher-remark|principal-remark
export async function DELETE(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Record id is required" },
        { status: 400 }
      );
    }
    if (!type) {
      return NextResponse.json(
        { success: false, message: "Record type is required" },
        { status: 400 }
      );
    }

    switch (type) {
      case "resumption": {
        const existing = await db.resumption.findFirst({ where: { id, tenantId } });
        if (!existing) {
          return NextResponse.json(
            { success: false, message: "Resumption record not found" },
            { status: 404 }
          );
        }
        await db.resumption.delete({ where: { id } });
        return NextResponse.json({ success: true, message: "Resumption record deleted" });
      }
      case "teacher-remark": {
        const existing = await db.teacherRemark.findFirst({ where: { id, tenantId } });
        if (!existing) {
          return NextResponse.json(
            { success: false, message: "Teacher remark not found" },
            { status: 404 }
          );
        }
        await db.teacherRemark.delete({ where: { id } });
        return NextResponse.json({ success: true, message: "Teacher remark deleted" });
      }
      case "principal-remark": {
        const existing = await db.principalRemark.findFirst({ where: { id, tenantId } });
        if (!existing) {
          return NextResponse.json(
            { success: false, message: "Principal remark not found" },
            { status: 404 }
          );
        }
        await db.principalRemark.delete({ where: { id } });
        return NextResponse.json({ success: true, message: "Principal remark deleted" });
      }
      default:
        return NextResponse.json(
          { success: false, message: "Invalid type parameter" },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Failed to delete settings record: ${message}` },
      { status: 500 }
    );
  }
}