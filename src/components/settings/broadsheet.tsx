"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Table, FileSpreadsheet } from "lucide-react";
import { useAppStore } from "@/store/index";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  subjects: Record<string, { current: number; cumulative: number }>;
  total: number;
  cumulativeTotal: number;
  average: number;
  cumulativeAverage: number;
  position: number;
  // Per-term totals for cumulative display
  firstTermTotal?: number;
  secondTermTotal?: number;
  thirdTermTotal?: number;
}

interface CumulativeStudent {
  fullname: string;
  subjects: CumulativeSubject[];
  firstTermTotal: number;
  secondTermTotal: number;
  thirdTermTotal?: number;
  cumulativeTotal: number;
  subjectsTaken: number;
  cumulativeAverage: number;
  cumulativePercentage: number;
}

interface CumulativeSubject {
  subject: string;
  firstTerm: { firstCa: number; secondCa: number; thirdCa: number; exam: number; total: number } | null;
  secondTerm: { firstCa: number; secondCa: number; thirdCa: number; exam: number; total: number } | null;
  thirdTerm?: { firstCa: number; secondCa: number; thirdCa: number; exam: number; total: number } | null;
  cumulativeTotal: number;
}

export default function BroadsheetView() {
  const { currentPage } = useAppStore();
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
  const [isCumulative, setIsCumulative] = useState(false);

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
    if (currentPage === "broadsheet") fetchDropdowns();
  }, [currentPage, fetchDropdowns]);

  // Check if selected term should show cumulative data
  useEffect(() => {
    setIsCumulative(selectedTerm === "Second Term" || selectedTerm === "Third Term");
  }, [selectedTerm]);

  const handleGenerate = async () => {
    if (!selectedSession || !selectedClass || !selectedTerm) {
      toast.error("Please select Session, Class, and Term");
      return;
    }
    try {
      setDataLoading(true);
      setGenerated(false);

      if (isCumulative) {
        const params = new URLSearchParams({
          session: selectedSession,
          class: selectedClass,
          term: selectedTerm,
        });
        const res = await fetch(`/api/exams/cumulative?${params}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || "Failed to fetch cumulative scores");
        }
        const data = await res.json();

        if (!data.success || !data.students || data.students.length === 0) {
          toast.info("No exam scores found for the selected criteria");
          setRows([]);
          setSubjects([]);
          setGenerated(true);
          return;
        }

        const cumulativeStudents: CumulativeStudent[] = data.students;

        // Get all unique subjects across all students
        const allSubjectsSet = new Set<string>();
        cumulativeStudents.forEach((s) => s.subjects.forEach((sub) => allSubjectsSet.add(sub.subject)));
        const uniqueSubjects = [...allSubjectsSet].sort();

        // Build broadsheet rows
        const studentRows: BroadsheetRow[] = cumulativeStudents.map((student) => {
          const subjectMap: Record<string, { current: number; cumulative: number }> = {};
          let currentTotal = 0;

          for (const subj of uniqueSubjects) {
            const subjData = student.subjects.find((s) => s.subject === subj);
            const currentScore = subjData
              ? (selectedTerm === "Third Term"
                ? (subjData.thirdTerm?.total || 0)
                : (subjData.secondTerm?.total || 0))
              : 0;
            const cumScore = subjData?.cumulativeTotal || 0;
            subjectMap[subj] = { current: currentScore, cumulative: cumScore };
            currentTotal += currentScore;
          }

          const termCount = selectedTerm === "Third Term" ? 3 : 2;
          const row: BroadsheetRow = {
            fullname: student.fullname,
            subjects: subjectMap,
            total: currentTotal,
            cumulativeTotal: student.cumulativeTotal,
            average: uniqueSubjects.length > 0 ? parseFloat((currentTotal / uniqueSubjects.length).toFixed(2)) : 0,
            cumulativeAverage: parseFloat(((student.cumulativeTotal) / (uniqueSubjects.length * termCount)).toFixed(2)),
            position: 0,
            firstTermTotal: student.firstTermTotal,
            secondTermTotal: student.secondTermTotal,
          };

          if (student.thirdTermTotal !== undefined) {
            row.thirdTermTotal = student.thirdTermTotal;
          }

          return row;
        });

        // Assign positions based on cumulative total (descending)
        const sorted = [...studentRows].sort((a, b) => b.cumulativeTotal - a.cumulativeTotal);
        let pos = 1;
        sorted.forEach((row, idx) => {
          if (idx > 0 && row.cumulativeTotal < sorted[idx - 1].cumulativeTotal) {
            pos = idx + 1;
          }
          row.position = pos;
        });

        setRows(studentRows.sort((a, b) => a.position - b.position));
        setSubjects(uniqueSubjects);
        setGenerated(true);
        toast.success(`Cumulative broadsheet generated for ${selectedTerm}`);
      } else {
        // First Term - normal broadsheet
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

        const uniqueSubjects = [...new Set(scores.map((s) => s.subject))].sort();
        const uniqueStudents = [...new Set(scores.map((s) => s.fullname))].sort();

        const studentRows: BroadsheetRow[] = uniqueStudents.map((name) => {
          const studentScores = scores.filter((s) => s.fullname === name);
          const subjectMap: Record<string, { current: number; cumulative: number }> = {};
          let total = 0;
          for (const subj of uniqueSubjects) {
            const score = studentScores.find((s) => s.subject === subj);
            const val = score ? score.total : 0;
            subjectMap[subj] = { current: val, cumulative: val };
            total += val;
          }
          return {
            fullname: name,
            subjects: subjectMap,
            total,
            cumulativeTotal: total,
            average: uniqueSubjects.length > 0 ? parseFloat((total / uniqueSubjects.length).toFixed(2)) : 0,
            cumulativeAverage: uniqueSubjects.length > 0 ? parseFloat((total / uniqueSubjects.length).toFixed(2)) : 0,
            position: 0,
          };
        });

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
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate broadsheet");
    } finally {
      setDataLoading(false);
    }
  };

  const getCellColor = (score: number): string => {
    if (score >= 50) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    if (score >= 40) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  };

  const getPositionColor = (position: number): string => {
    if (position === 1) return "bg-yellow-400 text-yellow-900";
    if (position === 2) return "bg-gray-300 text-gray-800";
    if (position === 3) return "bg-amber-500 text-amber-100";
    return "text-muted-foreground";
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
          <div className="flex items-center gap-3">
            <Button onClick={handleGenerate} disabled={dataLoading} className="gap-2">
              {dataLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Generating...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4" />
                  Generate Broadsheet
                </>
              )}
            </Button>
            {isCumulative && (
              <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                Cumulative Mode — {selectedTerm === "Third Term" ? "Shows 1st + 2nd + 3rd Term totals" : "Shows 1st Term + current term totals"}
              </Badge>
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
                      {/* Previous term totals for cumulative mode */}
                      {isCumulative && (
                        <TableHead className="min-w-[80px] text-center font-bold text-blue-700 bg-blue-50">
                          1st Term
                        </TableHead>
                      )}
                      {selectedTerm === "Third Term" && (
                        <TableHead className="min-w-[80px] text-center font-bold text-amber-700 bg-amber-50">
                          2nd Term
                        </TableHead>
                      )}
                      {/* Subject columns */}
                      {subjects.map((subj) => (
                        <TableHead key={subj} className="min-w-[80px] text-center">
                          <span className="text-xs font-medium">{subj}</span>
                        </TableHead>
                      ))}
                      {/* Summary columns */}
                      {isCumulative ? (
                        <>
                          <TableHead className="min-w-[90px] text-center font-bold bg-indigo-50 text-indigo-700">
                            {selectedTerm === "Third Term" ? "3rd Total" : "2nd Total"}
                          </TableHead>
                          <TableHead className="min-w-[100px] text-center font-bold text-emerald-700 bg-emerald-50">
                            Cumu Total
                          </TableHead>
                          <TableHead className="min-w-[80px] text-center font-bold text-emerald-700 bg-emerald-50">
                            Avg %
                          </TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead className="min-w-[70px] text-center font-bold">
                            Total
                          </TableHead>
                          <TableHead className="min-w-[70px] text-center font-bold">
                            Average
                          </TableHead>
                        </>
                      )}
                      <TableHead className="min-w-[80px] text-center font-bold">
                        Position
                      </TableHead>
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
                        {/* 1st Term total column */}
                        {isCumulative && (
                          <TableCell className="text-center font-semibold text-blue-700 bg-blue-50/50">
                            {row.firstTermTotal ?? 0}
                          </TableCell>
                        )}
                        {/* 2nd Term total column (only for Third Term view) */}
                        {selectedTerm === "Third Term" && (
                          <TableCell className="text-center font-semibold text-amber-700 bg-amber-50/50">
                            {row.secondTermTotal ?? 0}
                          </TableCell>
                        )}
                        {/* Subject score cells */}
                        {subjects.map((subj) => {
                          const scoreData = row.subjects[subj] || { current: 0, cumulative: 0 };
                          const score = scoreData.current;
                          return (
                            <TableCell key={subj} className="text-center">
                              <span
                                className={`inline-flex h-8 w-12 items-center justify-center rounded text-sm font-medium ${getCellColor(score)}`}
                              >
                                {score}
                              </span>
                            </TableCell>
                          );
                        })}
                        {/* Summary cells */}
                        {isCumulative ? (
                          <>
                            <TableCell className="text-center font-bold bg-indigo-50/50 text-indigo-700">
                              {row.total}
                            </TableCell>
                            <TableCell className="text-center font-bold text-emerald-700 bg-emerald-50/50">
                              {row.cumulativeTotal}
                            </TableCell>
                            <TableCell className="text-center font-semibold text-emerald-700 bg-emerald-50/50">
                              {row.cumulativeAverage.toFixed(1)}
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="text-center font-bold">
                              {row.total}
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              {row.average}
                            </TableCell>
                          </>
                        )}
                        <TableCell className="text-center">
                          <span
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${getPositionColor(row.position)}`}
                          >
                            {row.position}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
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
