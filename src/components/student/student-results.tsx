//src/components/student/student-result.tsx
'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useAppStore } from '@/store/index'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Award,
  Trophy,
  TrendingUp,
  Users,
  AlertCircle,
  BookOpen,
  Printer,
  FileText,
  X,
  MapPin,
  Phone,
  Mail,
  Globe,
  GraduationCap,
  Loader2 as LoaderIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Score {
  id: string
  subject: string
  firstCa: number
  secondCa: number
  thirdCa: number
  exam: number
  total: number
  grade: string
  remark: string
  position: number | null
  subjectTotalStudents: number | null
}

interface StudentRecord {
  attendance: number
  subjectsPassed: number
  subjectsFailed: number
  percentage: number
}

interface FilterOption {
  session: string
  term: string
}

interface ResultsData {
  student: { fullname: string; class: string; regNo: string }
  session: string
  term: string
  scores: Score[]
  totalScore: number
  average: number
  subjectsTaken: number
  classPosition: number | null
  overallPosition: number | null
  totalStudents: number
  studentRecord: StudentRecord | null
  availableFilters: FilterOption[]
}

interface SchoolInfo {
  name: string
  logo: string | null
  motto: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  state: string | null
}

interface SchoolSettings {
  id: string
  caCount: number
  ca1Max: number
  ca2Max: number
  ca3Max: number
  ca1Label: string
  ca2Label: string
  ca3Label: string
  examMax: number
  examLabel: string
  totalMax: number
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getGradeColor(grade: string) {
  switch (grade) {
    case 'A': return 'bg-emerald-100 text-emerald-700'
    case 'B': return 'bg-teal-100 text-teal-700'
    case 'C': return 'bg-yellow-100 text-yellow-700'
    case 'P': return 'bg-orange-100 text-orange-700'
    case 'F': return 'bg-red-100 text-red-700'
    case 'A1': return 'bg-emerald-100 text-emerald-700'
    case 'B2': return 'bg-teal-100 text-teal-700'
    case 'B3': return 'bg-cyan-100 text-cyan-700'
    case 'C4': return 'bg-sky-100 text-sky-700'
    case 'C5': return 'bg-blue-100 text-blue-700'
    case 'C6': return 'bg-indigo-100 text-indigo-700'
    case 'D7': return 'bg-yellow-100 text-yellow-700'
    case 'E8': return 'bg-orange-100 text-orange-700'
    case 'F9': return 'bg-red-100 text-red-700'
    default: return 'bg-slate-100 text-slate-700'
  }
}

function getPositionSuffix(pos: number) {
  if (pos === 1) return 'st'
  if (pos === 2) return 'nd'
  if (pos === 3) return 'rd'
  return 'th'
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function overallGrade(average: number): { grade: string; color: string } {
  if (average >= 70) return { grade: "Excellent", color: "bg-emerald-600" }
  if (average >= 60) return { grade: "Very Good", color: "bg-teal-600" }
  if (average >= 50) return { grade: "Good", color: "bg-yellow-600" }
  if (average >= 40) return { grade: "Pass", color: "bg-orange-600" }
  return { grade: "Fail", color: "bg-red-600" }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
}

function getInitials(name: string): string {
  return name.split(" ").filter(Boolean).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

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

/* ------------------------------------------------------------------ */
/*  Report Card Styles                                                  */
/* ------------------------------------------------------------------ */

function buildRCStyles(primaryColor: string) {
  const pc = primaryColor
  const rgb = hexToRgb(pc) || { r: 130, g: 19, b: 41 }
  const pcDark = `rgb(${Math.max(0, rgb.r - 20)}, ${Math.max(0, rgb.g - 20)}, ${Math.max(0, rgb.b - 20)})`
  const pcLight = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.06)`
  const pcMed = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`

  return {
    card: {
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      maxWidth: 780,
      margin: "0 auto",
      color: "#1a1a1a",
      fontSize: 11,
      lineHeight: 1.25,
    } as React.CSSProperties,

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
      width: 52, height: 52, borderRadius: "50%",
      border: "2px solid rgba(255,255,255,0.4)",
      background: "rgba(255,255,255,0.1)",
      display: "flex", alignItems: "center" as const, justifyContent: "center" as const,
      flexShrink: 0, overflow: "hidden" as const,
    },
    headerLogoImg: { width: "100%", height: "100%", objectFit: "cover" as const },
    headerLogoInitials: { fontSize: 18, fontWeight: 800, color: "rgba(255,255,255,0.9)" },
    headerSchoolName: { fontSize: 18, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" as const, lineHeight: 1.15 },
    headerMotto: { fontSize: 9, fontStyle: "italic" as const, opacity: 0.85, marginTop: 1 },
    headerContactRow: {
      display: "flex", flexWrap: "wrap" as const, gap: "2px 12px", justifyContent: "center" as const,
      marginTop: 5, paddingTop: 5, borderTop: "1px solid rgba(255,255,255,0.2)", fontSize: 8, opacity: 0.8,
    },
    headerContactItem: { display: "inline-flex", alignItems: "center", gap: 3 },
    headerContactIcon: { width: 10, height: 10, opacity: 0.7 },

    reportTitle: {
      fontSize: 9, background: pcMed, color: pc, padding: "3px 12px",
      textAlign: "center" as const, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" as const,
    },

    body: {
      border: "1px solid #e5e7eb", borderTop: "none",
      borderRadius: "0 0 6px 6px", padding: "8px 10px 6px", background: "white",
    },

    infoGrid: {
      display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1px 12px",
      padding: "5px 8px", background: pcLight,
      border: `1px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
      borderRadius: 5, marginBottom: 6, fontSize: 10,
    },
    infoLabel: { color: "#6b7280", fontSize: 9 },
    infoValue: { fontWeight: 600, color: "#111827", fontSize: 10 },

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
    td: { padding: "2px 4px", textAlign: "center" as const, borderBottom: "1px solid #f3f4f6", fontSize: 9 },
    tdLeft: { padding: "2px 6px", textAlign: "left" as const, borderBottom: "1px solid #f3f4f6", fontWeight: 500, fontSize: 9 },
    tdAlt: { padding: "2px 4px", textAlign: "center" as const, borderBottom: "1px solid #f3f4f6", fontSize: 9, background: pcLight },
    tdAltLeft: { padding: "2px 6px", textAlign: "left" as const, borderBottom: "1px solid #f3f4f6", fontWeight: 500, fontSize: 9, background: pcLight },
    totalRow: { padding: "2px 4px", fontWeight: 700, background: pcLight, fontSize: 9 },

    summaryRow: {
      display: "flex", gap: 0, marginBottom: 5, fontSize: 9,
      border: `1px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`, borderRadius: 4, overflow: "hidden" as const,
    },
    summaryCell: {
      flex: 1, textAlign: "center" as const, padding: "3px 4px", background: "white",
      borderRight: `1px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`,
    },
    summaryCellLast: { flex: 1, textAlign: "center" as const, padding: "3px 4px", background: "white" },
    summaryLabelInline: { fontSize: 7, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: 0.3 },
    summaryValueInline: { fontSize: 13, fontWeight: 700, color: pc },

    positionRow: { display: "flex", gap: 8, marginBottom: 5 },
    positionBox: {
      flex: 1, border: `1px solid ${pc}`, borderRadius: 4, padding: "4px 8px",
      textAlign: "center" as const, background: pcLight,
    },
    positionLabel: { fontSize: 7, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: 0.3 },
    positionValue: { fontSize: 18, fontWeight: 800, color: pc },
    positionSub: { fontSize: 8, color: "#6b7280" },

    remarkSection: {
      border: `1px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
      borderRadius: 4, padding: "5px 8px", marginBottom: 4, background: pcLight,
    },
    remarkTitle: { fontSize: 8, fontWeight: 700, color: pc, marginBottom: 1, textTransform: "uppercase" as const, letterSpacing: 0.5 },
    remarkText: { fontSize: 9, color: "#374151", fontStyle: "italic" as const },

    gradingKeyBox: {
      border: "1px solid #e5e7eb", borderRadius: 4, padding: "3px 8px", background: "#f9fafb", marginBottom: 4,
    },
    gradingKeyTitle: { fontSize: 7, fontWeight: 700, color: "#374151", marginBottom: 1, textTransform: "uppercase" as const, letterSpacing: 0.3 },
    gradingKeyGrid: { display: "flex", flexWrap: "wrap" as const, gap: "0 10px", fontSize: 7, color: "#4b5563" },

    footerText: { fontSize: 7, color: "#9ca3af", textAlign: "center" as const, marginTop: 4, paddingTop: 4, borderTop: "1px solid #f3f4f6" },

    photoContainer: {
      width: 60, height: 60, borderRadius: 6, border: `2px solid ${pc}`,
      overflow: "hidden" as const, display: "flex", alignItems: "center" as const,
      justifyContent: "center" as const, background: pcLight, flexShrink: 0,
    },
    photoInitials: { fontSize: 20, fontWeight: 700, color: pc },

    gradeBadge: (color: string): React.CSSProperties => ({
      display: "inline-block", padding: "0px 5px", borderRadius: 3,
      fontWeight: 600, fontSize: 9,
      background: color.includes("emerald") ? "#d1fae5" : color.includes("teal") ? "#ccfbf1" : color.includes("cyan") ? "#cffafe" : color.includes("sky") ? "#e0f2fe" : color.includes("blue") ? "#dbeafe" : color.includes("indigo") ? "#e0e7ff" : color.includes("yellow") ? "#fef9c3" : color.includes("orange") ? "#ffedd5" : "#fee2e2",
      color: color.includes("emerald") ? "#065f46" : color.includes("teal") ? "#0f766e" : color.includes("cyan") ? "#0e7490" : color.includes("sky") ? "#0369a1" : color.includes("blue") ? "#1d4ed8" : color.includes("indigo") ? "#4338ca" : color.includes("yellow") ? "#854d0e" : color.includes("orange") ? "#9a3412" : "#991b1b",
    }),
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function StudentResults() {
  const { tenant, user } = useAppStore()
  const [data, setData] = useState<ResultsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSession, setSelectedSession] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('')
  const [reportOpen, setReportOpen] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>(DEFAULT_SCHOOL_SETTINGS)

  const primaryColor = tenant?.primaryColor || '#821329'

  /* ===== Fetch school settings ===== */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings?type=school-settings")
        if (res.ok) { const d = await res.json(); if (d && d.id) setSchoolSettings(d) }
      } catch { /* use defaults */ }
    })()
  }, [])

  const fetchResults = useCallback(async (session?: string, term?: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (session) params.set('session', session)
      if (term) params.set('term', term)
      const res = await fetch(`/api/portal/student/results?${params.toString()}`, {
        headers: { 'x-user-id': user?.id || '' },
      })
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      } else {
        setError(json.message || 'Failed to load results')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchResults()
  }, [fetchResults])

  useEffect(() => {
    if (data?.session && !selectedSession) {
      setSelectedSession(data.session)
      if (data.term) setSelectedTerm(data.term)
    }
  }, [data, selectedSession])

  const handleSessionChange = (value: string) => setSelectedSession(value)
  const handleTermChange = (value: string) => setSelectedTerm(value)
  const handleApplyFilter = () => fetchResults(selectedSession, selectedTerm)

  // FIX: .filter(Boolean) removes empty strings from API that crash SelectItem
  const uniqueSessions = (data?.availableFilters
    ? [...new Set(data.availableFilters.map(f => f.session).filter(Boolean))]
    : [])
  const uniqueTerms = (data?.availableFilters
    ? [...new Set(data.availableFilters.map(f => f.term).filter(Boolean))]
    : [])

  /* ======== DYNAMIC CA COLUMNS ======== */
  const caCount = schoolSettings.caCount || 1

   const caLabels = useMemo(() => {
    if (caCount === 1) return ["CA"]
    return Array.from({ length: caCount }, (_, i) => `CA${i + 1}`)
  }, [caCount])

  /* ======== REPORT CARD ======== */
  const openReportCard = () => {
    setReportOpen(true)
    setReportLoading(true)
    setTimeout(() => setReportLoading(false), 300)
  }

  const handlePrint = () => {
    const printArea = document.getElementById("student-report-card-print-area")
    if (!printArea) return

    const htmlContent = printArea.innerHTML
    const studentName = data?.student?.fullname || "Student"
    const pc = primaryColor

    const printWindow = window.open("", "_blank", "width=800,height=1000")
    if (!printWindow) return
    printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Report Card - ${studentName}</title>
  <style>
    @page { size: A4 portrait; margin: 6mm 8mm; }
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 210mm; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #000; background: #fff; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; font-size: 10pt; line-height: 1.2; }
    table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    th, td { border: 1px solid #bbb !important; padding: 2pt 3pt !important; font-size: 8pt !important; text-align: center; }
    th { background-color: ${pc} !important; color: #fff !important; font-weight: 600; font-size: 7pt !important; text-transform: uppercase; }
    div, span { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { overflow: hidden; }
    img { max-width: 55px !important; max-height: 55px !important; }
  </style>
</head>
<body>${htmlContent}</body>
</html>`)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print(); }, 300)
    printWindow.addEventListener("afterprint", () => printWindow.close())
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => fetchResults(selectedSession, selectedTerm)} variant="outline" size="sm">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const RC = buildRCStyles(primaryColor)

  /* ===== CA column totals for report card ===== */
  const caColumnTotals = useMemo(() => {
    if (!data || data.scores.length === 0) return new Array(caCount).fill(0) as number[]
    const totals: number[] = new Array(caCount).fill(0)
    data.scores.forEach((sc) => {
      const mapped = mapCaScores(sc, caCount)
      mapped.forEach((val, i) => { totals[i] += val || 0 })
    })
    return totals.map(t => parseFloat(t.toFixed(1)))
  }, [data, caCount])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Results</h1>
          <p className="text-sm text-muted-foreground">
            View your academic performance across sessions and terms
          </p>
        </div>
        {data && data.scores.length > 0 && (
          <Button
            onClick={openReportCard}
            className="gap-2"
            style={{ backgroundColor: primaryColor }}
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">View Report Card</span>
            <span className="sm:hidden">Report</span>
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Session</label>
              <Select value={selectedSession || undefined} onValueChange={handleSessionChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueSessions.length > 0 ? (
                    uniqueSessions.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))
                  ) : data?.session ? (
                    <SelectItem value={data.session} disabled>
                      {data.session}
                    </SelectItem>
                  ) : (
                    <SelectItem value="_none" disabled>
                      No sessions available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Term</label>
              <Select value={selectedTerm || undefined} onValueChange={handleTermChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueTerms.length > 0 ? (
                    uniqueTerms.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))
                  ) : data?.term ? (
                    <SelectItem value={data.term} disabled>
                      {data.term}
                    </SelectItem>
                  ) : (
                    <SelectItem value="_none" disabled>
                      No terms available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleApplyFilter} disabled={loading}>
              Apply Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {!loading && data && data.scores.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="overflow-hidden">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${primaryColor}15` }}>
                <TrendingUp className="h-5 w-5" style={{ color: primaryColor }} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Average Score</p>
                <p className="text-lg font-bold" style={{ color: primaryColor }}>{data.average}%</p>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50">
                <BookOpen className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Subjects Taken</p>
                <p className="text-lg font-bold text-amber-600">{data.subjectsTaken}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                <Trophy className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Class Position</p>
                <p className="text-lg font-bold text-blue-600">
                  {data.classPosition ? `${data.classPosition}${getPositionSuffix(data.classPosition)} of ${data.totalStudents}` : 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <Award className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Score</p>
                <p className="text-lg font-bold text-slate-600">{data.totalScore}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {data?.session && data?.term
                ? `${data.session} — ${data.term}`
                : 'Exam Results'}
            </CardTitle>
            {data && data.scores.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {data.student.fullname} &middot; {data.student.class}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : data && data.scores.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">#</TableHead>
                      <TableHead>Subject</TableHead>
                      {caLabels.map((label, i) => (
                        <TableHead key={`ca-h-d-${i}`} className="text-center">{label}</TableHead>
                      ))}
                      <TableHead className="text-center">Exam</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">Grade</TableHead>
                      <TableHead className="text-center">Position</TableHead>
                      <TableHead className="text-center">Remark</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.scores.map((score, index) => {
                      const mappedCa = mapCaScores(score, caCount)
                      return (
                        <TableRow key={score.id}>
                          <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                          <TableCell className="font-medium">{score.subject}</TableCell>
                          {mappedCa.map((val, i) => (
                            <TableCell key={`ca-d-${i}`} className="text-center">{val}</TableCell>
                          ))}
                          <TableCell className="text-center">{score.exam}</TableCell>
                          <TableCell className="text-center font-bold">{score.total}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className={cn('text-xs', getGradeColor(score.grade))}>
                              {score.grade}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {score.position && score.subjectTotalStudents ? (
                              <span className="text-xs">
                                <span className="font-semibold text-blue-600">
                                  {score.position}<sup className="text-[9px]">{getPositionSuffix(score.position)}</sup>
                                </span>
                                <span className="text-muted-foreground">/{score.subjectTotalStudents}</span>
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">
                            {score.remark || '—'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {data.scores.map((score, index) => {
                  const mappedCa = mapCaScores(score, caCount)
                  return (
                    <div key={score.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                            {index + 1}
                          </span>
                          <span className="text-sm font-medium">{score.subject}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {score.position && score.subjectTotalStudents && (
                            <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200 bg-blue-50">
                              {score.position}{getPositionSuffix(score.position)}/{score.subjectTotalStudents}
                            </Badge>
                          )}
                          <Badge variant="secondary" className={cn('text-xs', getGradeColor(score.grade))}>
                            {score.grade}
                          </Badge>
                        </div>
                      </div>
                      <div className={`grid gap-2 text-center ${caCount === 1 ? 'grid-cols-3' : caCount === 2 ? 'grid-cols-4' : 'grid-cols-5'}`}>
                        {mappedCa.map((val, i) => (
                          <div key={`ca-m-${i}`}>
                            <p className="text-[10px] text-muted-foreground">{caLabels[i]}</p>
                            <p className="text-sm font-medium">{val}</p>
                          </div>
                        ))}
                        <div>
                          <p className="text-[10px] text-muted-foreground">Exam</p>
                          <p className="text-sm font-medium">{score.exam}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Total</p>
                          <p className="text-sm font-bold">{score.total}</p>
                        </div>
                      </div>
                      {(score.remark || (score.position && score.subjectTotalStudents)) && (
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-muted/50">
                          {score.remark && (
                            <span className="text-[10px] text-muted-foreground italic">{score.remark}</span>
                          )}
                          {!score.position && !score.subjectTotalStudents && score.remark && <span />}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Student Record Info */}
              {data.studentRecord && (
                <div className="mt-4 rounded-lg border bg-muted/30 p-4">
                  <h4 className="text-sm font-medium mb-2">Additional Information</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Attendance</p>
                      <p className="text-sm font-medium">{data.studentRecord.attendance}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Subjects Passed</p>
                      <p className="text-sm font-medium text-emerald-600">{data.studentRecord.subjectsPassed}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Subjects Failed</p>
                      <p className="text-sm font-medium text-red-600">{data.studentRecord.subjectsFailed}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Percentage</p>
                      <p className="text-sm font-medium">{data.studentRecord.percentage}%</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">No results found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Results for this session/term are not yet available
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============ REPORT CARD DIALOG ============ */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-[96vw] max-h-[94vh] overflow-y-auto p-0 [&>button]:hidden">
          <DialogHeader className="sr-only"><DialogTitle>Report Card</DialogTitle></DialogHeader>
          <div className="sticky top-0 z-10 flex items-center justify-end gap-2 bg-white border-b px-4 py-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2"><Printer className="h-4 w-4" /> Print Report</Button>
            <Button variant="destructive" size="sm" onClick={() => setReportOpen(false)} className="gap-2"><X className="h-4 w-4" /> Close</Button>
          </div>

          <div id="student-report-card-print-area" style={{ fontFamily: "'Segoe UI', Arial, sans-serif", color: "#000", background: "#fff", position: "relative" }}>
            {reportLoading ? (
              <div className="flex items-center justify-center py-16"><LoaderIcon className="h-7 w-7 animate-spin text-muted-foreground" /></div>
            ) : data && data.scores.length > 0 ? (
              <div style={RC.card}>
                {/* ======== HEADER ======== */}
                <div style={RC.header}>
                  <div style={RC.headerInner}>
                    <div style={RC.headerLogoBox}>
                      {tenant?.logo ? (
                        <img src={tenant.logo} alt="School logo" style={RC.headerLogoImg} />
                      ) : (
                        <span style={RC.headerLogoInitials}>{getInitials(tenant?.name || "School")}</span>
                      )}
                    </div>
                    <div>
                      <div style={RC.headerSchoolName}>{tenant?.name || "School Name"}</div>
                      {tenant?.motto && <div style={RC.headerMotto}>&ldquo;{tenant.motto}&rdquo;</div>}
                    </div>
                  </div>
                  {(tenant?.address || tenant?.phone || tenant?.email) && (
                    <div style={RC.headerContactRow}>
                      {tenant?.address && (
                        <span style={RC.headerContactItem}>
                          <MapPin style={RC.headerContactIcon} />{tenant.address}{tenant?.state ? `, ${tenant.state}` : ''}
                        </span>
                      )}
                      {tenant?.phone && (
                        <span style={RC.headerContactItem}><Phone style={RC.headerContactIcon} />{tenant.phone}</span>
                      )}
                      {tenant?.email && (
                        <span style={RC.headerContactItem}><Mail style={RC.headerContactIcon} />{tenant.email}</span>
                      )}
                      {tenant?.website && (
                        <span style={RC.headerContactItem}><Globe style={RC.headerContactIcon} />{tenant.website}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Title bar */}
                <div style={RC.reportTitle}>
                  {data.term} Report Card &mdash; {data.session}
                </div>

                <div style={RC.body}>
                  {/* ======== INFO + PHOTO ======== */}
                  <div style={{ display: "flex", gap: 10, marginBottom: 5, alignItems: "flex-start" }}>
                    <div style={RC.photoContainer}>
                      {user?.imageUrl ? (
                        <img src={user.imageUrl} alt="passport" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={RC.photoInitials}>{getInitials(data.student.fullname)}</span>
                      )}
                    </div>
                    <div style={{ ...RC.infoGrid, flex: 1 }}>
                      <div><span style={RC.infoLabel}>Name:</span> <span style={RC.infoValue}>{data.student.fullname}</span></div>
                      <div><span style={RC.infoLabel}>Reg No:</span> <span style={RC.infoValue}>{data.student.regNo}</span></div>
                      <div><span style={RC.infoLabel}>Class:</span> <span style={RC.infoValue}>{data.student.class}</span></div>
                      <div><span style={RC.infoLabel}>Session:</span> <span style={RC.infoValue}>{data.session}</span></div>
                      <div><span style={RC.infoLabel}>Term:</span> <span style={RC.infoValue}>{data.term}</span></div>
                      <div><span style={RC.infoLabel}>No. in Class:</span> <span style={RC.infoValue}>{data.totalStudents}</span></div>
                    </div>
                  </div>

                  {/* ======== SUBJECT TABLE ======== */}
                  <div style={RC.tableWrapper}>
                    <table style={RC.table}>
                      <thead>
                        <tr>
                          <th style={{ ...RC.th, width: 22 }}>#</th>
                          <th style={RC.thLeft}>Subject</th>
                          {caLabels.map((label, i) => (
                            <th key={`ca-h-rc-${i}`} style={RC.th}>{label}</th>
                          ))}
                          <th style={RC.th}>{schoolSettings.examLabel}</th>
                          <th style={RC.th}>Total</th>
                          <th style={RC.th}>Grade</th>
                          <th style={RC.th}>Position</th>
                          <th style={RC.thLast}>Remark</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.scores.map((sc, idx) => {
                          const isAlt = idx % 2 === 1
                          const mappedCa = mapCaScores(sc, caCount)
                          return (
                            <tr key={sc.id}>
                              <td style={isAlt ? RC.tdAlt : RC.td}>{idx + 1}</td>
                              <td style={isAlt ? RC.tdAltLeft : RC.tdLeft}>{sc.subject}</td>
                              {mappedCa.map((val, i) => (
                                <td key={`ca-rc-${i}`} style={isAlt ? RC.tdAlt : RC.td}>{val}</td>
                              ))}
                              <td style={isAlt ? RC.tdAlt : RC.td}>{sc.exam}</td>
                              <td style={{ ...(isAlt ? RC.tdAlt : RC.td), fontWeight: 700 }}>{sc.total}</td>
                              <td style={isAlt ? RC.tdAlt : RC.td}>
                                <span style={RC.gradeBadge(getGradeColor(sc.grade))}>{sc.grade}</span>
                              </td>
                              <td style={isAlt ? RC.tdAlt : RC.td}>
                                {sc.position ? (
                                  <span style={{ fontWeight: 700, fontSize: 9, color: sc.position <= 3 ? "#1e40af" : "#374151" }}>
                                    {ordinal(sc.position)}
                                  </span>
                                ) : "—"}
                              </td>
                              <td style={{ ...(isAlt ? RC.tdAlt : RC.td), textAlign: "left", fontSize: 8 }}>{sc.remark || "—"}</td>
                            </tr>
                          )
                        })}
                        {/* TOTAL ROW */}
                        <tr>
                          <td style={{ ...RC.totalRow, textAlign: "left", borderRight: "none" }} colSpan={2}>TOTAL</td>
                          {caColumnTotals.map((t, i) => (
                            <td key={`ca-tot-rc-${i}`} style={RC.totalRow}>{t}</td>
                          ))}
                          <td style={RC.totalRow}>{data.scores.reduce((s, e) => s + (e.exam || 0), 0)}</td>
                          <td style={{ ...RC.totalRow, fontWeight: 800, color: primaryColor }}>{data.totalScore}</td>
                          <td style={RC.totalRow}></td>
                          <td style={RC.totalRow}></td>
                          <td style={RC.totalRow}></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Subjects taken line */}
                  <div style={{ fontSize: 8, color: "#374151", marginBottom: 4, fontStyle: "italic" }}>
                    Subjects Taken: {data.subjectsTaken} | Total Obtainable: {schoolSettings.totalMax * data.subjectsTaken} | Obtained: {data.totalScore}
                  </div>

                  {/* ======== SUMMARY ======== */}
                  <div style={RC.summaryRow}>
                    <div style={RC.summaryCell}>
                      <div style={RC.summaryLabelInline}>Total Score</div>
                      <div style={RC.summaryValueInline}>{data.totalScore}</div>
                    </div>
                    <div style={RC.summaryCell}>
                      <div style={RC.summaryLabelInline}>Average</div>
                      <div style={RC.summaryValueInline}>{data.average}</div>
                    </div>
                    <div style={RC.summaryCell}>
                      <div style={RC.summaryLabelInline}>Grade</div>
                      <div style={{ fontSize: 11, fontWeight: 700 }}>
                        <span style={{
                          background: overallGrade(data.average).color, color: "white",
                          padding: "1px 8px", borderRadius: 10, fontSize: 9, fontWeight: 600,
                        }}>
                          {overallGrade(data.average).grade}
                        </span>
                      </div>
                    </div>
                    <div style={RC.summaryCell}>
                      <div style={RC.summaryLabelInline}>Passed</div>
                      <div style={{ ...RC.summaryValueInline, color: "#059669", fontSize: 12 }}>
                        {data.studentRecord?.subjectsPassed ?? data.scores.filter(s => s.total >= 40).length}
                      </div>
                    </div>
                    <div style={RC.summaryCellLast}>
                      <div style={RC.summaryLabelInline}>Failed</div>
                      <div style={{ ...RC.summaryValueInline, color: "#dc2626", fontSize: 12 }}>
                        {data.studentRecord?.subjectsFailed ?? data.scores.filter(s => s.total < 40).length}
                      </div>
                    </div>
                  </div>

                  {/* ======== POSITION ======== */}
                  <div style={RC.positionRow}>
                    <div style={RC.positionBox}>
                      <div style={RC.positionLabel}>Class Position</div>
                      <div style={RC.positionValue}>
                        {data.classPosition ? ordinal(data.classPosition) : "—"}
                      </div>
                      <div style={RC.positionSub}>out of {data.totalStudents}</div>
                    </div>
                    <div style={{
                      ...RC.positionBox,
                      borderColor: "#b45309",
                      background: "#fffbeb",
                    }}>
                      <div style={RC.positionLabel}>Overall Position</div>
                      <div style={{ ...RC.positionValue, color: "#b45309" }}>
                        {data.overallPosition ? ordinal(data.overallPosition) : "—"}
                      </div>
                      <div style={RC.positionSub}>out of {data.totalStudents}</div>
                    </div>
                  </div>

                  {/* ======== ATTENDANCE ======== */}
                  {data.studentRecord && (
                    <div style={{
                      background: "#fffbeb", border: "1px solid #fde68a",
                      borderRadius: 4, padding: "3px 8px", fontSize: 9, marginBottom: 4, color: "#92400e",
                    }}>
                      <strong>Attendance:</strong> {data.studentRecord.attendance}% |
                      <strong> Percentage:</strong> {data.studentRecord.percentage}%
                    </div>
                  )}

                  {/* ======== GRADING KEY ======== */}
                  <div style={RC.gradingKeyBox}>
                    <div style={RC.gradingKeyTitle}>Grading Key</div>
                    {data.student.class?.toUpperCase().startsWith("JSS") ? (
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

                  {/* Footer */}
                  <div style={RC.footerText}>
                    Generated from {tenant?.name || "School Management System"} &middot; {new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}
                  </div>
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">No results available to generate report card.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}