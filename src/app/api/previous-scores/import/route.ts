import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────
// Auto-generate RegNo — same format as /api/students
// Format: ABBR/SESSION/0001 (e.g. AGS/2025-2026/0001)
// ─────────────────────────────────────────────
async function generateRegNo(tenantId: string, prisma: PrismaClient): Promise<string> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const schoolName = tenant?.name || "SCH";
  const skipWords = ["of", "the", "and", "for", "in", "on", "at", "to", "a", "an"];
  const abbr = schoolName
    .split(/\s+/)
    .filter((w) => !skipWords.includes(w.toLowerCase()))
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 3) || "SCH";

  const currentResumption = await prisma.resumption.findFirst({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });
  const session =
    currentResumption?.session ||
    `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  const count = await prisma.student.count({ where: { tenantId } });
  const nextNum = count + 1;
  const padded = String(nextNum).padStart(4, "0");

  const regNo = `${abbr}/${session}/${padded}`;

  const existing = await prisma.student.findFirst({
    where: { tenantId, regNo },
  });
  if (!existing) return regNo;

  let attempt = nextNum + 1;
  while (attempt < nextNum + 100) {
    const candidate = `${abbr}/${session}/${String(attempt).padStart(4, "0")}`;
    const taken = await prisma.student.findFirst({
      where: { tenantId, regNo: candidate },
    });
    if (!taken) return candidate;
    attempt++;
  }
  return `${abbr}/${session}/${padded}-${Date.now().toString(36)}`;
}

// ─────────────────────────────────────────────
// Convert numeric term (1, 2, 3) to text term
// ─────────────────────────────────────────────
function termToText(term: number | string): string {
  const n = parseInt(String(term));
  if (n === 1) return 'First Term';
  if (n === 2) return 'Second Term';
  if (n === 3) return 'Third Term';
  return String(term);
}

/** Strip noise chars and normalize for comparison */
function clean(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const FILLER_WORDS = new Set([
  'and', 'the', 'of', 'in', 'for', 'std',
]);

function getInitials(name: string): string {
  const words = keyWords(name);
  return words.map(w => w[0]).join('');
}

function keyWords(name: string): string[] {
  return clean(name)
    .split(' ')
    .filter(w => w.length > 1 && !FILLER_WORDS.has(w));
}

function matchScore(csvName: string, dbName: string): number {
  const csvClean = clean(csvName);
  const dbClean = clean(dbName);

  if (csvClean === dbClean) return 100;
  return 0;
}

function normalizeStudentName(name: string): string {
  return name.trim().toUpperCase();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const headerTenantId = request.headers.get('x-tenant-id') || '';
    const { csvData, sessionId, term, classId } = body;
    const tenantId = body.tenantId || headerTenantId;

    if (!csvData || !sessionId || !term || !classId || !tenantId) {
      return NextResponse.json(
        { error: 'Missing required fields: csvData, sessionId, term, classId, tenantId' },
        { status: 400 }
      );
    }

    const rows = parseCSV(csvData);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No valid data rows found in CSV' }, { status: 400 });
    }

    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
      select: { title: true },
    });

    if (!classRecord) {
      return NextResponse.json({ error: 'Class not found' }, { status: 400 });
    }

    const sessionRecord = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { sessionOne: true, sessionTwo: true },
    });
    const sessionLabel = sessionRecord
      ? `${sessionRecord.sessionOne}/${sessionRecord.sessionTwo}`
      : sessionId;

    const termNum = parseInt(String(term));
    const termLabel = termToText(term);

    const students = await prisma.student.findMany({
      where: { tenantId },
      select: { id: true, fullname: true },
    });

    const subjects = await prisma.subject.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    });

    const studentMap = new Map<string, string>();
    for (const s of students) {
      studentMap.set(normalizeStudentName(s.fullname), s.id);
    }

    const subjectList = subjects.map(s => ({ id: s.id, name: s.name }));

    let studentsCreated = 0;
    let subjectsCreated = 0;

    const newSubjectCache = new Map<string, string>();

    const examScoreData: any[] = [];

    let matched = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const studentName =
        row['student_name'] || row['student name'] || row['name'] ||
        row['student'] || row['fullname'] || row['full_name'] || '';

      const subjectName =
        row['subject'] || row['subject_name'] || row['subject name'] || '';

      const totalScore = parseFloat(
        row['total_score'] || row['total score'] || row['total'] ||
        row['score'] || row['first_term_score'] || row['first term score'] || '0'
      );

      const ca1 = row['ca1'] || row['ca_1'] || row['ca 1']
        ? parseFloat(row['ca1'] || row['ca_1'] || row['ca 1']) : null;
      const ca2 = row['ca2'] || row['ca_2'] || row['ca 2']
        ? parseFloat(row['ca2'] || row['ca_2'] || row['ca 2']) : null;
      const ca3 = row['ca3'] || row['ca_3'] || row['ca 3']
        ? parseFloat(row['ca3'] || row['ca_3'] || row['ca 3']) : null;
      const examScore = row['exam'] ? parseFloat(row['exam']) : null;

      if (!studentName || !subjectName) {
        errors.push(`Row ${rowNum}: Missing student name or subject name`);
        failed++;
        continue;
      }

      // ── Match or auto-create student ──
      const normalizedName = normalizeStudentName(studentName);
      let studentId = studentMap.get(normalizedName);

      if (!studentId) {
        // Auto-generate regNo using same format as /api/students
        let newRegNo = '';
        try {
          newRegNo = await generateRegNo(tenantId, prisma);
        } catch {
          newRegNo = `SCH/${new Date().getFullYear()}-${new Date().getFullYear() + 1}/${Date.now().toString().slice(-4)}`;
        }

        try {
          const newStudent = await prisma.student.create({
            data: {
              fullname: studentName.trim(),
              class: classRecord.title,
              tenantId: tenantId,
              gender: row['gender'] || row['sex'] || 'Male',
              regNo: newRegNo,
            },
          });
          studentId = newStudent.id;
          studentMap.set(normalizedName, newStudent.id);
          studentsCreated++;
        } catch (createErr: any) {
          if (createErr.message?.includes('Unique constraint')) {
            let existingStudent: { id: string; fullname: string } | null = null;

            existingStudent = await prisma.student.findFirst({
              where: { tenantId, fullname: studentName.trim() },
              select: { id: true, fullname: true },
            });

            if (!existingStudent) {
              const firstName = studentName.trim().split(' ')[0];
              existingStudent = await prisma.student.findFirst({
                where: { tenantId, fullname: { contains: firstName } },
                select: { id: true, fullname: true },
              });
            }

            if (existingStudent) {
              studentId = existingStudent.id;
              studentMap.set(normalizedName, existingStudent.id);
            } else {
              errors.push(`Row ${rowNum}: Could not create or find student "${studentName}" - ${createErr.message}`);
              failed++;
              continue;
            }
          } else {
            errors.push(`Row ${rowNum}: Could not create student "${studentName}" - ${createErr.message}`);
            failed++;
            continue;
          }
        }
      }

      // ── Match subject dynamically ──
      let subjectId: string | null = null;
      let bestMatch: string | null = null;
      let bestScoreVal = 0;

      for (const subj of subjectList) {
        const score = matchScore(subjectName, subj.name);
        if (score > bestScoreVal) {
          bestScoreVal = score;
          bestMatch = subj.name;
          subjectId = subj.id;
        }
      }

      if (!subjectId || bestScoreVal <= 50) {
        const csvSubjectClean = clean(subjectName);
        let cachedSubjectId = newSubjectCache.get(csvSubjectClean);

        if (!cachedSubjectId) {
          for (const [key, val] of newSubjectCache) {
            if (key.startsWith(csvSubjectClean) || csvSubjectClean.startsWith(key)) {
              cachedSubjectId = val;
              break;
            }
          }
        }

        if (cachedSubjectId) {
          subjectId = cachedSubjectId;
          bestMatch = subjectName;
        } else {
          try {
            const newSubject = await prisma.subject.create({
              data: {
                name: subjectName.trim(),
                tenantId: tenantId,
              },
            });
            subjectId = newSubject.id;
            newSubjectCache.set(csvSubjectClean, newSubject.id);
            subjectList.push({ id: newSubject.id, name: newSubject.name });
            subjectsCreated++;
          } catch (createErr: any) {
            errors.push(
              `Row ${rowNum}: Could not auto-create subject "${subjectName}" - ${createErr.message}`
            );
            failed++;
            continue;
          }
        }
      }

      // Save to PreviousTermScore (ID-based)
      await prisma.previousTermScore.upsert({
        where: {
          tenantId_studentId_classId_subjectId_session_term: {
            tenantId: tenantId,
            studentId: studentId!,
            classId: classId,
            subjectId: subjectId!,
            session: sessionId,
            term: termNum,
          },
        },
        update: {
          ca1: isNaN(ca1 as number) ? null : ca1,
          ca2: isNaN(ca2 as number) ? null : ca2,
          ca3: isNaN(ca3 as number) ? null : ca3,
          exam: isNaN(examScore as number) ? null : examScore,
          totalScore: isNaN(totalScore) ? 0 : totalScore,
          source: 'csv-import',
          enteredBy: 'admin',
        },
        create: {
          tenantId,
          studentId: studentId!,
          classId,
          subjectId: subjectId!,
          session: sessionId,
          term: termNum,
          ca1: isNaN(ca1 as number) ? null : ca1,
          ca2: isNaN(ca2 as number) ? null : ca2,
          ca3: isNaN(ca3 as number) ? null : ca3,
          exam: isNaN(examScore as number) ? null : examScore,
          totalScore: isNaN(totalScore) ? 0 : totalScore,
          source: 'csv-import',
          enteredBy: 'admin',
        },
      });

      // Save to ExamScore (text-based)
      examScoreData.push({
        tenantId: tenantId,
        fullname: studentName.trim(),
        class: classRecord.title,
        subject: bestMatch || subjectName.trim(),
        session: sessionLabel,
        term: termLabel,
        firstCa: isNaN(ca1 as number) ? 0 : ca1,
        secondCa: isNaN(ca2 as number) ? 0 : ca2,
        thirdCa: isNaN(ca3 as number) ? 0 : ca3,
        exam: isNaN(examScore as number) ? 0 : examScore,
        total: isNaN(totalScore) ? 0 : totalScore,
      });

      matched++;
    }

    // Batch save ExamScore records
    let examScoresSaved = 0;
    if (examScoreData.length > 0) {
      await prisma.examScore.deleteMany({
        where: {
          tenantId: tenantId,
          class: classRecord.title,
          session: sessionLabel,
          term: termLabel,
        },
      });

      const result = await prisma.examScore.createMany({
        data: examScoreData,
        skipDuplicates: true,
      });
      examScoresSaved = result.count;
    }

    return NextResponse.json({
      success: true,
      message: 'Import complete',
      stats: {
        total: rows.length,
        matched,
        failed,
        studentsCreated,
        subjectsCreated,
        examScoresSaved,
        errors,
      },
    });
  } catch (error: any) {
    console.error('CSV Import Error:', error);
    return NextResponse.json(
      { error: error.message || 'Import failed' },
      { status: 500 }
    );
  }
}

// ── Simple CSV parser ──
function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const header = parseCSVLine(lines[0]).map((h: string) =>
    h.trim().toLowerCase().replace(/\s+/g, '_')
  );

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 2) continue;

    const row: Record<string, string> = {};
    for (let j = 0; j < header.length; j++) {
      row[header[j]] = (values[j] || '').trim();
    }
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}