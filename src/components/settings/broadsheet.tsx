"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Table, FileSpreadsheet, Download, Loader2, FileDown } from "lucide-react";
import { useAppStore } from "@/store/index";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ExamScore {
  id: string;
  session: string;
  class: string;
  term: string;
  fullname: string;
  subject: string;
  firstCa: number;
  secondCa: number;
  thirdCa: number;
  exam: number;
  total: number;
}

interface BroadsheetRow {
  fullname: string;
  subjects: Record<string, number>;
  total: number;
  average: number;
  position: number;
  prevTermTotals: number[];
  cumTotal: number;
  cumAvg: number;
}

const TERM_BY_NUM: Record<number, string> = {
  1: "First Term",
  2: "Second Term",
  3: "Third Term",
};

const TERM_NUM_MAP: Record<string, number> = {
  "First Term": 1,
  "Second Term": 2,
  "Third Term": 3,
};

export default function BroadsheetView() {
  const { tenant } = useAppStore();
  const [sessions, setSessions] = useState<{ id: string; sessionOne: string; sessionTwo: string }[]>([]);
  const [classes, setClasses] = useState<{ id: string; title: string }[]>([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [rows, setRows] = useState<BroadsheetRow[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [generated, setGenerated] = useState(false);
  const [termNum, setTermNum] = useState(1);

  const fetchDropdowns = useCallback(async () => {
    try {
      setLoading(true);
      const [sessRes, classRes] = await Promise.all([
        fetch("/api/sessions"),
        fetch("/api/classes"),
      ]);
      if (sessRes.ok) {
        const sessData = await sessRes.json();
        setSessions(sessData);
        const active = sessData.find((s: { active: string }) => s.active === "Yes");
        if (active) {
          setSelectedSession(`${active.sessionOne}/${active.sessionTwo}`);
        }
      }
      if (classRes.ok) {
        const classData = await classRes.json();
        setClasses(classData);
      }
    } catch {
      toast.error("Failed to load dropdown data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDropdowns();
  }, [fetchDropdowns]);

  const fetchScores = async (term: string): Promise<ExamScore[]> => {
    const params = new URLSearchParams({
      session: selectedSession,
      class: selectedClass,
      term,
    });
    const res = await fetch(`/api/exams?${params}`);
    if (!res.ok) throw new Error(`Failed to fetch ${term} scores`);
    return res.json();
  };

  const handleGenerate = async () => {
    if (!selectedSession || !selectedClass || !selectedTerm) {
      toast.error("Please select Session, Class, and Term");
      return;
    }
    try {
      setDataLoading(true);
      setGenerated(false);

      const currentTermNum = TERM_NUM_MAP[selectedTerm] || 1;
      setTermNum(currentTermNum);

      const termsToFetch: string[] = [];
      for (let t = 1; t <= currentTermNum; t++) {
        termsToFetch.push(TERM_BY_NUM[t]);
      }

      const allResults = await Promise.all(termsToFetch.map((t) => fetchScores(t)));
      const currentTermScores: ExamScore[] = allResults[allResults.length - 1];

      if (currentTermScores.length === 0) {
        toast.info("No exam scores found for the selected criteria");
        setRows([]);
        setSubjects([]);
        setGenerated(true);
        return;
      }

      const uniqueSubjects = [...new Set(currentTermScores.map((s) => s.subject))].sort();
      const uniqueStudents = [...new Set(currentTermScores.map((s) => s.fullname))].sort();

      // Pre-compute each term's totals per student using THAT term's own scores
      const termTotalsMap: Record<string, number[]> = {};

      for (const name of uniqueStudents) {
        termTotalsMap[name] = [];
        for (let t = 0; t < allResults.length; t++) {
          const termScores = allResults[t].filter((s) => s.fullname === name);
          let termTotal = 0;
          for (const sc of termScores) {
            termTotal += sc.total;
          }
          termTotalsMap[name].push(parseFloat(termTotal.toFixed(2)));
        }
      }

      const studentRows: BroadsheetRow[] = uniqueStudents.map((name) => {
        const studentScores = currentTermScores.filter((s) => s.fullname === name);
        const subjectMap: Record<string, number> = {};
        let total = 0;
        for (const subj of uniqueSubjects) {
          const score = studentScores.find((s) => s.subject === subj);
          const val = score ? score.total : 0;
          subjectMap[subj] = val;
          total += val;
        }

        const allTermTotals = termTotalsMap[name];
        const prevTermTotals = allTermTotals.slice(0, -1);

        const cumTotal = allTermTotals.reduce((s, v) => s + v, 0);
        const cumAvg = currentTermNum > 0
          ? parseFloat((cumTotal / currentTermNum).toFixed(2))
          : 0;

        return {
          fullname: name,
          subjects: subjectMap,
          total: parseFloat(total.toFixed(2)),
          average: uniqueSubjects.length > 0 ? parseFloat((total / uniqueSubjects.length).toFixed(2)) : 0,
          position: 0,
          prevTermTotals,
          cumTotal: parseFloat(cumTotal.toFixed(2)),
          cumAvg,
        };
      });

      // Assign positions based on cumulative average (or current term total for 1st term)
      const useCumulative = currentTermNum >= 2;
      const sorted = [...studentRows].sort((a, b) =>
        useCumulative ? b.cumAvg - a.cumAvg : b.total - a.total
      );
      let pos = 1;
      sorted.forEach((row, idx) => {
        if (idx > 0) {
          const val = useCumulative ? row.cumAvg : row.total;
          const prev = useCumulative ? sorted[idx - 1].cumAvg : sorted[idx - 1].total;
          if (val < prev) pos = idx + 1;
        }
        row.position = pos;
      });

      setRows(studentRows.sort((a, b) => a.position - b.position));
      setSubjects(uniqueSubjects);
      setGenerated(true);
      toast.success("Broadsheet generated successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate broadsheet");
    } finally {
      setDataLoading(false);
    }
  };

  const getCellColor = (score: number): string => {
    if (score >= 50) return "background:#dcfce7; color:#166534;";
    if (score >= 40) return "background:#fef9c3; color:#854d0e;";
    return "background:#fee2e2; color:#991b1b;";
  };

  const getPositionColor = (position: number): string => {
    if (position === 1) return "background:#facc15; color:#713f12; font-weight:700;";
    if (position === 2) return "background:#d1d5db; color:#1f2937; font-weight:700;";
    if (position === 3) return "background:#f59e0b; color:#fff; font-weight:700;";
    return "font-weight:600;";
  };

  const getPositionBadgeStyle = (position: number): React.CSSProperties => {
    if (position === 1) return { background: "#facc15", color: "#713f12" };
    if (position === 2) return { background: "#d1d5db", color: "#1f2937" };
    if (position === 3) return { background: "#f59e0b", color: "#fff" };
    return { background: "#f1f5f9", color: "#475569" };
  };

  const hasCumulative = termNum >= 2;
  const prevTermLabels = hasCumulative
    ? Array.from({ length: termNum - 1 }, (_, i) => `${TERM_BY_NUM[i + 1]} Total`)
    : [];

  function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
  }

  /* ================================================================
     EXCEL DOWNLOAD
     ================================================================ */
  const handleDownloadExcel = () => {
    if (rows.length === 0) return;

    const schoolName = tenant?.name || "School";
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Broadsheet</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>
<table border="1" cellpadding="3" cellspacing="0" style="border-collapse:collapse;">`;

    // Title row
    const totalCols = 2 + subjects.length + 3 + prevTermLabels.length + (hasCumulative ? 2 : 0);
    html += `<tr><td colspan="${totalCols}" style="font-size:14px;font-weight:bold;text-align:center;">${schoolName} — Broadsheet</td></tr>`;
    html += `<tr><td colspan="${totalCols}" style="font-size:11px;text-align:center;">${selectedClass} | ${selectedTerm} | ${selectedSession}</td></tr>`;
    html += `<tr></tr>`;

    // Header row
    html += `<tr>
      <td style="font-weight:bold;background:#065f46;color:#fff;text-align:center;">#</td>
      <td style="font-weight:bold;background:#065f46;color:#fff;">Student Name</td>`;
    for (const subj of subjects) {
      html += `<td style="font-weight:bold;background:#065f46;color:#fff;text-align:center;">${subj}</td>`;
    }
    html += `<td style="font-weight:bold;background:#065f46;color:#fff;text-align:center;">Total</td>
      <td style="font-weight:bold;background:#065f46;color:#fff;text-align:center;">Average</td>`;
    for (const label of prevTermLabels) {
      html += `<td style="font-weight:bold;background:#ea580c;color:#fff;text-align:center;">${label}</td>`;
    }
    if (hasCumulative) {
      html += `<td style="font-weight:bold;background:#2563eb;color:#fff;text-align:center;">Cum Total</td>
        <td style="font-weight:bold;background:#2563eb;color:#fff;text-align:center;">Cum Avg</td>`;
    }
    html += `<td style="font-weight:bold;background:#065f46;color:#fff;text-align:center;">Position</td>`;
    html += `</tr>`;

    // Data rows
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      html += `<tr>
        <td style="text-align:center;">${i + 1}</td>
        <td>${row.fullname}</td>`;
      for (const subj of subjects) {
        html += `<td style="text-align:center;">${row.subjects[subj] || 0}</td>`;
      }
      html += `<td style="text-align:center;font-weight:bold;">${row.total}</td>
        <td style="text-align:center;">${row.average}</td>`;
      for (const pt of row.prevTermTotals) {
        html += `<td style="text-align:center;font-weight:bold;">${pt}</td>`;
      }
      if (hasCumulative) {
        html += `<td style="text-align:center;font-weight:bold;">${row.cumTotal}</td>
          <td style="text-align:center;font-weight:bold;">${row.cumAvg}</td>`;
      }
      html += `<td style="text-align:center;font-weight:bold;">${row.position}</td>`;
      html += `</tr>`;
    }

    html += `</table></body></html>`;

    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Broadsheet_${selectedClass.replace(/\s+/g, "_")}_${selectedTerm.replace(/\s+/g, "_")}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Excel downloaded successfully");
  };

  /* ================================================================
     PDF / PRINT
     ================================================================ */
  const handleDownloadPDF = () => {
    if (rows.length === 0) return;

    const pc = tenant?.primaryColor || "#065f46";
    const pcRgb = hexToRgb(pc) || { r: 6, g: 95, b: 70 };
    const schoolName = tenant?.name || "School";
    const motto = tenant?.motto || "";
    const address = tenant?.address || "";
    const state = tenant?.state || "";
    const phone = tenant?.phone || "";
    const email = tenant?.email || "";

    const cumCols = hasCumulative ? prevTermLabels.length + 2 : 0;
    const totalCols = 3 + subjects.length + 2 + cumCols + 1; // # + Name + subjects + Total + Avg + prevTerms + cum + Pos

    let headerHtml = "";
    headerHtml += `<tr>
      <td colspan="${totalCols}" style="text-align:center; padding:8px 6px 2px; border:1px solid #333; background:${pc}; color:#fff; font-size:14px; font-weight:800; letter-spacing:1px; text-transform:uppercase;">
        ${schoolName}${motto ? ` &mdash; &ldquo;${motto}&rdquo;` : ""}
      </td>
    </tr>`;
    headerHtml += `<tr>
      <td colspan="${totalCols}" style="text-align:center; padding:2px 6px 2px; border:1px solid #333; background:${pc}; color:rgba(255,255,255,0.85); font-size:8px;">
        ${[address && state ? `${address}, ${state}` : "", phone, email].filter(Boolean).join(" &bull; ")}
      </td>
    </tr>`;
    headerHtml += `<tr>
      <td colspan="${totalCols}" style="text-align:center; padding:4px 6px; border:1px solid #333; background:rgba(${pcRgb.r},${pcRgb.g},${pcRgb.b},0.12); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:2px; color:${pc};">
        Broadsheet &mdash; ${selectedClass} &bull; ${selectedTerm} &bull; ${selectedSession}
      </td>
    </tr>`;

    // Column headers — Position is LAST
    headerHtml += `<tr>
      <td style="padding:4px 3px; border:1px solid #333; background:${pc}; color:#fff; text-align:center; font-weight:700; font-size:8px; width:30px;">#</td>
      <td style="padding:4px 6px; border:1px solid #333; background:${pc}; color:#fff; text-align:left; font-weight:700; font-size:8px; min-width:130px; white-space:nowrap;">Student Name</td>`;
    for (const subj of subjects) {
      headerHtml += `<td style="padding:4px 2px; border:1px solid #333; background:${pc}; color:#fff; text-align:center; font-weight:700; font-size:7px; writing-mode:vertical-rl; text-orientation:mixed; height:80px; max-width:25px;">${subj}</td>`;
    }
    headerHtml += `<td style="padding:4px 3px; border:1px solid #333; background:${pc}; color:#fff; text-align:center; font-weight:700; font-size:8px;">Total</td>
      <td style="padding:4px 3px; border:1px solid #333; background:${pc}; color:#fff; text-align:center; font-weight:700; font-size:8px;">Average</td>`;
    for (const label of prevTermLabels) {
      headerHtml += `<td style="padding:4px 3px; border:1px solid #333; background:#ea580c; color:#fff; text-align:center; font-weight:700; font-size:7px;">${label}</td>`;
    }
    if (hasCumulative) {
      headerHtml += `<td style="padding:4px 3px; border:1px solid #333; background:#2563eb; color:#fff; text-align:center; font-weight:700; font-size:7px;">Cum Total</td>
        <td style="padding:4px 3px; border:1px solid #333; background:#2563eb; color:#fff; text-align:center; font-weight:700; font-size:7px;">Cum Avg</td>`;
    }
    headerHtml += `<td style="padding:4px 3px; border:1px solid #333; background:${pc}; color:#fff; text-align:center; font-weight:700; font-size:8px;">Pos</td>`;
    headerHtml += `</tr>`;

    // Data rows — Position is LAST
    let bodyHtml = "";
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const isAlt = i % 2 === 1;
      const bgStyle = isAlt ? "background:#f9fafb;" : "";
      bodyHtml += `<tr>
        <td style="padding:3px 2px; border:1px solid #bbb; text-align:center; font-size:8px; ${bgStyle}">${i + 1}</td>
        <td style="padding:3px 6px; border:1px solid #bbb; text-align:left; font-size:8px; font-weight:500; white-space:nowrap; ${bgStyle}">${row.fullname}</td>`;
      for (const subj of subjects) {
        const score = row.subjects[subj] || 0;
        bodyHtml += `<td style="padding:3px 2px; border:1px solid #bbb; text-align:center; font-size:8px; font-weight:600; ${getCellColor(score)}">${score}</td>`;
      }
      bodyHtml += `<td style="padding:3px 3px; border:1px solid #bbb; text-align:center; font-size:9px; font-weight:800; ${bgStyle}">${row.total}</td>
        <td style="padding:3px 3px; border:1px solid #bbb; text-align:center; font-size:8px; font-weight:600; ${bgStyle}">${row.average.toFixed(1)}</td>`;
      for (const pt of row.prevTermTotals) {
        bodyHtml += `<td style="padding:3px 3px; border:1px solid #bbb; text-align:center; font-size:9px; font-weight:700; ${bgStyle} background:rgba(234,88,12,0.06);">${pt}</td>`;
      }
      if (hasCumulative) {
        bodyHtml += `<td style="padding:3px 3px; border:1px solid #bbb; text-align:center; font-size:9px; font-weight:800; ${bgStyle} background:rgba(37,99,235,0.06);">${row.cumTotal}</td>
          <td style="padding:3px 3px; border:1px solid #bbb; text-align:center; font-size:8px; font-weight:700; ${bgStyle} background:rgba(37,99,235,0.06);">${row.cumAvg.toFixed(1)}</td>`;
      }
      bodyHtml += `<td style="padding:3px 3px; border:1px solid #bbb; text-align:center; font-size:8px; ${getPositionColor(row.position)}">${row.position}</td>`;
      bodyHtml += `</tr>`;
    }

    // Summary row — Position is LAST
    const classTotal = rows.reduce((s, r) => s + r.total, 0);
    const classAvg = rows.length > 0 ? (classTotal / rows.length).toFixed(1) : "0";
    bodyHtml += `<tr>
      <td colspan="2" style="padding:4px 6px; border:1px solid #333; font-weight:700; font-size:8px; background:rgba(${pcRgb.r},${pcRgb.g},${pcRgb.b},0.08);">CLASS TOTAL / AVERAGE</td>`;
    for (const subj of subjects) {
      const subjTotal = rows.reduce((s, r) => s + (r.subjects[subj] || 0), 0);
      const subjAvg = rows.length > 0 ? (subjTotal / rows.length).toFixed(1) : "0";
      bodyHtml += `<td style="padding:3px 2px; border:1px solid #333; text-align:center; font-size:7px; font-weight:700; background:rgba(${pcRgb.r},${pcRgb.g},${pcRgb.b},0.08);">${subjAvg}</td>`;
    }
    bodyHtml += `<td style="padding:4px 3px; border:1px solid #333; text-align:center; font-weight:800; font-size:9px; background:rgba(${pcRgb.r},${pcRgb.g},${pcRgb.b},0.08);">${classTotal}</td>
      <td style="padding:4px 3px; border:1px solid #333; text-align:center; font-weight:700; font-size:8px; background:rgba(${pcRgb.r},${pcRgb.g},${pcRgb.b},0.08);">${classAvg}</td>`;
    for (let p = 0; p < prevTermLabels.length; p++) {
      const prevSum = rows.reduce((s, r) => s + (r.prevTermTotals[p] || 0), 0);
      bodyHtml += `<td style="padding:4px 3px; border:1px solid #333; text-align:center; font-weight:800; font-size:9px; background:rgba(234,88,12,0.08);">${prevSum.toFixed(0)}</td>`;
    }
    if (hasCumulative) {
      const cumClassTotal = rows.reduce((s, r) => s + r.cumTotal, 0);
      const cumClassAvg = rows.length > 0 ? (rows.reduce((s, r) => s + r.cumAvg, 0) / rows.length).toFixed(1) : "0";
      bodyHtml += `<td style="padding:4px 3px; border:1px solid #333; text-align:center; font-weight:800; font-size:9px; background:rgba(37,99,235,0.08);">${cumClassTotal.toFixed(0)}</td>
        <td style="padding:4px 3px; border:1px solid #333; text-align:center; font-weight:700; font-size:8px; background:rgba(37,99,235,0.08);">${cumClassAvg}</td>`;
    }
    bodyHtml += `<td style="padding:4px 3px; border:1px solid #333; background:rgba(${pcRgb.r},${pcRgb.g},${pcRgb.b},0.08);"></td>`;
    bodyHtml += `</tr>`;

    // Highest & Lowest
    if (rows.length > 0) {
      const highest = rows[0];
      const lowest = rows[rows.length - 1];
      const endCols = cumCols + 1; // +1 for Position
      bodyHtml += `<tr>
        <td colspan="2" style="padding:3px 6px; border:1px solid #bbb; font-size:7px; font-weight:600;">HIGHEST: ${highest.fullname} (${highest.total})</td>`;
      for (const subj of subjects) {
        const maxScore = Math.max(...rows.map((r) => r.subjects[subj] || 0));
        bodyHtml += `<td style="padding:2px; border:1px solid #bbb; text-align:center; font-size:7px; font-weight:600; color:#166534;">${maxScore}</td>`;
      }
      bodyHtml += `<td colspan="${endCols}" style="border:1px solid #bbb;"></td></tr>`;
      bodyHtml += `<tr>
        <td colspan="2" style="padding:3px 6px; border:1px solid #bbb; font-size:7px; font-weight:600;">LOWEST: ${lowest.fullname} (${lowest.total})</td>`;
      for (const subj of subjects) {
        const minScore = Math.min(...rows.map((r) => r.subjects[subj] || 0));
        bodyHtml += `<td style="padding:2px; border:1px solid #bbb; text-align:center; font-size:7px; font-weight:600; color:#991b1b;">${minScore}</td>`;
      }
      bodyHtml += `<td colspan="${endCols}" style="border:1px solid #bbb;"></td></tr>`;
    }

    // Grading key
    bodyHtml += `<tr><td colspan="${totalCols}" style="padding:4px 6px; border:1px solid #bbb; font-size:7px; color:#6b7280;">
      Grading: A1=75-100 | B2=70-74 | B3=65-69 | C4=60-64 | C5=55-59 | C6=50-54 | D7=45-49 | E8=40-44 | F9=0-39
    </td></tr>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Broadsheet - ${selectedClass} - ${selectedTerm}</title>
<style>
  @page { size: A4 landscape; margin: 8mm 10mm; }
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:297mm; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; color:#000; background:#fff; -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; color-adjust:exact!important; font-size:9pt; }
  table { width:100%; border-collapse:collapse; page-break-inside:auto; }
  thead { display:table-header-group; }
  tr { page-break-inside:avoid; }
  body { overflow:hidden; }
</style>
</head>
<body>
<table>
  ${headerHtml}
  ${bodyHtml}
</table>
</body>
</html>`;

    const printWin = window.open("", "_blank", "width=1100,height=800");
    if (!printWin) { toast.error("Please allow pop-ups to print"); return; }
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 400);
    printWin.addEventListener("afterprint", () => printWin.close());
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Table className="h-5 w-5" />
            Results Broadsheet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Session</label>
                <Select value={selectedSession} onValueChange={setSelectedSession}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select session" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((s) => (
                      <SelectItem key={s.id} value={`${s.sessionOne}/${s.sessionTwo}`}>
                        {s.sessionOne}/{s.sessionTwo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Class</label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.title}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Term</label>
                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="First Term">First Term</SelectItem>
                    <SelectItem value="Second Term">Second Term</SelectItem>
                    <SelectItem value="Third Term">Third Term</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleGenerate} disabled={dataLoading} className="gap-2">
              {dataLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4" />
                  Generate Broadsheet
                </>
              )}
            </Button>
            {generated && rows.length > 0 && (
              <>
                <Button variant="outline" onClick={handleDownloadExcel} className="gap-2">
                  <FileDown className="h-4 w-4" />
                  Download Excel
                </Button>
                <Button variant="outline" onClick={handleDownloadPDF} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Broadsheet Table */}
      {generated && (
        <Card>
          <CardContent className="p-0">
            {rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileSpreadsheet className="mb-3 h-12 w-12 text-muted-foreground/40" />
                <p className="text-muted-foreground">
                  No exam data available for the selected criteria.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <UITable>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 z-10 bg-muted w-10">#</TableHead>
                      <TableHead className="sticky left-10 z-10 bg-muted min-w-[150px]">
                        Student
                      </TableHead>
                      {subjects.map((subj) => (
                        <TableHead key={subj} className="min-w-[70px] text-center">
                          <span className="text-xs font-medium">{subj}</span>
                        </TableHead>
                      ))}
                      <TableHead className="min-w-[70px] text-center font-bold">Total</TableHead>
                      <TableHead className="min-w-[70px] text-center font-bold">Average</TableHead>
                      {prevTermLabels.map((label) => (
                        <TableHead key={label} className="min-w-[80px] text-center font-bold text-orange-700 bg-orange-50">
                          {label}
                        </TableHead>
                      ))}
                      {hasCumulative && (
                        <>
                          <TableHead className="min-w-[80px] text-center font-bold text-blue-700 bg-blue-50">Cum Total</TableHead>
                          <TableHead className="min-w-[80px] text-center font-bold text-blue-700 bg-blue-50">Cum Avg</TableHead>
                        </>
                      )}
                      {/* Position is LAST */}
                      <TableHead className="min-w-[60px] text-center font-bold">Position</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, idx) => (
                      <TableRow key={row.fullname}>
                        <TableCell className="sticky left-0 bg-background font-medium">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="sticky left-10 bg-background font-medium whitespace-nowrap">
                          {row.fullname}
                        </TableCell>
                        {subjects.map((subj) => {
                          const score = row.subjects[subj] || 0;
                          return (
                            <TableCell key={subj} className="text-center">
                              <span
                                className="inline-flex h-8 w-12 items-center justify-center rounded text-sm font-medium"
                                style={score >= 50 ? { background: "#dcfce7", color: "#166534" } : score >= 40 ? { background: "#fef9c3", color: "#854d0e" } : { background: "#fee2e2", color: "#991b1b" }}
                              >
                                {score}
                              </span>
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center font-bold">{row.total}</TableCell>
                        <TableCell className="text-center font-semibold">{row.average}</TableCell>
                        {row.prevTermTotals.map((pt, i) => (
                          <TableCell key={i} className="text-center font-bold text-orange-700 bg-orange-50/50">
                            {pt}
                          </TableCell>
                        ))}
                        {hasCumulative && (
                          <>
                            <TableCell className="text-center font-bold text-blue-700 bg-blue-50/50">
                              {row.cumTotal}
                            </TableCell>
                            <TableCell className="text-center font-bold text-blue-700 bg-blue-50/50">
                              {row.cumAvg}
                            </TableCell>
                          </>
                        )}
                        {/* Position is LAST */}
                        <TableCell className="text-center">
                          <span
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                            style={getPositionBadgeStyle(row.position)}
                          >
                            {row.position}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Summary row — Position is LAST */}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell className="sticky left-0 bg-muted/50" colSpan={2}>Class Average</TableCell>
                      {subjects.map((subj) => {
                        const avg = rows.length > 0
                          ? (rows.reduce((s, r) => s + (r.subjects[subj] || 0), 0) / rows.length).toFixed(1)
                          : "0";
                        return (
                          <TableCell key={subj} className="text-center text-sm">{avg}</TableCell>
                        );
                      })}
                      <TableCell className="text-center">
                        {rows.reduce((s, r) => s + r.total, 0).toFixed(0)}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {rows.length > 0
                          ? (rows.reduce((s, r) => s + r.average, 0) / rows.length).toFixed(1)
                          : "0"}
                      </TableCell>
                      {prevTermLabels.map((_, i) => (
                        <TableCell key={i} className="text-center font-bold bg-orange-50/50">
                          {rows.reduce((s, r) => s + (r.prevTermTotals[i] || 0), 0).toFixed(0)}
                        </TableCell>
                      ))}
                      {hasCumulative && (
                        <>
                          <TableCell className="text-center font-bold bg-blue-50/50">
                            {rows.reduce((s, r) => s + r.cumTotal, 0).toFixed(0)}
                          </TableCell>
                          <TableCell className="text-center font-bold bg-blue-50/50">
                            {rows.length > 0
                              ? (rows.reduce((s, r) => s + r.cumAvg, 0) / rows.length).toFixed(1)
                              : "0"}
                          </TableCell>
                        </>
                      )}
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </UITable>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}