"use client";

import { useState, useEffect, useMemo, useCallback, useRef, Fragment } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/store/index";
import {
  Award,
  FileText,
  Printer,
  Loader2 as Loader2Icon,
  RefreshCw,
  ArrowLeft,
  Users,
  TrendingUp,
  CheckCircle2,
  XCircle,
  X,
  Trophy,
  Settings2,
  MapPin,
  Phone,
  Mail,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type ReportCardVisibility,
  getReportCardVisibility,
  saveReportCardVisibility,
} from "@/lib/report-card-settings";
import { ReportCardSettingsDialog } from "@/components/results/report-card-settings-dialog";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Session {
  id: string;
  sessionOne: string;
  sessionTwo: string;
  active: string;
}

interface ClassItem {
  id: string;
  title: string;
}

interface StudentRecord {
  id: string;
  session: string;
  class: string;
  term: string;
  fullname: string;
  totalScore: number;
  average: number;
  percentage: number;
  subjectsTaken: number;
  subjectsPassed: number;
  subjectsFailed: number;
  classPosition: number;
  overallPosition: number;
  totalStudents: number;
}

interface ExamScoreDetail {
  id: string;
  fullname: string;
  subject: string;
  firstCa: number;
  secondCa: number;
  thirdCa: number;
  exam: number;
  total: number;
}

interface StudentData {
  id: string;
  regNo: string;
  fullname: string;
  gender: string;
  class: string;
  imageUrl: string;
  dateOfBirth: string;
  department: string;
}

interface SchoolSettings {
  id: string;
  caCount: number;
  ca1Max: number;
  ca2Max: number;
  ca3Max: number;
  ca1Label: string;
  ca2Label: string;
  ca3Label: string;
  examMax: number;
  examLabel: string;
  totalMax: number;
}

/* ===== CUMULATIVE TYPES (Option E — Smart Cumulative) ===== */

interface TermScoreInfo {
  score: number;
  source: "exam" | "previous" | "absent";
}

interface StudentCumulativeInfo {
  studentId: string;
  studentName: string;
  regNumber: string;
  termScores: Record<number, TermScoreInfo>;
  availableTermsCount: number;
  cumulativeTotal: number;
  cumulativeAvg: number;
  rank: number;
}

interface SubjectCumulativeData {
  subjectId: string;
  students: StudentCumulativeInfo[];
}

interface CumulativeApiResponse {
  success: boolean;
  data?: {
    subjects: SubjectCumulativeData[];
    currentTerm: number;
    maxAvailableTerms: number;
    requestedTerms: number;
    missingTerms: number[];
  };
}

/* ------------------------------------------------------------------ */
/*  Grading helpers                                                    */
/* ------------------------------------------------------------------ */

function getGrade(score: number, classTitle: string): { grade: string; remark: string; color: string } {
  const isJss = classTitle.toUpperCase().startsWith("JSS");
  if (isJss) {
    if (score >= 70) return { grade: "A", remark: "Excellent", color: "bg-emerald-100 text-emerald-800" };
    if (score >= 60) return { grade: "B", remark: "Very Good", color: "bg-blue-100 text-blue-800" };
    if (score >= 50) return { grade: "C", remark: "Good", color: "bg-yellow-100 text-yellow-800" };
    if (score >= 40) return { grade: "P", remark: "Pass", color: "bg-orange-100 text-orange-800" };
    return { grade: "F", remark: "Fail", color: "bg-red-100 text-red-800" };
  }
  if (score >= 75) return { grade: "A1", remark: "Distinction", color: "bg-emerald-100 text-emerald-800" };
  if (score >= 70) return { grade: "B2", remark: "V.Good", color: "bg-teal-100 text-teal-800" };
  if (score >= 65) return { grade: "B3", remark: "Good", color: "bg-cyan-100 text-cyan-800" };
  if (score >= 60) return { grade: "C4", remark: "Credit", color: "bg-sky-100 text-sky-800" };
  if (score >= 55) return { grade: "C5", remark: "Credit", color: "bg-blue-100 text-blue-800" };
  if (score >= 50) return { grade: "C6", remark: "Credit", color: "bg-indigo-100 text-indigo-800" };
  if (score >= 45) return { grade: "D7", remark: "Pass", color: "bg-yellow-100 text-yellow-800" };
  if (score >= 40) return { grade: "E8", remark: "Pass", color: "bg-orange-100 text-orange-800" };
  return { grade: "F9", remark: "Fail", color: "bg-red-100 text-red-800" };
}

function overallGrade(average: number): { grade: string; color: string } {
  if (average >= 70) return { grade: "Excellent", color: "bg-emerald-600" };
  if (average >= 60) return { grade: "Very Good", color: "bg-teal-600" };
  if (average >= 50) return { grade: "Good", color: "bg-yellow-600" };
  if (average >= 40) return { grade: "Pass", color: "bg-orange-600" };
  return { grade: "Fail", color: "bg-red-600" };
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function extractClassBase(cls: string): string {
  const match = cls.match(/^(JSS\s*\d|SSS\s*\d)/i);
  if (!match) return "";
  return match[1].replace(/\s+/g, "").toUpperCase();
}

function fmt(n: number): string {
  if (n === 0 || !Number.isFinite(n)) return "0";
  return Number.isInteger(n) ? String(n) : parseFloat(n.toFixed(1)).toString();
}

const TERM_CARDS = [
  { term: "First Term", gradient: "from-emerald-600 to-teal-700", accent: "border-emerald-200" },
  { term: "Second Term", gradient: "from-amber-600 to-orange-700", accent: "border-amber-200" },
  { term: "Third Term", gradient: "from-rose-600 to-pink-700", accent: "border-rose-200" },
] as const;

const DEFAULT_SCHOOL_SETTINGS: SchoolSettings = {
  id: "",
  caCount: 1,
  ca1Max: 40,
  ca2Max: 20,
  ca3Max: 20,
  ca1Label: "1st CA",
  ca2Label: "2nd CA",
  ca3Label: "3rd CA",
  examMax: 60,
  examLabel: "Exam",
  totalMax: 100,
};

/**
 * Map stored CA fields to displayed CA columns based on caCount.
 *
 * For caCount=1: Derive CA from total - exam so it works regardless
 * of which DB field the score was stored in (handles legacy data
 * entered when caCount was different).
 *
 * For caCount>1: Read individual fields left-to-right.
 *
 * caCount=1 -> [total - exam]
 * caCount=2 -> [firstCa, secondCa]
 * caCount=3 -> [firstCa, secondCa, thirdCa]
 */
function mapCaScores(score: { firstCa: number; secondCa: number; thirdCa: number; exam: number; total: number }, caCount: number): number[] {
  if (caCount === 1) {
    return [(score.total || 0) - (score.exam || 0)];
  }
  const allCa = [score.firstCa, score.secondCa, score.thirdCa];
  return allCa.slice(0, caCount);
}

function getInitials(name: string): string {
  return name.split(" ").filter(Boolean).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
}

function getPrimaryColor(color: string | null): string {
  if (color) { const rgb = hexToRgb(color); if (rgb) return color; }
  return "#065f46";
}
function getPrimaryColorLight(color: string | null): string {
  const base = getPrimaryColor(color);
  const rgb = hexToRgb(base);
  if (!rgb) return "#ecfdf5";
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.06)`;
}
function getPrimaryColorMed(color: string | null): string {
  const base = getPrimaryColor(color);
  const rgb = hexToRgb(base);
  if (!rgb) return "#d1fae5";
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`;
}
function getPrimaryColorDarker(color: string | null): string {
  const base = getPrimaryColor(color);
  const rgb = hexToRgb(base);
  if (!rgb) return "#064e3b";
  return `rgb(${Math.max(0, rgb.r - 20)}, ${Math.max(0, rgb.g - 20)}, ${Math.max(0, rgb.b - 20)})`;
}

/* ================================================================== */
/*  ULTRA-COMPAT REPORT CARD STYLES (fits 15 subjects on 1 A4 page)    */
/* ================================================================== */

function buildRCStyles(primaryColor: string | null) {
  const pc = getPrimaryColor(primaryColor);
  const pcDark = getPrimaryColorDarker(primaryColor);
  const pcLight = getPrimaryColorLight(primaryColor);
  const pcMed = getPrimaryColorMed(primaryColor);
  const pcRgb = hexToRgb(pc) || { r: 6, g: 95, b: 70 };

  return {
    card: {
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      maxWidth: 780,
      margin: "0 auto",
      color: "#1a1a1a",
      fontSize: 11,
      lineHeight: 1.25,
    } as React.CSSProperties,

    /* ---- HEADER (compact) ---- */
    header: {
      background: `linear-gradient(135deg, ${pc} 0%, ${pcDark} 100%)`,
      color: "white",
      textAlign: "center" as const,
      borderRadius: "6px 6px 0 0",
      padding: "8px 16px 6px",
    },
    headerInner: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    headerLogoBox: {
      width: 52,
      height: 52,
      borderRadius: "50%",
      border: "2px solid rgba(255,255,255,0.4)",
      background: "rgba(255,255,255,0.1)",
      display: "flex",
      alignItems: "center" as const,
      justifyContent: "center" as const,
      flexShrink: 0,
      overflow: "hidden" as const,
    },
    headerLogoImg: { width: "100%", height: "100%", objectFit: "cover" as const },
    headerLogoInitials: { fontSize: 18, fontWeight: 800, color: "rgba(255,255,255,0.9)", fontFamily: "'Georgia', serif" },
    headerSchoolName: { fontSize: 18, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" as const, lineHeight: 1.15 },
    headerMotto: { fontSize: 9, fontStyle: "italic" as const, opacity: 0.85, marginTop: 1, letterSpacing: 0.3 },
    headerContactRow: {
      display: "flex", flexWrap: "wrap" as const, gap: "2px 12px", justifyContent: "center" as const,
      marginTop: 5, paddingTop: 5, borderTop: "1px solid rgba(255,255,255,0.2)", fontSize: 8, opacity: 0.8,
    },
    headerContactItem: { display: "inline-flex", alignItems: "center", gap: 3 },
    headerContactIcon: { width: 10, height: 10, opacity: 0.7 },

    /* ---- TITLE BAR ---- */
    reportTitle: {
      fontSize: 9, background: pcMed, color: pc, padding: "3px 12px",
      textAlign: "center" as const, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" as const,
      borderTop: `1px solid rgba(${pcRgb.r}, ${pcRgb.g}, ${pcRgb.b}, 0.2)`,
      borderBottom: `1px solid rgba(${pcRgb.r}, ${pcRgb.g}, ${pcRgb.b}, 0.2)`,
    },

    /* ---- BODY ---- */
    body: {
      border: "1px solid #e5e7eb", borderTop: "none",
      borderRadius: "0 0 6px 6px", padding: "8px 10px 6px", background: "white",
    },

    /* ---- INFO GRID (compact) ---- */
    infoGrid: {
      display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1px 12px",
      padding: "5px 8px", background: pcLight,
      border: `1px solid rgba(${pcRgb.r}, ${pcRgb.g}, ${pcRgb.b}, 0.1)`,
      borderRadius: 5, marginBottom: 6, fontSize: 10,
    },
    infoLabel: { color: "#6b7280", fontSize: 9 },
    infoValue: { fontWeight: 600, color: "#111827", fontSize: 10 },

    /* ---- TABLE (ultra-compact for 15+ subjects) ---- */
    tableWrapper: {
      border: "1px solid #d1d5db", borderRadius: 4, overflow: "hidden" as const, marginBottom: 6,
    },
    table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 10 },
    th: {
      background: pc, color: "white", padding: "3px 4px", textAlign: "center" as const,
      fontWeight: 600, fontSize: 8, letterSpacing: 0.3, textTransform: "uppercase" as const,
      borderRight: "1px solid rgba(255,255,255,0.15)",
    },
    thLeft: {
      background: pc, color: "white", padding: "3px 6px", textAlign: "left" as const,
      fontWeight: 600, fontSize: 8, letterSpacing: 0.3, textTransform: "uppercase" as const,
    },
    thLast: {
      background: pc, color: "white", padding: "3px 6px", textAlign: "left" as const,
      fontWeight: 600, fontSize: 8, letterSpacing: 0.3, textTransform: "uppercase" as const,
      borderRight: "none",
    },
    thCum: {
      background: "#1e40af", color: "white", padding: "3px 4px", textAlign: "center" as const,
      fontWeight: 700, fontSize: 7, letterSpacing: 0.3, textTransform: "uppercase" as const,
      borderRight: "1px solid rgba(255,255,255,0.15)",
    },
    td: {
      padding: "2px 4px", textAlign: "center" as const,
      borderBottom: "1px solid #f3f4f6", fontSize: 9,
    },
    tdLeft: {
      padding: "2px 6px", textAlign: "left" as const,
      borderBottom: "1px solid #f3f4f6", fontWeight: 500, fontSize: 9,
    },
    tdAlt: {
      padding: "2px 4px", textAlign: "center" as const,
      borderBottom: "1px solid #f3f4f6", fontSize: 9, background: pcLight,
    },
    tdAltLeft: {
      padding: "2px 6px", textAlign: "left" as const,
      borderBottom: "1px solid #f3f4f6", fontWeight: 500, fontSize: 9, background: pcLight,
    },
    tdCum: {
      padding: "2px 3px", textAlign: "center" as const,
      borderBottom: "1px solid #f3f4f6", fontSize: 8, fontWeight: 600,
      background: "#eff6ff", color: "#1e40af",
    },
    tdCumAlt: {
      padding: "2px 3px", textAlign: "center" as const,
      borderBottom: "1px solid #f3f4f6", fontSize: 8, fontWeight: 600,
      background: "#dbeafe", color: "#1e40af",
    },
    totalRow: {
      padding: "2px 4px", fontWeight: 700, background: pcLight, fontSize: 9,
    },

    /* ---- INLINE SUMMARY (single row, very compact) ---- */
    summaryRow: {
      display: "flex", gap: 0, marginBottom: 5, fontSize: 9, border: `1px solid rgba(${pcRgb.r}, ${pcRgb.g}, ${pcRgb.b}, 0.12)`, borderRadius: 4, overflow: "hidden" as const,
    },
    summaryCell: {
      flex: 1, textAlign: "center" as const, padding: "3px 4px", background: "white",
      borderRight: `1px solid rgba(${pcRgb.r}, ${pcRgb.g}, ${pcRgb.b}, 0.08)`,
    },
    summaryCellLast: {
      flex: 1, textAlign: "center" as const, padding: "3px 4px", background: "white",
    },
    summaryLabelInline: { fontSize: 7, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: 0.3 },
    summaryValueInline: { fontSize: 13, fontWeight: 700, color: pc },

    /* ---- POSITION (inline, compact) ---- */
    positionRow: {
      display: "flex", gap: 8, marginBottom: 5,
    },
    positionBox: {
      flex: 1, border: `1px solid ${pc}`, borderRadius: 4, padding: "4px 8px",
      textAlign: "center" as const, background: pcLight,
    },
    positionBox2: {
      flex: 1, border: "1px solid #b45309", borderRadius: 4, padding: "4px 8px",
      textAlign: "center" as const, background: "#fffbeb",
    },
    positionLabel: { fontSize: 7, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: 0.3 },
    positionValue: { fontSize: 18, fontWeight: 800, color: pc },
    positionValue2: { fontSize: 18, fontWeight: 800, color: "#b45309" },
    positionSub: { fontSize: 8, color: "#6b7280" },

    /* ---- REMARKS (compact) ---- */
    remarkSection: {
      border: `1px solid rgba(${pcRgb.r}, ${pcRgb.g}, ${pcRgb.b}, 0.1)`,
      borderRadius: 4, padding: "5px 8px", marginBottom: 4, background: pcLight,
    },
    remarkTitle: { fontSize: 8, fontWeight: 700, color: pc, marginBottom: 1, textTransform: "uppercase" as const, letterSpacing: 0.5 },
    remarkText: { fontSize: 9, color: "#374151", fontStyle: "italic" as const, minHeight: 16, padding: "1px 0" },

    /* ---- RESUMPTION ---- */
    resumptionBox: {
      background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 4,
      padding: "3px 8px", fontSize: 9, marginBottom: 4, color: "#92400e",
    },

    /* ---- SIGNATURES (compact) ---- */
    signatureGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8, marginBottom: 4 },
    signatureBox: { textAlign: "center" as const },
    signatureLine: { borderTop: `1px dashed #9ca3af`, paddingTop: 3, marginTop: 28 },
    signatureName: { fontSize: 10, fontWeight: 600, color: "#111827", marginTop: 2 },
    signatureLabel: { fontSize: 8, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: 0.3 },
    signatureImg: { width: 70, height: 35, objectFit: "contain" as const, margin: "0 auto", display: "block" },

    /* ---- GRADING KEY (single-line) ---- */
    gradingKeyBox: {
      border: "1px solid #e5e7eb", borderRadius: 4, padding: "3px 8px", background: "#f9fafb", marginBottom: 4,
    },
    gradingKeyTitle: { fontSize: 7, fontWeight: 700, color: "#374151", marginBottom: 1, textTransform: "uppercase" as const, letterSpacing: 0.3 },
    gradingKeyGrid: { display: "flex", flexWrap: "wrap" as const, gap: "0 10px", fontSize: 7, color: "#4b5563" },

    /* ---- FOOTER ---- */
    footerText: { fontSize: 7, color: "#9ca3af", textAlign: "center" as const, marginTop: 4, paddingTop: 4, borderTop: "1px solid #f3f4f6" },

    /* ---- PHOTO (smaller) ---- */
    photoContainer: {
      width: 60, height: 60, borderRadius: 6, border: `2px solid ${pc}`,
      overflow: "hidden" as const, display: "flex", alignItems: "center" as const,
      justifyContent: "center" as const, background: pcLight, flexShrink: 0,
    },
    photoImg: { width: "100%", height: "100%", objectFit: "cover" as const },
    photoInitials: { fontSize: 20, fontWeight: 700, color: pc },

    /* ---- Grade badge ---- */
    gradeBadge: (color: string): React.CSSProperties => ({
      display: "inline-block", padding: "0px 5px", borderRadius: 3,
      fontWeight: 600, fontSize: 9,
      background: color.includes("emerald") ? "#d1fae5" : color.includes("teal") ? "#ccfbf1" : color.includes("cyan") ? "#cffafe" : color.includes("sky") ? "#e0f2fe" : color.includes("blue") ? "#dbeafe" : color.includes("indigo") ? "#e0e7ff" : color.includes("yellow") ? "#fef9c3" : color.includes("orange") ? "#ffedd5" : "#fee2e2",
      color: color.includes("emerald") ? "#065f46" : color.includes("teal") ? "#0f766e" : color.includes("cyan") ? "#0e7490" : color.includes("sky") ? "#0369a1" : color.includes("blue") ? "#1d4ed8" : color.includes("indigo") ? "#4338ca" : color.includes("yellow") ? "#854d0e" : color.includes("orange") ? "#9a3412" : "#991b1b",
    }),
  };
}

/* ================================================================== */
/*  PRINT HTML BUILDER — A4 single page, compact layout                */
/* ================================================================== */

function buildPrintHTML(
  content: string,
  primaryColor: string | null,
  studentName: string
): string {
  const pc = getPrimaryColor(primaryColor);
  const pcRgb = hexToRgb(pc) || { r: 6, g: 95, b: 70 };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Report Card - ${studentName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 6mm 8mm;
    }
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 210mm;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
      font-size: 10pt;
      line-height: 1.2;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: auto;
    }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    th, td {
      border: 1px solid #bbb !important;
      padding: 2pt 3pt !important;
      font-size: 8pt !important;
      text-align: center;
    }
    th {
      background-color: ${pc} !important;
      color: #fff !important;
      font-weight: 600;
      font-size: 7pt !important;
      text-transform: uppercase;
      letter-spacing: 0.2px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    th.cum-header {
      background-color: #1e40af !important;
    }
    td.cum-cell {
      background-color: #eff6ff !important;
      color: #1e40af !important;
      font-weight: 600;
      font-size: 7.5pt !important;
    }
    th[style*="text-align: left"] { text-align: left !important; }
    td[style*="text-align: left"]  { text-align: left !important; }
    /* Only restrict non-watermark images (passport, logos in header) */
    img:not(.wm-img) { max-width: 55px !important; max-height: 55px !important; }
    svg { width: 9px; height: 9px; display: inline-block; vertical-align: middle; }
    div, span, td, th {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body { overflow: hidden; }
    .missing-terms-notice {
      background-color: #fef3c7 !important;
      border: 1px solid #fbbf24 !important;
      color: #92400e !important;
      padding: 4px 8px;
      font-size: 7pt;
      border-radius: 4px;
      margin-top: 6px;
    }
    /* ===== WATERMARK: tiled across the page ===== */
    .watermark-overlay {
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      pointer-events: none;
      z-index: 9999;
      overflow: hidden;
    }
    .watermark-overlay img {
      position: absolute;
      width: 140px;
      height: 140px;
      opacity: 0.06;
      object-fit: contain;
      transform: rotate(-30deg);
    }
    .watermark-overlay .wm-1 { top: 10%; left: 8%; }
    .watermark-overlay .wm-2 { top: 10%; right: 8%; }
    .watermark-overlay .wm-3 { top: 38%; left: 20%; }
    .watermark-overlay .wm-4 { top: 38%; right: 20%; }
    .watermark-overlay .wm-5 { top: 65%; left: 12%; }
    .watermark-overlay .wm-6 { top: 65%; right: 12%; }
    .watermark-overlay .wm-7 { top: 88%; left: 30%; }
    .watermark-overlay .wm-8 { top: 88%; right: 30%; }
    /* Hide screen watermark in print window */
    [data-watermark-screen] { display: none !important; }
  </style>
</head>
<body>
 ${content}
  <script>
    // Auto-scale report card to fill A4 page
    (function() {
      var card = document.querySelector('[data-report-card]');
      if (!card) return;
      setTimeout(function() {
        var pageW = document.documentElement.clientWidth || 794;
        var pageH = document.documentElement.clientHeight || 1123;
        var cardW = card.scrollWidth;
        var cardH = card.scrollHeight;
        var scaleX = pageW / cardW;
        var scaleY = pageH / cardH;
        var scale = Math.min(scaleX, scaleY, 1.35);
        if (scale > 1.01) {
          card.style.transformOrigin = 'top left';
          card.style.transform = 'scale(' + scale + ')';
          card.style.width = (cardW * scale) + 'px';
          card.style.height = (cardH * scale) + 'px';
        }
      }, 300);
    })();
  </script>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ResultView() {
  const { tenant } = useAppStore();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [records, setRecords] = useState<StudentRecord[]>([]);

  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedClass, setSelectedClass] = useState("");

  const [loading, setLoading] = useState(false);
  const [computing, setComputing] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportStudent, setReportStudent] = useState<StudentRecord | null>(null);
  const [reportScores, setReportScores] = useState<ExamScoreDetail[]>([]);
  const [reportLoading, setReportLoading] = useState(false);

  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [teacherRemark, setTeacherRemark] = useState("");
  const [principalRemark, setPrincipalRemark] = useState("");
  const [teacherSignature, setTeacherSignature] = useState<{ name: string; imageUrl: string } | null>(null);
  const [principalSignature, setPrincipalSignature] = useState<{ name: string; imageUrl: string } | null>(null);
  const [resumptionInfo, setResumptionInfo] = useState<{ openTerm: string; nextTerm: string; noSchoolOpen: number } | null>(null);
  const [overallTotalStudents, setOverallTotalStudents] = useState(0);

  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>(DEFAULT_SCHOOL_SETTINGS);

  const [visibility, setVisibility] = useState<ReportCardVisibility>(() =>
    getReportCardVisibility(tenant?.id ?? null)
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  /* ===== CUMULATIVE STATE (Option E) ===== */
  const [cumulativeData, setCumulativeData] = useState<Record<string, SubjectCumulativeData>>({});
  const [cumulativeInfo, setCumulativeInfo] = useState<{
    currentTerm: number;
    maxAvailableTerms: number;
    requestedTerms: number;
    missingTerms: number[];
  } | null>(null);
  /* ===== FALLBACK SUBJECT RANK (for first term when cumulative API is skipped) ===== */
  const [subjectRanks, setSubjectRanks] = useState<Record<string, number>>({});

  const printAreaRef = useRef<HTMLDivElement>(null);
  const RC = buildRCStyles(tenant?.primaryColor ?? null);

  /* ================================================================ */
  /*  Fetch master data                                                */
  /* ================================================================ */

  useEffect(() => {
    (async () => {
      try {
        const [sRes, cRes] = await Promise.all([fetch("/api/sessions"), fetch("/api/classes")]);
        const sData: Session[] = sRes.ok ? await sRes.json() : [];
        const cData: ClassItem[] = cRes.ok ? await cRes.json() : [];
        setSessions(sData);
        setClasses(cData);
        const active = sData.find((s) => s.active === "Yes");
        if (active) setSelectedSession(`${active.sessionOne}/${active.sessionTwo}`);
      } catch { /* ignore */ }
    })();
  }, []);

  /* ================================================================ */
  /*  Fetch school settings                                             */
  /* ================================================================ */

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings?type=school-settings");
        if (res.ok) { const data = await res.json(); if (data && data.id) setSchoolSettings(data); }
      } catch { /* use defaults */ }
    })();
  }, []);

  /* ================================================================ */
  /*  Compute results                                                  */
  /* ================================================================ */

  const computeResults = useCallback(async () => {
    if (!selectedSession || !selectedClass || !selectedTerm) { toast.error("Please select session, class and term"); return; }
    setComputing(true); setLoading(true);
    try {
      const params = new URLSearchParams({ session: selectedSession, class: selectedClass, term: selectedTerm });
      const res = await fetch(`/api/results/compute?${params}`);
      const data = await res.json();
      if (!res.ok || !data.success) { toast.error(data.message || "Failed to compute results"); return; }
      toast.success(data.message);
      const recRes = await fetch(`/api/results?${params}`);
      if (recRes.ok) {
        const allRecs = await recRes.json();
        // Also fetch actual exam scores to filter students who have no scores
        const scoreRes = await fetch(`/api/exams?${params}`);
        let studentsWithScores = new Set<string>();
        if (scoreRes.ok) {
          const scores = await scoreRes.json();
          const currentTermFiltered = scores;
          // Case-insensitive: store normalized fullnames
          studentsWithScores = new Set(
            (scores as any[]).map((s: any) => (s.fullname || "").trim().toUpperCase().replace(/\s+/g, " "))
          );
        }
        // Only show students who actually have exam scores (case-insensitive match)
        const filteredRecs = allRecs.filter((r: any) =>
          studentsWithScores.has((r.fullname || "").trim().toUpperCase().replace(/\s+/g, " "))
        );
        setRecords(filteredRecs);
      }

      const classBase = extractClassBase(selectedClass);
      if (classBase) {
        const allRes = await fetch(`/api/results?${new URLSearchParams({ session: selectedSession, term: selectedTerm })}`);
        if (allRes.ok) {
          const allRecs: StudentRecord[] = await allRes.json();
          setOverallTotalStudents(new Set(allRecs.filter((r) => extractClassBase(r.class) === classBase).map((r) => r.fullname)).size);
        }
      }
    } catch { toast.error("Network error"); }
    finally { setComputing(false); setLoading(false); }
  }, [selectedSession, selectedClass, selectedTerm]);

  useEffect(() => {
    if (selectedSession && selectedClass && selectedTerm) computeResults();
  }, [selectedSession, selectedClass, selectedTerm, computeResults]);

  /* ================================================================ */
  /*  Report card                                                      */
  /* ================================================================ */

  async function openReportCard(record: StudentRecord) {
    setReportStudent(record); setReportOpen(true); setReportLoading(true);
    setStudentData(null); setTeacherRemark(""); setPrincipalRemark("");
    setTeacherSignature(null); setPrincipalSignature(null); setResumptionInfo(null);
    setCumulativeData({}); setCumulativeInfo(null); setSubjectRanks({});
    try {
      const params = new URLSearchParams({ session: selectedSession, class: selectedClass, term: selectedTerm, fullname: record.fullname });
      const [scoreRes, studentRes, teacherRemarkRes, principalRemarkRes, signaturesRes, resumptionRes] = await Promise.all([
        fetch(`/api/exams?${params}`), fetch(`/api/students?q=${encodeURIComponent(record.fullname)}`),
        fetch("/api/settings?type=teacher-remarks"), fetch("/api/settings?type=principal-remarks"),
        fetch("/api/settings?type=signatures"), fetch("/api/settings?type=resumptions"),
      ]);

      /* Current term scores - saved to local var for reuse in cumulative calc */
      let currentTermFiltered: ExamScoreDetail[] = [];
      if (scoreRes.ok) {
        const scores = await scoreRes.json();
        if (!scores || scores.length === 0) {
          toast.error("No scores found for this student. Scores must be entered first.");
          setReportLoading(false);
          setReportOpen(false);
          return;
        }
        /* Hide subjects where both CA and Exam are 0 */
        const filtered = (scores || []).filter((s: any) => {
          const caTotal = (s.firstCa || 0) + (s.secondCa || 0) + (s.thirdCa || 0);
          const examVal = Number(s.exam) || 0;
          return caTotal > 0 || examVal > 0;
        });
        currentTermFiltered = filtered as ExamScoreDetail[];
        setReportScores(filtered);
      } else {
        setReportScores([]);
      }

      if (studentRes.ok) {
        const students = await studentRes.json();
        setStudentData(students.find((s: StudentData) => s.fullname.toLowerCase() === record.fullname.toLowerCase()) || null);
      }

      if (teacherRemarkRes.ok) {
        const remarks = await teacherRemarkRes.json();
        const studentName = (record.fullname || "").toLowerCase();
        const found = remarks?.find((r: any) => {
          const sessMatch = r.session === selectedSession || r.session?.trim() === selectedSession?.trim();
          const rTerm = (r.term || "").trim().toLowerCase();
          const sTerm = selectedTerm.trim().toLowerCase();
          const termMatch = rTerm === sTerm || rTerm.includes(sTerm) || sTerm.includes(rTerm);
          const studentMatch = !r.studentName || (r.studentName || "").toLowerCase() === studentName;
          return sessMatch && termMatch && studentMatch;
        });
        setTeacherRemark(found?.remark || "");
      }

      if (principalRemarkRes.ok) {
        const remarks = await principalRemarkRes.json();
        const studentName = (record.fullname || "").toLowerCase();
        const found = remarks?.find((r: any) => {
          const sessMatch = r.session === selectedSession || r.session?.trim() === selectedSession?.trim();
          const rTerm = (r.term || "").trim().toLowerCase();
          const sTerm = selectedTerm.trim().toLowerCase();
          const termMatch = rTerm === sTerm || rTerm.includes(sTerm) || sTerm.includes(rTerm);
          const studentMatch = !r.studentName || (r.studentName || "").toLowerCase() === studentName;
          return sessMatch && termMatch && studentMatch;
        });
        setPrincipalRemark(found?.remark || "");
      }

      if (signaturesRes.ok) {
        const sigs = await signaturesRes.json();
        if (sigs.teacherSignature) setTeacherSignature(sigs.teacherSignature);
        if (sigs.principalSignature) setPrincipalSignature(sigs.principalSignature);
      }

      if (resumptionRes.ok) {
        const resumptions = await resumptionRes.json();
        const m = resumptions.find((r: any) => r.session === selectedSession && r.term === selectedTerm);
        if (m) setResumptionInfo({ openTerm: m.openTerm, nextTerm: m.nextTermLabel || m.nextTerm, noSchoolOpen: m.noSchoolOpen });
      }

      /* ===== CUMULATIVE: Direct fetch per previous term (reliable) ===== */
      const termNum = selectedTerm === "First Term" ? 1 : selectedTerm === "Second Term" ? 2 : 3;
      if (termNum >= 2) {
        try {
          const prevTermNames: Record<number, string> = { 1: "First Term", 2: "Second Term" };
          const prevScoresMap: Record<number, ExamScoreDetail[]> = {};

          // Fetch each previous term's scores directly for this student
          const prevFetches: Promise<void>[] = [];
          for (let t = 1; t < termNum; t++) {
            const tNum = t;
            prevFetches.push(
              (async () => {
                try {
                  const p = new URLSearchParams({
                    session: selectedSession,
                    class: selectedClass,
                    term: prevTermNames[tNum],
                    fullname: record.fullname,
                  });
                  const r = await fetch(`/api/exams?${p}`);
                  if (r.ok) {
                    prevScoresMap[tNum] = await r.json();
                  }
                } catch { /* individual term fetch failed, skip */ }
              })()
            );
          }
          await Promise.all(prevFetches);

          // Also fetch ALL class scores for each term (for ranking)
          const classScoresMap: Record<number, ExamScoreDetail[]> = {};
          const classFetches: Promise<void>[] = [];
          for (let t = 1; t <= termNum; t++) {
            const tNum = t;
            classFetches.push(
              (async () => {
                try {
                  const p = new URLSearchParams({
                    session: selectedSession,
                    class: selectedClass,
                    term: tNum === 1 ? "First Term" : tNum === 2 ? "Second Term" : "Third Term",
                  });
                  const r = await fetch(`/api/exams?${p}`);
                  if (r.ok) {
                    classScoresMap[tNum] = await r.json();
                  }
                } catch { /* skip */ }
              })()
            );
          }
          await Promise.all(classFetches);

          // Use the current term scores saved earlier (before response body was consumed)
          const currentScores = currentTermFiltered;

          // Build cumulative data structure (same shape as before, so rendering code works unchanged)
          const dataMap: Record<string, SubjectCumulativeData> = {};
          const availableTermsSet = new Set<number>();
          const allSubjects = new Set<string>();

          // Collect all subjects across all terms for this student
          for (let t = 1; t <= termNum; t++) {
            const termScores = t < termNum ? (prevScoresMap[t] || []) : currentScores;
            for (const sc of termScores) {
              allSubjects.add(sc.subject);
              if (sc.total > 0) availableTermsSet.add(t);
            }
          }

          // Track missing terms
          const missingTerms: number[] = [];
          for (let t = 1; t < termNum; t++) {
            if (!availableTermsSet.has(t)) missingTerms.push(t);
          }
          const maxAvailableTerms = availableTermsSet.size || 1;

          // Build per-subject cumulative data for this student + class ranks
          for (const subjectName of allSubjects) {
            const stuTermScores: Record<number, TermScoreInfo> = {};
            let cumTotal = 0;
            let termsWithData = 0;

            for (let t = 1; t <= termNum; t++) {
              const termScores = t < termNum ? (prevScoresMap[t] || []) : currentScores;
              const sc = termScores.find(
                (s) => s.subject.toLowerCase() === subjectName.toLowerCase()
              );
              if (sc && sc.total > 0) {
                const hasCA = (sc.firstCa > 0 || sc.secondCa > 0 || sc.thirdCa > 0);
                const isAbsent = (sc.exam === 0 || sc.exam == null) && hasCA;
                stuTermScores[t] = {
                  score: sc.total,
                  source: isAbsent ? "absent" : "exam",
                };
                if (!isAbsent) {
                  cumTotal += sc.total;
                  termsWithData++;
                }
              }
            }

            const cumAvg = termsWithData > 0
              ? parseFloat((cumTotal / termsWithData).toFixed(1))
              : 0;

            // Build full students list for this subject (for ranking)
            const allClassStudents: StudentCumulativeInfo[] = [];
            const classAllTermScores: Record<number, ExamScoreDetail[]> = {};
            for (let t = 1; t <= termNum; t++) {
              classAllTermScores[t] = classScoresMap[t] || [];
            }

            // Get unique students who have this subject across any term
            const studentNames = new Set<string>();
            for (let t = 1; t <= termNum; t++) {
              for (const s of classAllTermScores[t]) {
                if (s.subject.toLowerCase() === subjectName.toLowerCase() && s.total > 0) {
                  studentNames.add(s.fullname);
                }
              }
            }

            for (const stuName of studentNames) {
              const sTermScores: Record<number, TermScoreInfo> = {};
              let sCumTotal = 0;
              let sTermsData = 0;

              for (let t = 1; t <= termNum; t++) {
                const sc = classAllTermScores[t].find(
                  (s) => s.fullname.toLowerCase() === stuName.toLowerCase() && s.subject.toLowerCase() === subjectName.toLowerCase()
                );
                if (sc && sc.total > 0) {
                  const hasCA = (sc.firstCa > 0 || sc.secondCa > 0 || sc.thirdCa > 0);
                  const isAbsent = (sc.exam === 0 || sc.exam == null) && hasCA;
                  sTermScores[t] = { score: sc.total, source: isAbsent ? "absent" : "exam" };
                  if (!isAbsent) { sCumTotal += sc.total; sTermsData++; }
                }
              }

              const sCumAvg = sTermsData > 0
                ? parseFloat((sCumTotal / sTermsData).toFixed(1))
                : 0;

              allClassStudents.push({
                studentId: stuName,
                studentName: stuName,
                regNumber: "",
                termScores: sTermScores,
                availableTermsCount: sTermsData,
                cumulativeTotal: parseFloat(sCumTotal.toFixed(1)),
                cumulativeAvg: sCumAvg,
                rank: 0,
              });
            }

            // Sort and rank
            allClassStudents.sort((a, b) => b.cumulativeAvg - a.cumulativeAvg);
            for (let i = 0; i < allClassStudents.length; i++) {
              if (i === 0) {
                allClassStudents[i].rank = 1;
              } else if (allClassStudents[i].cumulativeAvg < allClassStudents[i - 1].cumulativeAvg) {
                allClassStudents[i].rank = i + 1;
              } else {
                allClassStudents[i].rank = allClassStudents[i - 1].rank;
              }
            }

            dataMap[subjectName] = {
              subjectId: subjectName,
              students: allClassStudents,
            };
          }

          setCumulativeData(dataMap);
          setCumulativeInfo({
            currentTerm: termNum,
            maxAvailableTerms,
            requestedTerms: termNum,
            missingTerms,
          });
        } catch (err) {
          console.warn("[ReportCard] Direct cumulative fetch failed:", err);
          toast.warning("Some previous term scores could not be loaded. Check your network and reopen the report card.");
        }
      } else {
        setCumulativeData({});
        setCumulativeInfo(null);
      }

      /* ===== FALLBACK: Compute subject ranks from ALL class scores ===== */
      try {
        const allScoresParams = new URLSearchParams({
          session: selectedSession,
          class: selectedClass,
          term: selectedTerm,
        });
        const allScoresRes = await fetch(`/api/exams?${allScoresParams}`);
        if (allScoresRes.ok) {
          const allClassScores: ExamScoreDetail[] = await allScoresRes.json();
          const subjectScoreMap = new Map<string, { fullname: string; total: number }[]>();
          for (const sc of allClassScores) {
            if (!subjectScoreMap.has(sc.subject)) subjectScoreMap.set(sc.subject, []);
            subjectScoreMap.get(sc.subject)!.push({ fullname: sc.fullname, total: sc.total });
          }
          const ranks: Record<string, number> = {};
          for (const [subject, entries] of subjectScoreMap) {
            entries.sort((a, b) => b.total - a.total);
            let rank = 1;
            entries.forEach((entry, idx) => {
              if (idx > 0 && entry.total < entries[idx - 1].total) {
                rank = idx + 1;
              }
              if (entry.fullname.toLowerCase() === record.fullname.toLowerCase()) {
                ranks[subject] = rank;
              }
            });
          }
          setSubjectRanks(ranks);
        }
      } catch (err) { console.log("[SubjectRanks] Error:", err); }

    } catch { setReportScores([]); }
    finally { setReportLoading(false); }
  }



  /* ================================================================ */
  /*  Print — dedicated window for perfect A4 single-page output       */
  /* ================================================================ */

  function handlePrint() {
    const printArea = document.getElementById("report-card-print-area");
    if (!printArea) return;

    // Clone the print area so we can modify it for print without affecting the screen view
    const cloned = printArea.cloneNode(true) as HTMLElement;

    // 1) Hide the screen-only watermark (single centered image)
    const screenWm = cloned.querySelector('[data-watermark-screen]');
    if (screenWm) (screenWm as HTMLElement).style.display = 'none';

    // 2) Show the print watermark overlay (8 tiled images across the page)
    const printWm = cloned.querySelector('.watermark-overlay');
    if (printWm) (printWm as HTMLElement).style.display = 'block';

    const htmlContent = cloned.innerHTML;
    const studentName = reportStudent?.fullname || "Student";
    const printWindow = window.open("", "_blank", "width=800,height=1000");
    if (!printWindow) { toast.error("Please allow pop-ups to print the report card"); return; }
    printWindow.document.write(buildPrintHTML(htmlContent, tenant?.primaryColor ?? null, studentName));
    printWindow.document.close();
    printWindow.focus();

    const images = printWindow.document.querySelectorAll("img");
    let imagesLoaded = 0;
    let printCalled = false;
    // Wait extra time for the auto-scale script + watermark images to finish
    const tryPrint = () => { if (printCalled) return; printCalled = true; printWindow.print(); };
    const checkAllLoaded = () => { imagesLoaded++; if (imagesLoaded >= images.length) setTimeout(tryPrint, 600); };
    if (images.length === 0) { setTimeout(tryPrint, 600); }
    else {
      images.forEach((img) => { if ((img as HTMLImageElement).complete) checkAllLoaded(); else { img.addEventListener("load", checkAllLoaded); img.addEventListener("error", checkAllLoaded); } });
      setTimeout(() => { if (!printCalled) tryPrint(); }, 5000);
    }
    printWindow.addEventListener("afterprint", () => printWindow.close());
  }
  /* ================================================================ */
  /*  Derived                                                          */
  /* ================================================================ */
  const visibleRecords = useMemo(() => {
    // Deduplicate by normalized fullname and filter out zero-score students
    const seen = new Map<string, StudentRecord>();
    for (const r of records) {
      if (r.subjectsTaken <= 0 || r.totalScore <= 0) continue;
      const key = r.fullname.trim().toUpperCase().replace(/\s+/g, " ");
      if (!seen.has(key)) {
        seen.set(key, r);
      }
    }
    return Array.from(seen.values());
  }, [records]);

  const caCount = schoolSettings.caCount || 1;
  const pc = getPrimaryColor(tenant?.primaryColor ?? null);

  /* Build dynamic CA column definitions based on caCount */
  const caColumns = useMemo(() => {
    const cols: { label: string; maxScore: number }[] = [];
    const maxes = [schoolSettings.ca1Max, schoolSettings.ca2Max, schoolSettings.ca3Max];
    for (let i = 0; i < caCount; i++) {
      const label = caCount === 1 ? "CA" : `CA${i + 1}`;
      cols.push({ label, maxScore: maxes[i] || 20 });
    }
    return cols;
  }, [caCount, schoolSettings]);

  /* ===== CUMULATIVE FLAGS ===== */
  const isSecondTerm = selectedTerm === "Second Term";
  const isThirdTerm = selectedTerm === "Third Term";
  const isCumulative = isSecondTerm || isThirdTerm;

  const prevTerms: number[] = isThirdTerm ? [1, 2] : isSecondTerm ? [1] : [];

  // Hide subjects where both CA and Exam are 0
  const visibleScores = useMemo(() => {
    return reportScores.filter((sc) => {
      const hasCa = (sc.firstCa > 0) || (sc.secondCa > 0) || (sc.thirdCa > 0);
      const hasExam = sc.exam > 0;
      return hasCa || hasExam;
    });
  }, [reportScores]);

  const columnTotals_calc = reportScores.length > 0
    ? (() => {
      const caTotals: number[] = new Array(caCount).fill(0);
      reportScores.forEach((sc) => {
        const mapped = mapCaScores(sc, caCount);
        mapped.forEach((val, i) => { caTotals[i] += val || 0; });
      });
      return {
        caTotals: caTotals.map(t => parseFloat(t.toFixed(1))),
        examTotal: parseFloat(reportScores.reduce((s, e) => s + (e.exam || 0), 0).toFixed(1)),
      };
    })()
    : { caTotals: new Array(caCount).fill(0) as number[], examTotal: 0 };

  const studentTotalFromScores = parseFloat(reportScores.reduce((s, e) => s + (e.total || 0), 0).toFixed(1));
  const subjectsTakenFromScores = reportScores.length;

  /* ===== HELPER: Get this student's cumulative info for a subject ===== */
  function getStudentCumForSubject(subjectId: string): StudentCumulativeInfo | undefined {
    return cumulativeData[subjectId]?.students.find(
      (s) => s.studentName.toLowerCase() === (reportStudent?.fullname || "").toLowerCase()
    );
  }

  /* ===== HELPER: Render a term score cell ===== */
  function renderTermScoreCell(
    termNum: number,
    stuInfo: StudentCumulativeInfo | undefined,
    isAlt: boolean
  ) {
    const ts = stuInfo?.termScores[termNum];
    const style = isAlt ? RC.tdCumAlt : RC.tdCum;
    if (ts) {
      if (ts.source === "absent") {
        return (
          <td className="cum-cell" style={style}>
            <span style={{ color: "#dc2626", fontWeight: 700, fontSize: 8 }}>ABS</span>
          </td>
        );
      }
      return (
        <td className="cum-cell" style={style}>
          {fmt(ts.score)}
          {ts.source === "previous" && (
            <sup style={{ fontSize: 7, color: "#b45309", marginLeft: 1 }}>M</sup>
          )}
        </td>
      );
    }
    return (
      <td className="cum-cell" style={style}>
        <span style={{ color: "#aaa" }}>—</span>
      </td>
    );
  }

  /* ===== SMART CUMULATIVE SUMMARY VALUES ===== */
  // Sum cumulative totals across all subjects for the current student
  let cumGrandTotal = 0;
  let cumGrandAvg = 0;
  const termsUsedCount = cumulativeInfo?.maxAvailableTerms || (isThirdTerm ? 3 : isSecondTerm ? 2 : 1);

  if (isCumulative) {
    let totalCumSum = 0;
    let subjectsWithCumData = 0;
    for (const sc of reportScores) {
      const stuCum = getStudentCumForSubject(sc.subject);
      if (stuCum && stuCum.cumulativeAvg > 0) {
        totalCumSum += stuCum.cumulativeAvg;
        subjectsWithCumData++;
      } else if (!isCumulative) {
        totalCumSum += sc.total || 0;
        subjectsWithCumData++;
      }
    }
    cumGrandTotal = parseFloat(reportScores.reduce((s, sc) => {
      const stuCum = getStudentCumForSubject(sc.subject);
      return s + (stuCum?.cumulativeTotal ?? sc.total);
    }, 0).toFixed(1));
    cumGrandAvg = subjectsWithCumData > 0
      ? parseFloat((totalCumSum / subjectsWithCumData).toFixed(1))
      : 0;
  }

  const displayTotalScore = parseFloat((isCumulative ? cumGrandTotal : studentTotalFromScores).toFixed(1));
  const displayAverage = isCumulative && cumGrandAvg > 0 ? cumGrandAvg : (reportStudent?.average ?? 0);

  /* ===== PASSED / FAILED COUNTS ===== */
  const reportPassedCount = reportScores.filter((sc) => {
    if (isCumulative) {
      const stuCum = getStudentCumForSubject(sc.subject);
      if (stuCum && stuCum.cumulativeAvg > 0) return stuCum.cumulativeAvg >= 40;
    }
    return (sc.total || 0) >= 40;
  }).length;
  const reportFailedCount = subjectsTakenFromScores - reportPassedCount;

  /* ===== MISSING TERMS INFO ===== */
  const hasMissingTerms = cumulativeInfo ? cumulativeInfo.missingTerms.length > 0 : false;
  const missingTermLabels = cumulativeInfo
    ? cumulativeInfo.missingTerms.map((t) => (t === 1 ? "1st" : t === 2 ? "2nd" : "3rd"))
    : [];

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Student Results</h1>
        <p className="text-sm text-muted-foreground">View and manage student academic performance</p>
      </div>

      {/* ============ TERM CARDS ============ */}
      {!selectedTerm && (
        <div className="grid gap-6 sm:grid-cols-3">
          {TERM_CARDS.map((tc) => (
            <Card key={tc.term} className={`cursor-pointer border-2 transition-all hover:shadow-lg ${tc.accent}`} onClick={() => setSelectedTerm(tc.term)}>
              <CardContent className="p-0">
                <div className={`bg-gradient-to-br ${tc.gradient} p-6 text-center`}>
                  <Award className="mx-auto mb-2 h-10 w-10 text-white" />
                  <h3 className="text-lg font-bold text-white">{tc.term}</h3>
                </div>
                <div className="p-4 text-center"><p className="text-sm text-muted-foreground">Click to view results</p></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ============ FILTERS ============ */}
      {selectedTerm && (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-end gap-4">
              <Button variant="ghost" size="sm" onClick={() => setSelectedTerm("")}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
              <div className="flex-1">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Session</Label>
                    <Select value={selectedSession} onValueChange={setSelectedSession}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select session" /></SelectTrigger>
                      <SelectContent>
                        {sessions.map((s) => (
                          <SelectItem key={s.id} value={`${s.sessionOne}/${s.sessionTwo}`}>
                            {s.sessionOne}/{s.sessionTwo}
                            {s.active === "Yes" && <Badge className="ml-2 bg-emerald-600" variant="default">Active</Badge>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Class</Label>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select class" /></SelectTrigger>
                      <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.title}>{c.title}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Term</Label>
                    <div className="flex h-9 items-center rounded-md border bg-muted/50 px-3 text-sm font-medium">{selectedTerm}</div>
                  </div>
                </div>
              </div>
              <Button onClick={computeResults} disabled={computing}>
                {computing ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Recompute
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============ RESULTS TABLE ============ */}
      {selectedTerm && (
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5" /> Performance Summary
                <Badge variant="secondary">{visibleRecords.length} students</Badge>
              </h3>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : visibleRecords.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No results found. Ensure exam scores have been entered and computed.</p>
              </div>
            ) : (
              <div className="max-h-[480px] overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead className="text-center">Total Score</TableHead>
                      <TableHead className="text-center">Average</TableHead>
                      <TableHead className="text-center">Grade</TableHead>
                      <TableHead className="text-center">Position</TableHead>
                      <TableHead className="text-center">Passed</TableHead>
                      <TableHead className="text-center">Failed</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleRecords.map((rec, idx) => {
                      const og = overallGrade(rec.average);
                      return (
                        <TableRow key={rec.id}>
                          <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-medium">{rec.fullname}</TableCell>
                          <TableCell className="text-center font-semibold">{rec.totalScore}</TableCell>
                          <TableCell className="text-center">{fmt(rec.average)}</TableCell>
                          <TableCell className="text-center"><Badge className={`${og.color} text-white`} variant="default">{og.grade}</Badge></TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="font-semibold">Class: {ordinal(rec.classPosition)}/{rec.totalStudents}</span>
                              <span className="text-xs text-muted-foreground">Overall: {ordinal(rec.overallPosition)}/{overallTotalStudents || rec.totalStudents}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center"><span className="flex items-center justify-center gap-1 text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" />{rec.subjectsPassed}</span></TableCell>
                          <TableCell className="text-center"><span className="flex items-center justify-center gap-1 text-red-600"><XCircle className="h-3.5 w-3.5" />{rec.subjectsFailed}</span></TableCell>
                          <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => openReportCard(rec)}><FileText className="mr-1 h-4 w-4" /> Report</Button></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ============ REPORT CARD DIALOG ============ */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-[96vw] max-h-[94vh] overflow-y-auto p-0 [&>button]:hidden">
          <DialogHeader className="sr-only"><DialogTitle>Report Card</DialogTitle></DialogHeader>
          <div className="sticky top-0 z-10 flex items-center justify-end gap-2 bg-white border-b px-4 py-2">
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)} className="gap-2"><Settings2 className="h-4 w-4" /> Display</Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2"><Printer className="h-4 w-4" /> Print Report</Button>
            <Button variant="destructive" size="sm" onClick={() => setReportOpen(false)} className="gap-2"><X className="h-4 w-4" /> Close</Button>
          </div>

          <div id="report-card-print-area" ref={printAreaRef} style={{ fontFamily: "'Segoe UI', Arial, sans-serif", color: "#000", background: "#fff", position: "relative" }}>

            {/* ===== SCREEN WATERMARK (hidden on print, replaced by tiled print watermark) ===== */}
            {tenant?.logo && (
              <div
                data-watermark-screen
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%) rotate(-30deg)",
                  pointerEvents: "none",
                  zIndex: 50,
                }}
              >
                <img
                  src={tenant.logo}
                  alt=""
                  className="wm-img"
                  style={{
                    width: 200,
                    height: 200,
                    opacity: 0.05,
                    objectFit: "contain",
                  }}
                />
              </div>
            )}

            {/* ===== PRINT WATERMARK (hidden on screen, tiled across page on print) ===== */}
            {tenant?.logo && (
              <div className="watermark-overlay" style={{ display: "none" }}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <img key={n} src={tenant.logo} alt="" className={`wm-img wm-${n}`} />
                ))}
              </div>
            )}

            {reportLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2Icon className="h-7 w-7 animate-spin text-muted-foreground" /></div>
            ) : reportStudent ? (
              <div data-report-card style={RC.card}>

                {/* ======== HEADER ======== */}
                {visibility.header && (
                  <div style={RC.header}>
                    <div style={RC.headerInner}>
                      <div style={RC.headerLogoBox}>
                        {tenant?.logo ? <img src={tenant.logo} alt="School logo" style={RC.headerLogoImg} /> : <span style={RC.headerLogoInitials}>{getInitials(tenant?.name || "School")}</span>}
                      </div>
                      <div>
                        <div style={RC.headerSchoolName}>{tenant?.name || "School Name"}</div>
                        {tenant?.motto && <div style={RC.headerMotto}>&ldquo;{tenant.motto}&rdquo;</div>}
                      </div>
                    </div>
                    <div style={RC.headerContactRow}>
                      {tenant?.address && <span style={RC.headerContactItem}><MapPin style={RC.headerContactIcon} />{tenant.address}{tenant?.state && `, ${tenant.state}`}</span>}
                      {tenant?.phone && <span style={RC.headerContactItem}><Phone style={RC.headerContactIcon} />{tenant.phone}</span>}
                      {tenant?.email && <span style={RC.headerContactItem}><Mail style={RC.headerContactIcon} />{tenant.email}</span>}
                      {tenant?.website && <span style={RC.headerContactItem}><Globe style={RC.headerContactIcon} />{tenant.website}</span>}
                    </div>
                  </div>
                )}

                {/* Title bar */}
                {visibility.titleBar && (
                  <div style={RC.reportTitle}>{reportStudent.term} Report Card &mdash; {reportStudent.session}</div>
                )}

                <div style={RC.body}>
                  {/* ======== INFO + PHOTO ======== */}
                  {(visibility.studentPhoto || visibility.studentInfo) && (
                    <div style={{ display: "flex", gap: 10, marginBottom: 5, alignItems: "flex-start" }}>
                      {visibility.studentPhoto && (
                        <div style={RC.photoContainer}>
                          {studentData?.imageUrl ? <img src={studentData.imageUrl} alt="passport" style={RC.photoImg} /> : <span style={RC.photoInitials}>{getInitials(reportStudent.fullname)}</span>}
                        </div>
                      )}
                      {visibility.studentInfo && (
                        <div style={{ ...RC.infoGrid, flex: 1 }}>
                          <div><span style={RC.infoLabel}>Name:</span> <span style={RC.infoValue}>{reportStudent.fullname}</span></div>
                          <div><span style={RC.infoLabel}>Reg No:</span> <span style={RC.infoValue}>{studentData?.regNo || "N/A"}</span></div>
                          <div><span style={RC.infoLabel}>Gender:</span> <span style={RC.infoValue}>{studentData?.gender || "N/A"}</span></div>
                          {studentData?.department && (
                            <div><span style={RC.infoLabel}>Department:</span> <span style={RC.infoValue}>{studentData.department}</span></div>
                          )}
                          <div><span style={RC.infoLabel}>Class:</span> <span style={RC.infoValue}>{reportStudent.class}</span></div>
                          <div><span style={RC.infoLabel}>Session:</span> <span style={RC.infoValue}>{reportStudent.session}</span></div>
                          <div><span style={RC.infoLabel}>Term:</span> <span style={RC.infoValue}>{reportStudent.term}</span></div>
                        </div>
                      )}
                    </div>
                  )}


                  {/* ======== SUBJECT TABLE ======== */}
                  {visibility.subjectTable && (
                    <div style={RC.tableWrapper}>
                      <table style={RC.table}>
                        <thead>
                          <tr>
                            <th style={{ ...RC.th, width: 22 }}>#</th>
                            <th style={{ ...RC.thLeft }}>Subject</th>
                            {caColumns.map((col, i) => (
                              <th key={`ca-h-${i}`} style={RC.th}>{col.label}</th>
                            ))}
                            <th style={RC.th}>{schoolSettings.examLabel}</th>
                            <th style={RC.th}>Total</th>
                            {/* ===== CUMULATIVE COLUMNS (Option E) ===== */}
                            {isCumulative && (
                              <>
                                {/* Previous term(s) */}
                                {isThirdTerm && (
                                  <th className="cum-header" style={RC.thCum}>
                                    1st Term
                                  </th>
                                )}
                                <th className="cum-header" style={RC.thCum}>
                                  {isThirdTerm ? "2nd Term" : "1st Term"}
                                </th>
                                {/* Current term actual */}
                                <th className="cum-header" style={RC.thCum}>
                                  Actual
                                </th>
                                {/* Cumulative Total (raw sum before division) */}
                                <th className="cum-header" style={RC.thCum}>
                                  Cum Total
                                </th>
                                {/* Cumulative Average */}
                                <th className="cum-header" style={RC.thCum}>
                                  Cum Avg
                                  {hasMissingTerms && (
                                    <span style={{ display: "block", fontSize: 7, fontWeight: "normal", opacity: 0.9 }}>
                                      ({termsUsedCount}T)
                                    </span>
                                  )}
                                </th>
                              </>
                            )}
                            {/* ===== SUBJECT RANK ===== */}
                            <th style={RC.th}>Gr</th>
                            <th style={RC.th}>S/Rank</th>
                            <th style={RC.thLast}>Remark</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportScores.map((sc, idx) => {
                            const isAlt = idx % 2 === 1;
                            const stuCum = getStudentCumForSubject(sc.subject);

                            /* Grade: cumulative avg for 2nd/3rd term, current total for 1st */
                            const gradeInput = isCumulative && stuCum && stuCum.cumulativeAvg > 0
                              ? stuCum.cumulativeAvg
                              : sc.total;
                            const g = getGrade(gradeInput, reportStudent.class);
                            const rank = stuCum?.rank || subjectRanks[sc.subject] || 0;

                            /* Cumulative cell styles */
                            const cumStyle = isAlt ? RC.tdCumAlt : RC.tdCum;



                            const mappedCa = mapCaScores(sc, caCount);

                            return (
                              <tr key={sc.id}>
                                <td style={isAlt ? RC.tdAlt : RC.td}>{idx + 1}</td>
                                <td style={isAlt ? RC.tdAltLeft : RC.tdLeft}>{sc.subject}</td>
                                {mappedCa.map((val, i) => (
                                  <td key={`ca-${i}`} style={isAlt ? RC.tdAlt : RC.td}>{val}</td>
                                ))}
                                <td style={isAlt ? RC.tdAlt : RC.td}>
                                  {(sc.exam === 0 && mappedCa.some(v => v > 0)) ? (
                                    <span style={{ color: "#dc2626", fontWeight: 700, fontSize: 8 }}>ABS</span>
                                  ) : sc.exam}
                                </td>
                                <td style={{ ...(isAlt ? RC.tdAlt : RC.td), fontWeight: 700 }}>{sc.total}</td>

                                {/* ===== CUMULATIVE CELLS (Option E) ===== */}
                                {isCumulative && (
                                  <>
                                    {/* Previous term score(s) */}
                                    {prevTerms.map((tNum) => (
                                      <Fragment key={`prev-t${tNum}`}>
                                        {renderTermScoreCell(tNum, stuCum, isAlt)}
                                      </Fragment>
                                    ))}
                                    {/* Current term actual */}
                                    <td className="cum-cell" style={{ ...cumStyle, fontWeight: 800 }}>
                                      {sc.total}
                                    </td>
                                    {/* Cumulative Total (raw sum before division) */}
                                    <td className="cum-cell cum-total-cell" style={{ ...cumStyle, fontWeight: 800, color: "#065f46" }}>
                                      {stuCum && stuCum.cumulativeTotal > 0 ? (
                                        fmt(stuCum.cumulativeTotal)
                                      ) : (
                                        <span style={{ color: "#aaa" }}>—</span>
                                      )}
                                    </td>
                                    {/* Cumulative Average */}
                                    <td className="cum-cell" style={cumStyle}>
                                      {stuCum && stuCum.cumulativeAvg > 0 ? (
                                        <span style={{ fontWeight: 700 }}>
                                          {fmt(stuCum.cumulativeAvg)}
                                        </span>
                                      ) : (
                                        <span style={{ color: "#aaa" }}>—</span>
                                      )}
                                    </td>
                                  </>
                                )}

                                {/* ===== SUBJECT RANK ===== */}
                                <td style={isAlt ? RC.tdAlt : RC.td}>
                                  <span style={RC.gradeBadge(g.color)}>{g.grade}</span>
                                </td>
                                <td style={isAlt ? RC.tdAlt : RC.td}>
                                  {rank > 0 ? (
                                    <span style={{ fontWeight: 700, fontSize: 9, color: rank <= 3 ? "#1e40af" : "#374151" }}>
                                      {rank}
                                    </span>
                                  ) : "—"}
                                </td>
                                <td style={{ ...(isAlt ? RC.tdAlt : RC.td), textAlign: "left", fontSize: 8 }}>{g.remark}</td>
                              </tr>
                            );
                          })}
                          {/* TOTAL ROW */}
                          <tr>
                            <td style={{ ...RC.totalRow, textAlign: "left", borderRight: "none" }} colSpan={2}>TOTAL</td>
                            {columnTotals_calc.caTotals.map((t, i) => (
                              <td key={`ca-tot-${i}`} style={RC.totalRow}>{fmt(t)}</td>
                            ))}
                            <td style={RC.totalRow}>{fmt(columnTotals_calc.examTotal)}</td>
                            <td style={{ ...RC.totalRow, fontWeight: 800, color: pc }}>{fmt(studentTotalFromScores)}</td>

                            {/* ===== CUMULATIVE TOTALS ROW ===== */}
                            {isCumulative && (
                              <>
                                {/* Previous term totals */}
                                {prevTerms.map((tNum) => (
                                  <td key={`tot-t${tNum}`} className="cum-cell" style={{ ...RC.totalRow, background: "#dbeafe", color: "#1e40af", fontWeight: 700 }}>
                                    {(() => {
                                      const sum = parseFloat(reportScores.reduce((s, sc) => {
                                        const stuCum = getStudentCumForSubject(sc.subject);
                                        const ts = stuCum?.termScores[tNum];
                                        return s + (ts?.score || 0);
                                      }, 0).toFixed(1));
                                      return sum > 0 ? fmt(sum) : "—";
                                    })()}
                                  </td>
                                )).flat()}
                                {/* Current term total */}
                                <td className="cum-cell" style={{ ...RC.totalRow, background: "#dbeafe", color: "#1e40af", fontWeight: 800 }}>
                                  {fmt(studentTotalFromScores)}
                                </td>
                                {/* Cumulative Total (grand raw sum) */}
                                <td className="cum-cell" style={{ ...RC.totalRow, background: "#d1fae5", color: "#065f46", fontWeight: 800 }}>
                                  {isCumulative ? fmt(cumGrandTotal) : "—"}
                                </td>
                                {/* Cumulative Average total */}
                                <td className="cum-cell" style={{ ...RC.totalRow, background: "#dbeafe", color: "#1e40af", fontWeight: 700 }}>
                                  {cumGrandAvg > 0 ? fmt(cumGrandAvg) : "—"}
                                </td>
                              </>
                            )}

                            {/* Subject Rank + Remark totals - empty */}
                            <td style={RC.totalRow}></td>
                            <td style={RC.totalRow}></td>
                            <td style={RC.totalRow}></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Subjects taken line */}
                  {visibility.subjectsTakenLine && (
                    <div style={{ fontSize: 8, color: "#374151", marginBottom: 4, fontStyle: "italic" }}>
                      Subjects Taken: {subjectsTakenFromScores} | Total Obtainable: {schoolSettings.totalMax * subjectsTakenFromScores} | Obtained: {fmt(isCumulative ? cumGrandTotal : studentTotalFromScores)}
                    </div>
                  )}

                  {/* ======== MISSING TERMS NOTICE ======== */}
                  {isCumulative && hasMissingTerms && (
                    <div className="missing-terms-notice" style={{
                      marginTop: 4, marginBottom: 4, padding: "5px 10px",
                      background: "#fef3c7", border: "1px solid #fbbf24",
                      borderRadius: 4, fontSize: 8, color: "#92400e",
                    }}>
                      <strong>Note:</strong> Score data for {missingTermLabels.join(" and ")} Term
                      {missingTermLabels.length > 1 ? "s" : ""} is not available. Cumulative average
                      is calculated using <strong>{termsUsedCount} term{termsUsedCount !== 1 ? "s" : ""}</strong> of
                      data only. To improve accuracy, enter previous term scores via the &quot;Previous Term Scores&quot; section.
                      <sup style={{ fontSize: 7, color: "#b45309", marginLeft: 2 }}>(M)</sup> = Manually entered score.
                    </div>
                  )}

                  {/* ======== SUMMARY + POSITION ======== */}
                  <div style={{ display: "flex", gap: 5, marginBottom: 5 }}>
                    {visibility.summaryStats && (
                      <div style={{ ...RC.summaryRow, flex: 1 }}>
                        <div style={RC.summaryCell}>
                          <div style={RC.summaryLabelInline}>Total Score</div>
                          <div style={RC.summaryValueInline}>
                            {fmt(displayTotalScore)}
                            {isCumulative && hasMissingTerms && (
                              <sup style={{ fontSize: 7, color: "#b45309", marginLeft: 2 }}>(cumul.)</sup>
                            )}
                          </div>
                        </div>
                        <div style={RC.summaryCell}>
                          <div style={RC.summaryLabelInline}>Average</div>
                          <div style={RC.summaryValueInline}>
                            {fmt(displayAverage)}
                            {isCumulative && hasMissingTerms && (
                              <sup style={{ fontSize: 7, color: "#b45309", marginLeft: 2 }}>({termsUsedCount}T)</sup>
                            )}
                          </div>
                        </div>
                        <div style={RC.summaryCell}>
                          <div style={RC.summaryLabelInline}>Grade</div>
                          <div style={{ fontSize: 11, fontWeight: 700 }}>
                            <span style={{ background: overallGrade(displayAverage).color, color: "black", padding: "1px 8px", borderRadius: 10, fontSize: 9, fontWeight: 600 }}>
                              {overallGrade(displayAverage).grade}
                            </span>
                          </div>
                        </div>
                        <div style={RC.summaryCell}>
                          <div style={RC.summaryLabelInline}>Passed</div>
                          <div style={{ ...RC.summaryValueInline, color: "#059669", fontSize: 12 }}>{reportPassedCount}</div>
                        </div>
                        <div style={RC.summaryCellLast}>
                          <div style={RC.summaryLabelInline}>Failed</div>
                          <div style={{ ...RC.summaryValueInline, color: "#dc2626", fontSize: 12 }}>{reportFailedCount}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ======== POSITION ======== */}
                  {visibility.positionSection && (
                    <div style={RC.positionRow}>
                      <div style={RC.positionBox}>
                        <div style={RC.positionLabel}>Class Position</div>
                        <div style={RC.positionValue}>{ordinal(reportStudent.classPosition)}</div>
                        <div style={RC.positionSub}>out of {reportStudent.totalStudents}</div>
                      </div>
                      <div style={RC.positionBox2}>
                        <div style={RC.positionLabel}>Overall Position</div>
                        <div style={RC.positionValue2}>{ordinal(reportStudent.overallPosition)}</div>
                        <div style={RC.positionSub}>out of {overallTotalStudents || reportStudent.totalStudents}</div>
                      </div>
                    </div>
                  )}

                  {/* ======== REMARKS ======== */}
                  {visibility.teacherRemark && (
                    <div style={RC.remarkSection}>
                      <div style={RC.remarkTitle}>Class Teacher&apos;s Remark</div>
                      <div style={RC.remarkText}>{teacherRemark || <span style={{ color: "#9ca3af" }}>No remark entered.</span>}</div>
                    </div>
                  )}
                  {visibility.principalRemark && (
                    <div style={RC.remarkSection}>
                      <div style={RC.remarkTitle}>Principal&apos;s Comment</div>
                      <div style={RC.remarkText}>{principalRemark || <span style={{ color: "#9ca3af" }}>No comment entered.</span>}</div>
                    </div>
                  )}

                  {/* ======== RESUMPTION ======== */}
                  {visibility.resumptionInfo && (
                    <div style={RC.resumptionBox}>
                      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 4 }}>
                        <span><strong>Attendance:</strong> School Opened for <strong>{resumptionInfo?.noSchoolOpen || "__"} days</strong></span>
                        <span><strong>Next Term Begins:</strong> {resumptionInfo?.nextTerm || "__"}</span>
                      </div>
                    </div>
                  )}

                  {/* ======== SIGNATURES (Principal only) ======== */}
                  {visibility.signatures && (
                    <div style={{ textAlign: "center", marginTop: 8, marginBottom: 4 }}>
                      <div>
                        {principalSignature?.imageUrl && <img src={principalSignature.imageUrl} alt="Principal signature" style={{ height: 60, width: "auto", objectFit: "contain", display: "block", margin: "0 auto" }} />}
                        <div style={{ borderTop: "1px dashed #9ca3af", paddingTop: 3, marginTop: 20 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: "#111827", marginTop: 2 }}>{principalSignature?.name || "____________________"}</div>
                          <div style={{ fontSize: 8, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: 0.3 }}>Principal</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ======== GRADING KEY ======== */}
                  {visibility.gradingKey && (
                    <div style={RC.gradingKeyBox}>
                      <div style={RC.gradingKeyTitle}>Grading Key</div>
                      {reportStudent.class.toUpperCase().startsWith("JSS") ? (
                        <div style={RC.gradingKeyGrid}>
                          <span><strong>A:</strong> 70-100 (Excellent)</span>
                          <span><strong>B:</strong> 60-69 (V.Good)</span>
                          <span><strong>C:</strong> 50-59 (Good)</span>
                          <span><strong>P:</strong> 40-49 (Pass)</span>
                          <span><strong>F:</strong> 0-39 (Fail)</span>
                        </div>
                      ) : (
                        <div style={RC.gradingKeyGrid}>
                          <span><strong>A1:</strong> 75-100</span>
                          <span><strong>B2:</strong> 70-74</span>
                          <span><strong>B3:</strong> 65-69</span>
                          <span><strong>C4:</strong> 60-64</span>
                          <span><strong>C5:</strong> 55-59</span>
                          <span><strong>C6:</strong> 50-54</span>
                          <span><strong>D7:</strong> 45-49</span>
                          <span><strong>E8:</strong> 40-44</span>
                          <span><strong>F9:</strong> 0-39</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  {visibility.footer && (
                    <div style={RC.footerText}>
                      Generated from {tenant?.name || "School Management System"} &middot; {new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">No detailed scores available for this student.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ============ SETTINGS DIALOG ============ */}
      <ReportCardSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        tenantId={tenant?.id ?? null}
        visibility={visibility}
        onVisibilityChange={setVisibility}
      />
    </div>
  );
}