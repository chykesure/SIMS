"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Table, FileSpreadsheet } from "lucide-react";
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

  const handleGenerate = async () => {
    if (!selectedSession || !selectedClass || !selectedTerm) {
      toast.error("Please select Session, Class, and Term");
      return;
    }
    try {
      setDataLoading(true);
      setGenerated(false);
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
          total,
          average: uniqueSubjects.length > 0 ? parseFloat((total / uniqueSubjects.length).toFixed(2)) : 0,
          position: 0,
        };
      });

      // Assign positions based on total (descending)
      const sorted = [...studentRows].sort((a, b) => b.total - a.total);
      sorted.forEach((row, idx) => {
        row.position = idx + 1;
      });

      setRows(studentRows.sort((a, b) => a.position - b.position));
      setSubjects(uniqueSubjects);
      setGenerated(true);
      toast.success("Broadsheet generated successfully");
    } catch {
      toast.error("Failed to generate broadsheet");
    } finally {
      setDataLoading(false);
    }
  };

  const getCellColor = (score: number): string => {
    if (score >= 50) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    if (score >= 40) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
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
          <Button
            onClick={handleGenerate}
            disabled={dataLoading}
            className="gap-2"
          >
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
                        <TableHead key={subj} className="min-w-[80px] text-center">
                          <span className="text-xs font-medium">{subj}</span>
                        </TableHead>
                      ))}
                      <TableHead className="min-w-[70px] text-center font-bold">
                        Total
                      </TableHead>
                      <TableHead className="min-w-[70px] text-center font-bold">
                        Average
                      </TableHead>
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
                        {subjects.map((subj) => {
                          const score = row.subjects[subj] || 0;
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
                        <TableCell className="text-center font-bold">
                          {row.total}
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {row.average}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                              row.position === 1
                                ? "bg-yellow-400 text-yellow-900"
                                : row.position === 2
                                  ? "bg-gray-300 text-gray-800"
                                  : row.position === 3
                                    ? "bg-amber-500 text-amber-100"
                                    : "text-muted-foreground"
                            }`}
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
