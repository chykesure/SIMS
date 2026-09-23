// src/components/student/cbt-runner.tsx
// The test-taking experience: server-enforced timer, question palette, auto-save, submit.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, AlarmClock, Check, CloudUpload, Loader2, Trophy, TimerOff, ListChecks,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PaperItem {
  id: string;
  text: string;
  type: string;
  options: string[];
  marks: number;
}

interface RunnerExamMeta {
  id: string;
  title: string;
  subject: string;
  durationMinutes: number;
}

interface StartData {
  attemptId: string;
  attemptNo?: number;
  deadlineAt?: string;
  remainingSeconds?: number;
  paper?: PaperItem[];
  exam?: RunnerExamMeta;
  resumed?: boolean;
  expired?: boolean;
  message?: string;
}

interface ResultData {
  score: number;
  totalMarks: number;
  percentage: number;
}

type Phase = "starting" | "taking" | "submitting" | "result";

function fmtTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function CbtRunner({
  examId,
  attemptId: existingAttemptId,
  onExit,
}: {
  examId: string;
  attemptId?: string | null; // resume an in-progress attempt
  onExit: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("starting");
  const [startError, setStartError] = useState<string | null>(null);

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [exam, setExam] = useState<RunnerExamMeta | null>(null);
  const [paper, setPaper] = useState<PaperItem[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [current, setCurrent] = useState(0);

  const [remaining, setRemaining] = useState<number>(0);
  const [savingMap, setSavingMap] = useState<Record<string, "saving" | "saved">>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<ResultData | null>(null);
  const [autoSubmitted, setAutoSubmitted] = useState(false);

  const deadlineRef = useRef<number>(0);
  const submittedRef = useRef(false);

  // ---------- lifecycle ----------

  // Resume an existing attempt
  useEffect(() => {
    if (!existingAttemptId) return;
    (async () => {
      try {
        const res = await fetch(`/api/portal/student/cbt/attempts/${existingAttemptId}`);
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || "Failed to resume");
        const d = json.data;
        if (d.state === "submitted") {
          setResult(d.result);
          setAutoSubmitted(!!d.autoSubmitted);
          setPhase("result");
        } else {
          hydrate({
            attemptId: d.attemptId,
            remainingSeconds: d.remainingSeconds,
            deadlineAt: d.deadlineAt,
            paper: d.paper,
            exam: d.exam,
          });
          setAnswers(d.savedAnswers || {});
        }
      } catch (error) {
        setStartError(error instanceof Error ? error.message : "Failed to resume");
      }
    })();
  }, [existingAttemptId]);

  // Start a fresh attempt
  useEffect(() => {
    if (existingAttemptId || phase !== "starting" || attemptId) return;
    (async () => {
      try {
        const res = await fetch(`/api/portal/student/cbt/${examId}/start`, { method: "POST" });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || "Failed to start");
        const d: StartData = json.data;
        if (d.expired || d.resumed) {
          // raced into resume/expiry — hand back to the list view
          toast.info(d.message || "Resuming your attempt...");
          onExit();
          return;
        }
        hydrate(d);
      } catch (error) {
        setStartError(error instanceof Error ? error.message : "Failed to start");
      }
    })();
  }, [examId, existingAttemptId, phase, attemptId, onExit]);

  const hydrate = (d: StartData) => {
    setAttemptId(d.attemptId);
    setExam(d.exam || null);
    setPaper(d.paper || []);
    deadlineRef.current = d.deadlineAt ? new Date(d.deadlineAt).getTime() : Date.now() + (d.remainingSeconds || 0) * 1000;
    setRemaining(Math.max(0, Math.floor((deadlineRef.current - Date.now()) / 1000)));
    setPhase("taking");
  };

  // ---------- timer (server deadline is the source of truth) ----------

  const doSubmit = useCallback(async (auto: boolean) => {
    if (!attemptId || submittedRef.current) return;
    submittedRef.current = true;
    setPhase("submitting");
    try {
      const res = await fetch(`/api/portal/student/cbt/attempts/${attemptId}/submit`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to submit");
      setResult(json.data.result);
      setAutoSubmitted(auto);
      setPhase("result");
      if (auto) toast.warning("Time is up — your test was submitted automatically.");
    } catch (error) {
      submittedRef.current = false;
      setPhase("taking");
      toast.error(error instanceof Error ? error.message : "Failed to submit");
    }
  }, [attemptId]);

  useEffect(() => {
    if (phase !== "taking") return;
    const t = setInterval(() => {
      const secs = Math.max(0, Math.floor((deadlineRef.current - Date.now()) / 1000));
      setRemaining(secs);
      if (secs <= 0) {
        clearInterval(t);
        doSubmit(true);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [phase, doSubmit]);

  // warn before leaving mid-test
  useEffect(() => {
    if (phase !== "taking") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  // ---------- answering ----------

  const pickAnswer = (questionId: string, index: number) => {
    if (!attemptId) return;
    setAnswers((a) => ({ ...a, [questionId]: index }));
    setSavingMap((m) => ({ ...m, [questionId]: "saving" }));

    (async () => {
      try {
        const res = await fetch(`/api/portal/student/cbt/attempts/${attemptId}/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId, selectedIndex: index }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || "Save failed");
        setSavingMap((m) => ({ ...m, [questionId]: "saved" }));
      } catch {
        setSavingMap((m) => {
          const { [questionId]: _drop, ...rest } = m;
          return rest;
        });
        toast.error("Could not save that answer — check your connection and try again.");
      }
    })();
  };

  // ---------- render ----------

  if (phase === "starting") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        {startError ? (
          <>
            <TimerOff className="size-10 text-red-400" />
            <p className="text-sm font-medium">{startError}</p>
            <Button variant="outline" onClick={onExit}>Back to CBT &amp; Tests</Button>
          </>
        ) : (
          <>
            <Loader2 className="size-8 animate-spin text-indigo-600" />
            <p className="text-sm text-muted-foreground">Preparing your test...</p>
          </>
        )}
      </div>
    );
  }

  if (phase === "result" && result) {
    const passed = result.percentage >= 50;
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className={`flex size-16 items-center justify-center rounded-full ${passed ? "bg-emerald-100" : "bg-amber-100"}`}>
          <Trophy className={`size-8 ${passed ? "text-emerald-600" : "text-amber-600"}`} />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold">Test submitted!</h2>
          <p className="text-sm text-muted-foreground">{exam?.title || "Your test"} has been graded.</p>
        </div>
        <Card className="w-full max-w-sm border shadow-sm">
          <CardContent className="space-y-2 p-6 text-center">
            <p className="text-4xl font-bold">{result.percentage}%</p>
            <p className="text-sm text-muted-foreground">{result.score} out of {result.totalMarks} marks</p>
            {autoSubmitted && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700">Auto-submitted — time expired</Badge>
            )}
          </CardContent>
        </Card>
        <Button onClick={onExit}>Back to CBT &amp; Tests</Button>
      </div>
    );
  }

  if (phase === "submitting") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 animate-spin text-indigo-600" />
        <p className="text-sm text-muted-foreground">Submitting &amp; grading your test...</p>
      </div>
    );
  }

  const item = paper[current];
  const answeredCount = Object.values(answers).filter((v) => v >= 0).length;
  const progressPct = paper.length ? Math.round((answeredCount / paper.length) * 100) : 0;
  const lowTime = remaining <= 60;

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <Card className="border shadow-sm">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold sm:text-base">{exam?.title || "Test"}</h2>
            <p className="text-xs text-muted-foreground">{exam?.subject} · {paper.length} questions</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-lg font-bold ${lowTime ? "bg-red-50 text-red-600" : "bg-muted"}`}>
              <AlarmClock className={`size-4 ${lowTime ? "animate-pulse" : ""}`} />
              {fmtTime(remaining)}
            </div>
            <Button onClick={() => setConfirmOpen(true)} disabled={phase !== "taking"}>
              <Check className="size-4" /> Submit
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <Progress value={progressPct} className="h-2 flex-1" />
        <span className="text-xs text-muted-foreground">{answeredCount}/{paper.length} answered</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
        {/* Question */}
        {item && (
          <Card className="border shadow-sm">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <Badge variant="outline">Question {current + 1} of {paper.length}</Badge>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {savingMap[item.id] === "saving" ? (
                    <><CloudUpload className="size-3.5 animate-pulse" /> saving...</>
                  ) : savingMap[item.id] === "saved" || answers[item.id] !== undefined ? (
                    <><Check className="size-3.5 text-emerald-500" /> saved</>
                  ) : (
                    "not answered"
                  )}
                  {" · "}{item.marks} mark{item.marks > 1 ? "s" : ""}
                </span>
              </div>

              <p className="text-base font-medium leading-relaxed">{item.text}</p>

              <RadioGroup
                value={answers[item.id] !== undefined ? String(answers[item.id]) : undefined}
                onValueChange={(v) => pickAnswer(item.id, Number(v))}
                className="gap-2.5"
              >
                {item.options.map((opt, i) => (
                  <Label
                    key={i}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 text-sm font-normal transition-colors ${
                      answers[item.id] === i
                        ? "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200"
                        : "hover:bg-muted/60"
                    }`}
                  >
                    <RadioGroupItem value={String(i)} className="mt-0.5" />
                    <span>
                      <span className="mr-1.5 font-semibold">{String.fromCharCode(65 + i)}.</span>
                      {opt}
                    </span>
                  </Label>
                ))}
              </RadioGroup>

              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>
                  <ArrowLeft className="size-4" /> Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrent((c) => Math.min(paper.length - 1, c + 1))}
                  disabled={current === paper.length - 1}
                >
                  Next <ArrowRight className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Palette */}
        <Card className="order-first border shadow-sm lg:order-none">
          <CardContent className="p-4">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <ListChecks className="size-3.5" /> Question palette
            </p>
            <div className="grid grid-cols-8 gap-1.5 lg:grid-cols-5">
              {paper.map((p, i) => {
                const answered = answers[p.id] !== undefined && answers[p.id] >= 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => setCurrent(i)}
                    className={`flex size-8 items-center justify-center rounded-md text-xs font-semibold transition-colors ${
                      i === current
                        ? "bg-indigo-600 text-white ring-2 ring-indigo-300"
                        : answered
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 space-y-1 border-t pt-3 text-[11px] text-muted-foreground">
              <p><span className="mr-1.5 inline-block size-2 rounded-full bg-emerald-400 align-middle" />answered</p>
              <p><span className="mr-1.5 inline-block size-2 rounded-full bg-muted-foreground/40 align-middle" />not answered</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submit confirm */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit your test?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered <strong>{answeredCount}</strong> of <strong>{paper.length}</strong> questions.
              {answeredCount < paper.length && " Unanswered questions are marked wrong."}
              {" "}Once submitted, you cannot change your answers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep working</AlertDialogCancel>
            <AlertDialogAction onClick={() => doSubmit(false)}>Submit test</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}