/* ------------------------------------------------------------------ */
/*  Report Card Visibility Settings                                    */
/*  Persisted in localStorage per tenant                              */
/* ------------------------------------------------------------------ */

export interface ReportCardVisibility {
  header: boolean;
  titleBar: boolean;
  studentPhoto: boolean;
  studentInfo: boolean;
  subjectTable: boolean;
  subjectsTakenLine: boolean;
  summaryStats: boolean;
  positionSection: boolean;
  teacherRemark: boolean;
  principalRemark: boolean;
  resumptionInfo: boolean;
  signatures: boolean;
  gradingKey: boolean;
  footer: boolean;
}

const DEFAULT_VISIBILITY: ReportCardVisibility = {
  header: true,
  titleBar: true,
  studentPhoto: true,
  studentInfo: true,
  subjectTable: true,
  subjectsTakenLine: true,
  summaryStats: true,
  positionSection: true,
  teacherRemark: true,
  principalRemark: true,
  resumptionInfo: true,
  signatures: true,
  gradingKey: true,
  footer: true,
};

const STORAGE_KEY_PREFIX = "sims_rc_visibility_";

export function getReportCardVisibility(tenantId: string | null): ReportCardVisibility {
  if (typeof window === "undefined") return DEFAULT_VISIBILITY;
  try {
    const key = tenantId ? `${STORAGE_KEY_PREFIX}${tenantId}` : `${STORAGE_KEY_PREFIX}default`;
    const raw = localStorage.getItem(key);
    if (raw) {
      return { ...DEFAULT_VISIBILITY, ...JSON.parse(raw) };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_VISIBILITY };
}

export function saveReportCardVisibility(
  tenantId: string | null,
  settings: ReportCardVisibility
): void {
  if (typeof window === "undefined") return;
  try {
    const key = tenantId ? `${STORAGE_KEY_PREFIX}${tenantId}` : `${STORAGE_KEY_PREFIX}default`;
    localStorage.setItem(key, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

export function resetReportCardVisibility(tenantId: string | null): ReportCardVisibility {
  saveReportCardVisibility(tenantId, DEFAULT_VISIBILITY);
  return { ...DEFAULT_VISIBILITY };
}

export const SECTION_LABELS: Record<keyof ReportCardVisibility, { label: string; description: string }> = {
  header: { label: "School Header", description: "School name, logo, motto and address" },
  titleBar: { label: "Title Bar", description: "Term and session title strip" },
  studentPhoto: { label: "Student Photo", description: "Passport photograph" },
  studentInfo: { label: "Student Information", description: "Name, class, session, reg number, gender" },
  subjectTable: { label: "Subject Scores Table", description: "CA, exam scores, grades and remarks" },
  subjectsTakenLine: { label: "Subjects Taken Line", description: "Summary line showing subjects count and total" },
  summaryStats: { label: "Summary Statistics", description: "Total score, average, overall grade, subjects" },
  positionSection: { label: "Position Section", description: "Class position and overall position" },
  teacherRemark: { label: "Teacher's Remark", description: "Class teacher's comment" },
  principalRemark: { label: "Principal's Comment", description: "Principal's comment" },
  resumptionInfo: { label: "Attendance & Resumption", description: "School days attended and next term date" },
  signatures: { label: "Signatures", description: "Class teacher and principal signatures" },
  gradingKey: { label: "Grading Key", description: "Grade scale reference table" },
  footer: { label: "Footer", description: "Generated date and system attribution" },
};

export const SECTION_GROUPS: { group: string; keys: (keyof ReportCardVisibility)[] }[] = [
  { group: "Header & Identity", keys: ["header", "titleBar"] },
  { group: "Student Details", keys: ["studentPhoto", "studentInfo"] },
  { group: "Academic Scores", keys: ["subjectTable", "subjectsTakenLine", "summaryStats"] },
  { group: "Position & Rankings", keys: ["positionSection"] },
  { group: "Comments & Feedback", keys: ["teacherRemark", "principalRemark"] },
  { group: "Administrative", keys: ["resumptionInfo", "signatures", "gradingKey", "footer"] },
];
