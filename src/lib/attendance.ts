// src/lib/attendance.ts
// Shared helpers for the Attendance engine.

import { db } from "@/lib/db";

export function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

export function getUserId(request: Request): string {
  return request.headers.get("x-user-id") || "";
}

export function isStaffRole(role: string): boolean {
  const r = (role || "").toUpperCase();
  return ["ADMIN", "TEACHER", "CLASS_TEACHER", "SUBJECT_TEACHER", "STAFF", "PRINCIPAL"].includes(r);
}

export function jsonError(message: string, status = 400) {
  return Response.json({ success: false, message }, { status });
}

/** Students of a class (tenant-scoped), ordered by name */
export async function classRoster(tenantId: string, klass: string) {
  return db.student.findMany({
    where: { tenantId, class: klass },
    orderBy: { fullname: "asc" },
    select: { id: true, regNo: true, fullname: true, imageUrl: true },
  });
}

/** Validate + normalize a QR payload produced by the student QR cards.
 *  Format: "SIMS1:<studentId>" — versioned so future formats never clash. */
export function parseStudentQr(payload: string): { ok: true; studentId: string } | { ok: false; message: string } {
  const value = (payload || "").trim();
  if (!value) return { ok: false, message: "Empty QR payload" };
  const match = /^SIMS1:([A-Za-z0-9_-]{5,64})$/.exec(value);
  if (!match) return { ok: false, message: "Unrecognised QR code — this is not a student QR." };
  return { ok: true, studentId: match[1] };
}