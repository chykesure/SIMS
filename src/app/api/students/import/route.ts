import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

function generateSchoolInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentCell += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentCell.trim());
        currentCell = "";
      } else if (char === "\r" && nextChar === "\n") {
        currentRow.push(currentCell.trim());
        currentCell = "";
        if (currentRow.length > 0) rows.push(currentRow);
        currentRow = [];
        i++;
      } else if (char === "\n" || char === "\r") {
        currentRow.push(currentCell.trim());
        currentCell = "";
        if (currentRow.length > 0) rows.push(currentRow);
        currentRow = [];
      } else {
        currentCell += char;
      }
    }
  }

  // Push last cell/row
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) rows.push(currentRow);
  }

  return rows;
}

export async function POST(request: Request) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID is required" },
        { status: 401 }
      );
    }

    // Get the uploaded file from form data
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "No CSV file provided" },
        { status: 400 }
      );
    }

    if (!file.name.endsWith(".csv")) {
      return NextResponse.json(
        { success: false, message: "Only CSV files are accepted" },
        { status: 400 }
      );
    }

    // Read file content
    const text = await file.text();
    if (!text.trim()) {
      return NextResponse.json(
        { success: false, message: "CSV file is empty" },
        { status: 400 }
      );
    }

    // Parse CSV
    const rows = parseCSV(text);
    if (rows.length < 2) {
      return NextResponse.json(
        { success: false, message: "CSV must have a header row and at least one data row" },
        { status: 400 }
      );
    }

    // Validate header row (skip BOM if present)
    const header = rows[0].map((h) => h.replace(/^\uFEFF/, "").trim().toLowerCase());
    const expectedHeaders = [
      "fullname",
      "gender",
      "date of birth",
      "class",
      "basic",
      "department",
      "parent phone",
      "state of origin",
      "lga",
      "home address",
    ];

    // Flexible header matching - check if expected columns are present
    const normalizedExpected = expectedHeaders.map((h) => h.replace(/\s+/g, ""));
    const normalizedHeader = header.map((h) => h.replace(/[^a-z]/g, ""));

    const missingColumns: string[] = [];
    // Check for required columns
    if (!normalizedHeader.includes("fullname")) {
      missingColumns.push("Fullname");
    }
    if (!normalizedHeader.includes("class")) {
      missingColumns.push("Class");
    }

    if (missingColumns.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Missing required columns: ${missingColumns.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Map column indices
    const colMap: Record<string, number> = {};
    const headerVariants: Record<string, string[]> = {
      fullname: ["fullname", "fullname", "name", "studentname", "studentname", "fullname"],
      gender: ["gender", "sex"],
      dateOfBirth: ["dateofbirth", "dob", "dateofbirth", "birthdate", "dateofbirth"],
      class: ["class", "classname", "studentclass"],
      basic: ["basic", "basiclevel", "level"],
      department: ["department", "dept"],
      parentNo: ["parentphone", "parentno", "phonenumber", "phone", "parentphonenumber"],
      stateOfOrigin: ["stateoforigin", "state", "origin"],
      lga: ["lga", "localgovernment", "localgovernmentarea"],
      homeAddress: ["homeaddress", "address", "home"],
    };

    for (const [key, variants] of Object.entries(headerVariants)) {
      const idx = header.findIndex(
        (h) => variants.includes(h.replace(/[^a-z]/g, "")) || variants.includes(h.replace(/\s+/g, "").toLowerCase())
      );
      if (idx !== -1) colMap[key] = idx;
    }

    // Get tenant info for school initials
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return NextResponse.json(
        { success: false, message: "Tenant not found" },
        { status: 404 }
      );
    }

    const schoolInitials = generateSchoolInitials(tenant.name);

    // Get active session
    const activeSession = await db.session.findFirst({
      where: { tenantId, active: "Yes" },
    });
    const sessionLabel = activeSession
      ? `${activeSession.sessionOne}/${activeSession.sessionTwo}`
      : new Date().getFullYear();

    // Check plan limit
    const currentStudentCount = await db.student.count({ where: { tenantId } });
    const availableSlots = tenant.maxStudents - currentStudentCount;

    // Process rows
    let imported = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];
    const importedStudents: Record<string, unknown>[] = [];

    // Get next sequence number
    // Try slash format first (AGS/2025/2026/0058), fall back to dash format (AGS-2025/2026-001)
    const slashPrefix = `${schoolInitials}/${sessionLabel}/`;
    const dashPrefix = `${schoolInitials}-${sessionLabel}-`;

    const lastStudent = await db.student.findFirst({
      where: {
        tenantId,
        OR: [
          { regNo: { startsWith: slashPrefix } },
          { regNo: { startsWith: dashPrefix } },
        ],
      },
      orderBy: { regNo: "desc" },
    });

    let nextSeqNum = 1;
    if (lastStudent?.regNo) {
      // Extract the last number from either format
      const parts = lastStudent.regNo.split(/[\/-]/);
      const lastNum = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastNum)) {
        nextSeqNum = lastNum + 1;
      }
    }

    // Process data rows (skip header)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];

      if (row.every((cell) => !cell.trim())) continue; // Skip empty rows

      if (imported >= availableSlots) {
        errors.push(
          `Row ${i + 1}: Student limit reached (${tenant.maxStudents}). Remaining rows skipped.`
        );
        skipped += rows.length - i;
        break;
      }

      try {
        const getValue = (key: string): string => {
          if (colMap[key] !== undefined && row[colMap[key]] !== undefined) {
            return row[colMap[key]].trim();
          }
          return "";
        };

        const fullname = getValue("fullname");
        const studentClass = getValue("class");

        // Validate required fields
        if (!fullname) {
          errors.push(`Row ${i + 1}: Fullname is required`);
          failed++;
          continue;
        }
        if (!studentClass) {
          errors.push(`Row ${i + 1}: Class is required`);
          failed++;
          continue;
        }

        // Check for duplicate (fullname + class + tenantId)
        const existing = await db.student.findFirst({
          where: { tenantId, fullname, class: studentClass },
        });
        if (existing) {
          errors.push(`Row ${i + 1}: "${fullname}" in class "${studentClass}" already exists (skipped)`);
          skipped++;
          continue;
        }

        // Generate registration number (slash format: AGS/2025/2026/059)
        const regNo = `${schoolInitials}/${sessionLabel}/${String(nextSeqNum).padStart(3, "0")}`;
        nextSeqNum++;

        // Create student
        const student = await db.student.create({
          data: {
            tenantId,
            regNo,
            fullname,
            gender: getValue("gender"),
            dateOfBirth: getValue("dateOfBirth"),
            class: studentClass,
            basic: getValue("basic"),
            department: getValue("department"),
            parentNo: getValue("parentNo"),
            stateOfOrigin: getValue("stateOfOrigin"),
            lga: getValue("lga"),
            homeAddress: getValue("homeAddress"),
          },
        });

        // Auto-create User login account for the student
        try {
          const defaultPassword = regNo.toLowerCase();
          await db.user.create({
            data: {
              tenantId,
              email: regNo,
              username: fullname,
              password: defaultPassword,
              role: "STUDENT",
              studentId: student.id,
              imageUrl: "",
            },
          });
        } catch {
          // User already exists — skip silently
        }

        importedStudents.push(student);
        imported++;
      } catch {
        errors.push(`Row ${i + 1}: Failed to create student`);
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      failed,
      skipped,
      errors,
      students: importedStudents,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: `Import failed: ${message}` },
      { status: 500 }
    );
  }
}