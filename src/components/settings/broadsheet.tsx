"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Table, FileSpreadsheet, Download, Loader2 } from "lucide-react";
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
}

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

  const handleGenerate = async () => {
    if (!selectedSession || !selectedClass || !selectedTerm) {
      toast.error("Please select Session, Class, and Term");
      return;
    }
    try {
      setDataLoading(true);
      setGenerated(false);

      // Fetch ONLY the selected term — no cumulative, no extra prompts
      const params = new URLSearchParams({
        session: selectedSession,
        class: selectedClass,
        term: selectedTerm,
      });
      const res = await fetch(`/api/exams?${params}`);
      if (!res.ok) throw new Error("Failed to fetch exam scores");
      const scores: ExamScore[] = await res.json();

      if (scores.length === 0) {
        toast.info("No exam scores found for the selected criteria");
        setRows([]);
        setSubjects([]);
        setGenerated(true);
        return;
      }

      // Normalize fullname for consistent grouping
      const normalize = (name: string) =>
        name.trim().toUpperCase().replace(/\s+/g, " ");

      const uniqueSubjects = [...new Set(scores.map((s) => s.subject))].sort();
      const studentMap = new Map<string, ExamScore[]>();

      for (const score of scores) {
        const key = normalize(score.fullname);
        const existing = studentMap.get(key) || [];
        existing.push(score);
        studentMap.set(key, existing);
      }

      const uniqueStudents = [...studentMap.keys()].sort();

      const studentRows: BroadsheetRow[] = uniqueStudents.map((name) => {
        const studentScores = studentMap.get(name) || [];
        const subjectMap: Record<string, number> = {};
        let total = 0;
        for (const subj of uniqueSubjects) {
          const score = studentScores.find((s) => s.subject === subj);
          const val = score ? score.total : 0;
          subjectMap[subj] = val;
          total += val;
        }
        return {
          fullname: name,
          subjects: subjectMap,
          total: parseFloat(total.toFixed(1)),
          average: uniqueSubjects.length > 0
            ? parseFloat((total / uniqueSubjects.length).toFixed(2))
            : 0,
          position: 0,
        };
      });

      // Assign positions (ties get same position)
      const sorted = [...studentRows].sort((a, b) => b.total - a.total);
      let pos = 1;
      sorted.forEach((row, idx) => {
        if (idx > 0 && row.total < sorted[idx - 1].total) pos = idx + 1;
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

  const getCellBg = (score: number): string => {
    if (score >= 50) return "#dcfce7";
    if (score >= 40) return "#fef9c3";
    return "#fee2e2";
  };

  const getCellColor = (score: number): string => {
    if (score >= 50) return "#166534";
    if (score >= 40) return "#854d0e";
    return "#991b1b";
  };

  const getPositionBadgeStyle = (position: number): React.CSSProperties => {
    if (position === 1) return { background: "#facc15", color: "#713f12" };
    if (position === 2) return { background: "#d1d5db", color: "#1f2937" };
    if (position === 3) return { background: "#f59e0b", color: "#fff" };
    return { background: "#f1f5f9", color: "#475569" };
  };

  function getPosSuffix(p: number): string {
    if (p === 1 || p === 21 || p === 31) return "st";
    if (p === 2 || p === 22 || p === 32) return "nd";
    if (p === 3 || p === 23 || p === 33) return "rd";
    return "th";
  }

  /* ================================================================
     PDF DOWNLOAD — Landscape A4, no shrinking, complete rows
     ================================================================ */
  const handleDownloadPDF = () => {
    if (rows.length === 0) return;

    const pc = tenant?.primaryColor || "#065f46";
    const schoolName = tenant?.name || "School";
    const motto = tenant?.motto || "";
    const address = tenant?.address || "";
    const state = tenant?.state || "";
    const phone = tenant?.phone || "";
    const email = tenant?.email || "";

    const numSubj = subjects.length;
    const totalCols = numSubj + 6; // #, Name, subjects..., Total, Avg, Pos

    // Dynamic column widths as percentages — always adds up to 100%
    // # = 2%, Name = 13%, Pos = 3%, Total = 4.5%, Avg = 4.5%, subjects share the rest
    const fixedPct = 2 + 13 + 3 + 4.5 + 4.5; // 27%
    const subjPct = ((100 - fixedPct) / numSubj).toFixed(3);

    const contactParts = [address && state ? `${address}, ${state}` : "", phone, email].filter(Boolean).join("  |  ");
    const genDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const genTime = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

    // --- Build Subject Header Cells (vertical text to save space) ---
    const subjHeaderCells = subjects.map((subj) => `
      <th style="
        padding:0 1px;
        border:1px solid #333;
        background:${pc};
        color:#fff;
        text-align:center;
        font-weight:700;
        font-size:7.5px;
        width:${subjPct}%;
        vertical-align:bottom;
        height:90px;
      ">
        <div style="
          writing-mode:vertical-rl;
          text-orientation:mixed;
          transform:rotate(180deg);
          white-space:nowrap;
          letter-spacing:0.5px;
        ">${subj}</div>
      </th>`).join("");

    // --- Build Data Rows ---
    const dataRowsHtml = rows.map((row, i) => {
      const bg = i % 2 === 1 ? "#f9fafb" : "#fff";
      const subjCells = subjects.map((subj) => {
        const score = row.subjects[subj] || 0;
        return `<td style="
          padding:3px 1px;
          border:1px solid #bbb;
          text-align:center;
          font-size:8.5px;
          font-weight:600;
          background:${getCellBg(score)};
          color:${getCellColor(score)};
        ">${score}</td>`;
      }).join("");

      const posBg = row.position === 1 ? "#facc15" : row.position === 2 ? "#d1d5db" : row.position === 3 ? "#f59e0b" : "transparent";
      const posColor = row.position === 1 ? "#713f12" : row.position === 2 ? "#1f2937" : row.position === 3 ? "#fff" : "#374151";

      return `<tr style="background:${bg};">
        <td style="padding:3px 2px; border:1px solid #bbb; text-align:center; font-size:8.5px; width:2%;">${i + 1}</td>
        <td style="padding:3px 4px; border:1px solid #bbb; text-align:left; font-size:8.5px; font-weight:500; white-space:nowrap; width:13%;">${row.fullname}</td>
        ${subjCells}
        <td style="padding:3px 2px; border:1px solid #bbb; text-align:center; font-size:9px; font-weight:800; width:4.5%;">${Number(row.total).toFixed(1)}</td>
        <td style="padding:3px 2px; border:1px solid #bbb; text-align:center; font-size:8.5px; font-weight:600; width:4.5%;">${row.average.toFixed(1)}</td>
        <td style="padding:3px 2px; border:1px solid #bbb; text-align:center; font-size:8.5px; font-weight:700; width:3%; background:${posBg}; color:${posColor};">${row.position}${getPosSuffix(row.position)}</td>
      </tr>`;
    }).join("\n");

    // --- Summary Row ---
    const classTotal = rows.reduce((s, r) => s + r.total, 0);
    const classAvg = rows.length > 0 ? (classTotal / rows.length).toFixed(1) : "0";

    const summarySubjCells = subjects.map((subj) => {
      const avg = rows.length > 0
        ? (rows.reduce((s, r) => s + (r.subjects[subj] || 0), 0) / rows.length).toFixed(1)
        : "0";
      return `<td style="padding:4px 1px; border:1px solid #333; text-align:center; font-size:8px; font-weight:700; background:${pc}0F;">${avg}</td>`;
    }).join("");

    // --- Highest / Lowest Rows ---
    let highLowRows = "";
    if (rows.length > 0) {
      const high = rows[0];
      const low = rows[rows.length - 1];

      const highCells = subjects.map((subj) => {
        const max = Math.max(...rows.map((r) => r.subjects[subj] || 0));
        return `<td style="padding:2px 1px; border:1px solid #bbb; text-align:center; font-size:7.5px; font-weight:600; color:#166534;">${max}</td>`;
      }).join("");

      const lowCells = subjects.map((subj) => {
        const min = Math.min(...rows.map((r) => r.subjects[subj] || 0));
        return `<td style="padding:2px 1px; border:1px solid #bbb; text-align:center; font-size:7.5px; font-weight:600; color:#991b1b;">${min}</td>`;
      }).join("");

      highLowRows = `
      <tr>
        <td colspan="2" style="padding:3px 4px; border:1px solid #bbb; font-size:7.5px; font-weight:600;">HIGHEST: ${high.fullname} (${high.total})</td>
        ${highCells}
        <td colspan="3" style="border:1px solid #bbb;"></td>
      </tr>
      <tr>
        <td colspan="2" style="padding:3px 4px; border:1px solid #bbb; font-size:7.5px; font-weight:600;">LOWEST: ${low.fullname} (${low.total})</td>
        ${lowCells}
        <td colspan="3" style="border:1px solid #bbb;"></td>
      </tr>`;
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Broadsheet - ${selectedClass} - ${selectedTerm}</title>
<style>
  @page { size: A4 landscape; margin: 5mm; }
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  html, body {
    width:100%;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    color:#000;
    background:#fff;
    -webkit-print-color-adjust:exact!important;
    print-color-adjust:exact!important;
    color-adjust:exact!important;
  }
  table {
    width:100%;
    border-collapse:collapse;
    table-layout:fixed;
  }
  thead { display:table-header-group; }
  tbody { display:table-row-group; }
</style>
</head>
<body>
<table>
  <!-- School Name -->
  <tr>
    <td colspan="${totalCols}" style="text-align:center; padding:8px 6px 3px; border:1px solid #333; background:${pc}; color:#fff; font-size:15px; font-weight:800; letter-spacing:1.5px; text-transform:uppercase;">
      ${schoolName}${motto ? ` &mdash; &ldquo;${motto}&rdquo;` : ""}
    </td>
  </tr>
  ${contactParts ? `
  <tr>
    <td colspan="${totalCols}" style="text-align:center; padding:1px 6px 3px; border:1px solid #333; background:${pc}; color:rgba(255,255,255,0.85); font-size:8px;">
      ${contactParts}
    </td>
  </tr>` : ""}
  <!-- Title -->
  <tr>
    <td colspan="${totalCols}" style="text-align:center; padding:4px 6px; border:1px solid #333; background:${pc}14; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:2px; color:${pc};">
      BROADSHEET &mdash; ${selectedClass} &bull; ${selectedTerm} &bull; ${selectedSession}
    </td>
  </tr>
  <!-- Column Headers -->
  <tr>
    <th style="padding:4px 2px; border:1px solid #333; background:${pc}; color:#fff; text-align:center; font-weight:700; font-size:8px; width:2%;">#</th>
    <th style="padding:4px 4px; border:1px solid #333; background:${pc}; color:#fff; text-align:left; font-weight:700; font-size:8px; width:13%; white-space:nowrap;">Student Name</th>
    ${subjHeaderCells}
    <th style="padding:4px 2px; border:1px solid #333; background:${pc}; color:#fff; text-align:center; font-weight:700; font-size:8px; width:4.5%;">Total</th>
    <th style="padding:4px 2px; border:1px solid #333; background:${pc}; color:#fff; text-align:center; font-weight:700; font-size:8px; width:4.5%;">Average</th>
    <th style="padding:4px 2px; border:1px solid #333; background:${pc}; color:#fff; text-align:center; font-weight:700; font-size:8px; width:3%;">Pos.</th>
  </tr>
</thead>
<tbody>
  ${dataRowsHtml}
  <!-- Class Summary -->
  <tr>
    <td colspan="2" style="padding:4px 4px; border:1px solid #333; font-weight:700; font-size:8px; background:${pc}0F;">CLASS TOTAL / AVERAGE</td>
    ${summarySubjCells}
    <td style="padding:4px 2px; border:1px solid #333; text-align:center; font-weight:800; font-size:9px; background:${pc}0F;">${classTotal}</td>
    <td style="padding:4px 2px; border:1px solid #333; text-align:center; font-weight:700; font-size:8px; background:${pc}0F;">${classAvg}</td>
    <td style="padding:4px 2px; border:1px solid #333; background:${pc}0F;"></td>
  </tr>
  ${highLowRows}
  <!-- Grading Key -->
  <tr>
    <td colspan="${totalCols}" style="padding:4px 6px; border:1px solid #bbb; font-size:7px; color:#6b7280;">
      Grading: A1 (75-100) | B2 (70-74) | B3 (65-69) | C4 (60-64) | C5 (55-59) | C6 (50-54) | D7 (45-49) | E8 (40-44) | F9 (0-39)
    </td>
  </tr>
</tbody>
</table>
<div style="text-align:center; font-size:7px; color:#999; padding-top:3px; margin-top:4px; border-top:1px solid #ddd;">
  Generated on ${genDate} at ${genTime} &nbsp;|&nbsp; ${schoolName} &nbsp;|&nbsp; ${selectedClass} &bull; ${selectedTerm} &bull; ${selectedSession} &nbsp;|&nbsp; Total Students: ${rows.length}
</div>
</body>
</html>`;

    const printWin = window.open("", "_blank", "width=1200,height=800");
    if (!printWin) {
      toast.error("Please allow pop-ups to download the PDF");
      return;
    }
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 500);
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
                <Select value={selectedTerm} onValueChange={(val) => {
                  setSelectedTerm(val);
                  setGenerated(false);
                  setRows([]);
                  setSubjects([]);
                }}>
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
              <Button variant="outline" onClick={handleDownloadPDF} className="gap-2">
                <Download className="h-4 w-4" />
                Download PDF (Landscape)
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

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
                      <TableHead className="sticky left-0 z-10 bg-muted w-10 text-center">#</TableHead>
                      <TableHead className="sticky left-10 z-10 bg-muted min-w-[150px]">
                        Student
                      </TableHead>
                      {subjects.map((subj) => (
                        <TableHead key={subj} className="min-w-[70px] text-center px-2">
                          <span className="text-xs font-medium">{subj}</span>
                        </TableHead>
                      ))}
                      <TableHead className="min-w-[70px] text-center font-bold">Total</TableHead>
                      <TableHead className="min-w-[70px] text-center font-bold">Average</TableHead>
                      <TableHead className="min-w-[60px] text-center font-bold">Pos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, idx) => (
                      <TableRow key={row.fullname}>
                        <TableCell className="sticky left-0 bg-background font-medium text-center">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="sticky left-10 bg-background font-medium whitespace-nowrap">
                          {row.fullname}
                        </TableCell>
                        {subjects.map((subj) => {
                          const score = row.subjects[subj] || 0;
                          return (
                            <TableCell key={subj} className="text-center p-1">
                              <span
                                className="inline-flex h-8 w-12 items-center justify-center rounded text-sm font-medium"
                                style={{
                                  background: getCellBg(score),
                                  color: getCellColor(score),
                                }}
                              >
                                {score}
                              </span>
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center font-bold">{row.total}</TableCell>
                        <TableCell className="text-center font-semibold">{row.average}</TableCell>
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
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell className="sticky left-0 bg-muted/50 text-center" colSpan={2}>Class Average</TableCell>
                      {subjects.map((subj) => {
                        const avg = rows.length > 0
                          ? (rows.reduce((s, r) => s + (r.subjects[subj] || 0), 0) / rows.length).toFixed(1)
                          : "0";
                        return (
                          <TableCell key={subj} className="text-center text-sm">{avg}</TableCell>
                        );
                      })}
                      <TableCell className="text-center">
                        {rows.reduce((s, r) => s + r.total, 0)}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {rows.length > 0
                          ? (rows.reduce((s, r) => s + r.average, 0) / rows.length).toFixed(1)
                          : "0"}
                      </TableCell>
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