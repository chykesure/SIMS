// src/components/cbt/cbt-submissions-tab.tsx
// Submissions — pick an exam, view attempts + performance stats

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { BarChart3, Loader2, Clock, CheckCircle2, Users, Trophy, TrendingUp, Target } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/components/cbt/cbt-view";

interface AttemptRow {
  id: string;
  studentName: string;
  attemptNo: number;
  status: "IN_PROGRESS" | "SUBMITTED";
  startedAt: string;
  submittedAt: string | null;
  autoSubmitted: boolean;
  score: number;
  totalMarks: number;
  percentage: number;
  answeredCount: number;
  paperCount: number;
}

interface SubmissionsData {
  exam: {
    id: string; title: string; subject: string; class: string; session: string; term: string;
    status: string; durationMinutes: number; attemptsAllowed: number;
    questionCount: number; questionPool: number; startsAt: string; endsAt: string;
  };
  stats: {
    attemptCount: number; distinctStudents: number; submittedCount: number; inProgressCount: number;
    avgScore: number; highestScore: number; lowestScore: number; passRate: number;
  };
  attempts: AttemptRow[];
}

function scoreBadge(pct: number): string {
  if (pct >= 70) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (pct >= 50) return "bg-amber-100 text-amber-700 border-amber-200";
  if (pct > 0) return "bg-red-100 text-red-700 border-red-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

export function SubmissionsTab({ examId, onExamChange }: { examId: string | null; onExamChange: (id: string | null) => void }) {
  const [exams, setExams] = useState<{ id: string; title: string; class: string; subject: string }[]>([]);
  const [data, setData] = useState<SubmissionsData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/cbt/exams");
        const json = await res.json();
        if (res.ok && json.success) {
          setExams(json.data.map((e: { id: string; title: string; class: string; subject: string }) => ({ id: e.id, title: e.title, class: e.class, subject: e.subject })));
        }
      } catch {
        /* picker stays empty; main view will show error toast elsewhere */
      }
    })();
  }, []);

  const loadSubmissions = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cbt/exams/${id}/submissions`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to load submissions");
      setData(json.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load submissions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (examId) loadSubmissions(examId);
    else setData(null);
  }, [examId, loadSubmissions]);

  return (
    <div className="space-y-4">
      {/* Exam picker */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={examId || undefined} onValueChange={(v) => onExamChange(v)}>
          <SelectTrigger className="w-72"><SelectValue placeholder="Select an exam to view submissions" /></SelectTrigger>
          <SelectContent>
            {exams.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.title} — {e.class}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </div>

      {!examId ? (
        <Card className="border shadow-sm">
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <BarChart3 className="size-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">No exam selected</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Choose an exam above to see attempts, scores and performance summary.
            </p>
          </CardContent>
        </Card>
      ) : !data ? (
        <Card className="border shadow-sm"><CardContent className="py-16" /></Card>
      ) : (
        <>
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Students Tested", value: data.stats.distinctStudents, hint: `${data.stats.attemptCount} attempts · ${data.stats.inProgressCount} in progress`, icon: Users, color: "text-indigo-600 bg-indigo-50" },
              { label: "Average Score", value: `${data.stats.avgScore}%`, hint: `${data.stats.submittedCount} submitted`, icon: TrendingUp, color: "text-sky-600 bg-sky-50" },
              { label: "Highest", value: `${data.stats.highestScore}%`, hint: `Lowest ${data.stats.lowestScore}%`, icon: Trophy, color: "text-amber-600 bg-amber-50" },
              { label: "Pass Rate (≥50%)", value: `${data.stats.passRate}%`, hint: data.exam.questionPool ? `${data.exam.questionPool} questions in pool` : "", icon: Target, color: "text-emerald-600 bg-emerald-50" },
            ].map((c) => (
              <Card key={c.label} className="border shadow-sm">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${c.color}`}>
                    <c.icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold leading-tight">{c.value}</p>
                    <p className="truncate text-xs font-medium text-muted-foreground">{c.label}</p>
                    {c.hint && <p className="truncate text-[11px] text-muted-foreground/80">{c.hint}</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Attempts table */}
          <Card className="border shadow-sm">
            <CardContent className="p-0">
              {data.attempts.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-14 text-center">
                  <Clock className="size-10 text-muted-foreground/40" />
                  <p className="text-sm font-medium">No attempts yet</p>
                  <p className="max-w-sm text-xs text-muted-foreground">
                    Once students start this exam, their attempts and scores appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead className="text-center">Attempt</TableHead>
                        <TableHead className="hidden md:table-cell">Started</TableHead>
                        <TableHead className="hidden md:table-cell">Submitted</TableHead>
                        <TableHead className="text-center">Answered</TableHead>
                        <TableHead className="text-center">Score</TableHead>
                        <TableHead className="text-right">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.attempts.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell>
                            <p className="text-sm font-medium">{a.studentName || "—"}</p>
                            {a.status === "IN_PROGRESS" ? (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                                <Clock className="size-3" /> in progress
                              </span>
                            ) : a.autoSubmitted ? (
                              <span className="text-xs text-muted-foreground">auto-submitted (time up)</span>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-center text-sm">#{a.attemptNo}</TableCell>
                          <TableCell className="hidden text-xs md:table-cell">{formatDateTime(a.startedAt)}</TableCell>
                          <TableCell className="hidden text-xs md:table-cell">{a.submittedAt ? formatDateTime(a.submittedAt) : "—"}</TableCell>
                          <TableCell className="text-center text-sm">{a.answeredCount}/{a.paperCount}</TableCell>
                          <TableCell className="text-center text-sm">
                            {a.status === "SUBMITTED" ? `${a.score}/${a.totalMarks}` : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {a.status === "SUBMITTED" ? (
                              <Badge variant="outline" className={scoreBadge(a.percentage)}>{a.percentage}%</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-slate-100 text-slate-600">—</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}