// src/components/student/student-cbt.tsx
// Student portal — CBT & Tests: available / upcoming / completed exams

"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  MonitorPlay, Clock, CalendarDays, Play, RotateCcw, Loader2, RefreshCw, Trophy, Hourglass, Lock,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CbtRunner } from "@/components/student/cbt-runner";

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

interface ExamCard {
  id: string;
  title: string;
  description: string;
  subject: string;
  session: string;
  term: string;
  durationMinutes: number;
  attemptsAllowed: number;
  attemptsUsed: number;
  attemptsLeft: number;
  hasInProgress: boolean;
  inProgressAttemptId: string | null;
  window: "upcoming" | "open" | "closed";
  startsAt: string;
  endsAt: string;
  bestPercentage: number | null;
  lastScore: { score: number; totalMarks: number } | null;
}

function fmtDateTime(value: string): string {
  return new Date(value).toLocaleString("en-NG", {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function windowMeta(w: ExamCard["window"]): { label: string; className: string } {
  switch (w) {
    case "open": return { label: "Open now", className: "bg-emerald-100 text-emerald-700 border-emerald-200" };
    case "upcoming": return { label: "Upcoming", className: "bg-sky-100 text-sky-700 border-sky-200" };
    default: return { label: "Closed", className: "bg-slate-100 text-slate-600 border-slate-200" };
  }
}

export function StudentCbt() {
  const [exams, setExams] = useState<ExamCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<{ examId: string; attemptId?: string | null } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/student/cbt");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to load tests");
      setExams(json.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load tests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (active) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => { setActive(null); load(); }}>
          ← Exit test
        </Button>
        <CbtRunner examId={active.examId} attemptId={active.attemptId} onExit={() => { setActive(null); load(); }} />
      </div>
    );
  }

  const open = exams.filter((e) => e.window === "open");
  const upcoming = exams.filter((e) => e.window === "upcoming");
  const closed = exams.filter((e) => e.window === "closed");
  const done = closed.filter((e) => e.lastScore || e.bestPercentage !== null);

  const startOrResume = (exam: ExamCard) => {
    if (exam.hasInProgress && exam.inProgressAttemptId) {
      setActive({ examId: exam.id, attemptId: exam.inProgressAttemptId });
    } else if (exam.attemptsLeft > 0) {
      setActive({ examId: exam.id });
    }
  };

  return (
    <motion.div {...fadeIn} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <MonitorPlay className="size-5 text-indigo-600" /> CBT &amp; Tests
          </h1>
          <p className="text-sm text-muted-foreground">Take your computer-based tests and view your scores.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      ) : exams.length === 0 ? (
        <Card className="border shadow-sm">
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <MonitorPlay className="size-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">No tests yet</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              When your teachers publish a CBT for your class, it will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Open now */}
          {open.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">Available now</h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {open.map((exam) => {
                  const canStart = exam.hasInProgress || exam.attemptsLeft > 0;
                  return (
                    <Card key={exam.id} className="border shadow-sm transition-shadow hover:shadow-md">
                      <CardContent className="space-y-3 p-5">
                        <div className="flex items-start justify-between gap-2">
                          <Badge variant="outline" className={windowMeta(exam.window).className}>Open now</Badge>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="size-3.5" /> {exam.durationMinutes} min
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold leading-snug">{exam.title}</p>
                          <p className="text-xs text-muted-foreground">{exam.subject} · {exam.session} {exam.term}</p>
                          {exam.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{exam.description}</p>}
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p className="flex items-center gap-1.5"><CalendarDays className="size-3.5" /> closes {fmtDateTime(exam.endsAt)}</p>
                          <p>
                            Attempts: {exam.attemptsUsed}/{exam.attemptsAllowed}
                            {exam.attemptsLeft > 0 && ` · ${exam.attemptsLeft} left`}
                          </p>
                        </div>
                        <Button
                          className="w-full"
                          disabled={!canStart}
                          onClick={() => startOrResume(exam)}
                        >
                          {exam.hasInProgress ? (
                            <><RotateCcw className="size-4" /> Resume test</>
                          ) : canStart ? (
                            <><Play className="size-4" /> Start test</>
                          ) : (
                            <><Lock className="size-4" /> No attempts left</>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">Upcoming</h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {upcoming.map((exam) => (
                  <Card key={exam.id} className="border shadow-sm opacity-90">
                    <CardContent className="space-y-3 p-5">
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant="outline" className={windowMeta(exam.window).className}>Upcoming</Badge>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3.5" /> {exam.durationMinutes} min
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold leading-snug">{exam.title}</p>
                        <p className="text-xs text-muted-foreground">{exam.subject} · {exam.session} {exam.term}</p>
                      </div>
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Hourglass className="size-3.5" /> opens {fmtDateTime(exam.startsAt)}
                      </p>
                      <Button className="w-full" disabled variant="outline">
                        <Clock className="size-4" /> Not open yet
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Completed / past */}
          {done.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">Completed &amp; results</h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {done.map((exam) => (
                  <Card key={exam.id} className="border shadow-sm">
                    <CardContent className="space-y-3 p-5">
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant="outline" className={windowMeta("closed").className}>Closed</Badge>
                        {exam.bestPercentage !== null && (
                          <Badge variant="outline" className={
                            exam.bestPercentage >= 70 ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : exam.bestPercentage >= 50 ? "bg-amber-100 text-amber-700 border-amber-200"
                                : "bg-red-100 text-red-700 border-red-200"
                          }>
                            <Trophy className="mr-1 size-3" /> best {exam.bestPercentage}%
                          </Badge>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold leading-snug">{exam.title}</p>
                        <p className="text-xs text-muted-foreground">{exam.subject} · {exam.session} {exam.term}</p>
                      </div>
                      {exam.lastScore && (
                        <p className="text-xs text-muted-foreground">
                          Last score: <span className="font-semibold text-foreground">{exam.lastScore.score}/{exam.lastScore.totalMarks}</span>
                        </p>
                      )}
                      <Button variant="outline" className="w-full" onClick={() => setActive({ examId: exam.id })} disabled>
                        <Loader2 className="hidden size-4" /> Submitted — {exam.attemptsUsed}/{exam.attemptsAllowed} used
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </motion.div>
  );
}