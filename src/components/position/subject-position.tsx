"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Medal, BarChart3 } from "lucide-react";
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
  Table,
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

interface SubjectPositionRow extends ExamScore {
  ca: number;
  position: number;
  grade: string;
}

function getGrade(total: number): string {
  if (total >= 70) return "A";
  if (total >= 60) return "B";
  if (total >= 50) return "C";
  if (total >= 40) return "P";
  return "F";
}

function getGradeColor(grade: string): string {
  switch (grade) {
    case "A":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "B":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "C":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "P":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
    default:
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  }
}

function getPositionBadge(position: number) {
  if (position === 1) {
    return (
      <Badge className="bg-yellow-400 text-yellow-900 hover:bg-yellow-400">
        <Medal className="mr-1 h-3 w-3" /> 1st
      </Badge>
    );
  }
  if (position === 2) {
    return (
      <Badge className="bg-gray-300 text-gray-800 hover:bg-gray-300">
        <Medal className="mr-1 h-3 w-3" /> 2nd
      </Badge>
    );
  }
  if (position === 3) {
    return (
      <Badge className="bg-amber-500 text-amber-100 hover:bg-amber-500">
        <Medal className="mr-1 h-3 w-3" /> 3rd
      </Badge>
    );
  }
  return <span className="text-muted-foreground">{position}</span>;
}

export default function SubjectPositionView() {
  const { currentPage } = useAppStore();
  const [sessions, setSessions] = useState<{ id: string; sessionOne: string; sessionTwo: string }[]>([]);
  const [classes, setClasses] = useState<{ id: string; title: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [dropdownLoading, setDropdownLoading] = useState(true);
  const [rows, setRows] = useState<SubjectPositionRow[]>([]);
  const [generated, setGenerated] = useState(false);

  const fetchDropdowns = useCallback(async () => {
    try {
      setDropdownLoading(true);
      const [sessRes, classRes, subjRes] = await Promise.all([
        fetch("/api/sessions"),
        fetch("/api/classes"),
        fetch("/api/subjects"),
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
      if (subjRes.ok) {
        const subjData = await subjRes.json();
        setSubjects(subjData);
      }
    } catch {
      toast.error("Failed to load dropdown data");
    } finally {
      setDropdownLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentPage === "subject-position") fetchDropdowns();
  }, [currentPage, fetchDropdowns]);

  const handleGenerate = async () => {
    if (!selectedSession || !selectedClass || !selectedTerm || !selectedSubject) {
      toast.error("Please select Session, Class, Term, and Subject");
      return;
    }
    try {
      setLoading(true);
      setGenerated(false);
      const params = new URLSearchParams({
        session: selectedSession,
        class: selectedClass,
        term: selectedTerm,
        subject: selectedSubject,
      });
      const res = await fetch(`/api/exams?${params}`);
      if (!res.ok) throw new Error("Failed to fetch exam scores");
      const data: ExamScore[] = await res.json();

      if (data.length === 0) {
        toast.info("No scores found for the selected criteria");
        setRows([]);
        setGenerated(true);
        return;
      }

      const rowsWithCa: SubjectPositionRow[] = data.map((score) => ({
        ...score,
        ca: score.firstCa + score.secondCa,
        grade: getGrade(score.total),
        position: 0,
      }));

      // Sort by total descending and assign positions
      const sorted = [...rowsWithCa].sort((a, b) => b.total - a.total);
      sorted.forEach((row, idx) => {
        row.position = idx + 1;
      });

      setRows(sorted);
      setGenerated(true);
      toast.success("Subject positions generated");
    } catch {
      toast.error("Failed to generate subject positions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Medal className="h-5 w-5" />
            Subject Position
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {dropdownLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Subject</label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.name}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <Button onClick={handleGenerate} disabled={loading} className="gap-2">
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Generating...
              </>
            ) : (
              <>
                <BarChart3 className="h-4 w-4" />
                Generate
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {generated && (
        <Card>
          <CardContent className="p-0">
            {rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="mb-3 h-12 w-12 text-muted-foreground/40" />
                <p className="text-muted-foreground">
                  No scores available for the selected criteria.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Fullname</TableHead>
                      <TableHead className="text-center">CA</TableHead>
                      <TableHead className="text-center">Exam</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">Grade</TableHead>
                      <TableHead className="text-center">Position</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, idx) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{idx + 1}</TableCell>
                        <TableCell className="font-medium whitespace-nowrap">
                          {row.fullname}
                        </TableCell>
                        <TableCell className="text-center">{row.ca}</TableCell>
                        <TableCell className="text-center">
                          {row.exam}
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {row.total}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="secondary"
                            className={getGradeColor(row.grade)}
                          >
                            {row.grade}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {getPositionBadge(row.position)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
