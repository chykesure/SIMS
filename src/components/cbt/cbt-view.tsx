// src/components/cbt/cbt-view.tsx
// CBT & Exams module — teacher/admin shell: Dashboard, Question Bank, Exams, Submissions

"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  MonitorPlay, FileQuestion, FileText, ClipboardList, RefreshCw, Plus, Rocket, Users,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuestionsTab, type CbtQuestionRow } from "@/components/cbt/cbt-questions-tab";
import { ExamsTab, type CbtExamRow } from "@/components/cbt/cbt-exams-tab";
import { SubmissionsTab } from "@/components/cbt/cbt-submissions-tab";

// ---------- shared types & helpers ----------

export const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

export interface SessionOption {
  id: string;
  label: string; // "2025/2026"
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-NG", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export function examStatusMeta(status: string): { label: string; className: string } {
  switch (status) {
    case "PUBLISHED":
      return { label: "Published", className: "bg-emerald-100 text-emerald-700 border-emerald-200" };
    case "CLOSED":
      return { label: "Closed", className: "bg-slate-100 text-slate-600 border-slate-200" };
    default:
      return { label: "Draft", className: "bg-amber-100 text-amber-700 border-amber-200" };
  }
}

export type { CbtQuestionRow, CbtExamRow };

// ---------- skeleton ----------

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
    </div>
  );
}

// ---------- dashboard tab ----------

interface DashboardData {
  questionStats: { total: number; mcqCount: number; tfCount: number };
  exams: CbtExamRow[];
}

function DashboardTab({ data, loading, onGoTo }: { data: DashboardData | null; loading: boolean; onGoTo: (tab: string) => void }) {
  if (loading || !data) return <StatsSkeleton />;

  const published = data.exams.filter((e) => e.status === "PUBLISHED");
  const drafts = data.exams.filter((e) => e.status === "DRAFT");
  const totalAttempts = data.exams.reduce((s, e) => s + (e._count?.attempts ?? 0), 0);
  const openNow = published.filter((e) => {
    const now = new Date();
    return new Date(e.startsAt) <= now && new Date(e.endsAt) >= now;
  });

  const cards = [
    { label: "Question Bank", value: data.questionStats.total, hint: `${data.questionStats.mcqCount} MCQ · ${data.questionStats.tfCount} True/False`, icon: FileQuestion, color: "text-indigo-600 bg-indigo-50" },
    { label: "Open Now", value: openNow.length, hint: `${published.length} published · ${drafts.length} drafts`, icon: Rocket, color: "text-emerald-600 bg-emerald-50" },
    { label: "Total Exams", value: data.exams.length, hint: "All sessions", icon: FileText, color: "text-sky-600 bg-sky-50" },
    { label: "Student Attempts", value: totalAttempts, hint: "Across all exams", icon: Users, color: "text-violet-600 bg-violet-50" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="border shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${c.color}`}>
                <c.icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold leading-tight">{c.value.toLocaleString()}</p>
                <p className="truncate text-xs font-medium text-muted-foreground">{c.label}</p>
                <p className="truncate text-[11px] text-muted-foreground/80">{c.hint}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <ClipboardList className="size-4 text-muted-foreground" /> Recent Exams
            </h3>
            <Button variant="ghost" size="sm" onClick={() => onGoTo("exams")}>View all</Button>
          </div>
          {data.exams.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <MonitorPlay className="size-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">No exams yet</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Start by adding questions to the Question Bank, then create your first CBT exam.
              </p>
              <Button size="sm" className="mt-2" onClick={() => onGoTo("questions")}>
                <Plus className="size-4" /> Add questions
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {data.exams.slice(0, 6).map((exam) => {
                const meta = examStatusMeta(exam.status);
                return (
                  <div key={exam.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{exam.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {exam.subject} · {exam.class} · {exam.session} {exam.term}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        {exam._count?.questions ?? 0} questions · {exam.durationMinutes}min
                      </span>
                      <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- main view ----------

export function CbtView() {
  const [tab, setTab] = useState("dashboard");
  const [meta, setMeta] = useState<{ subjects: string[]; classes: string[]; sessions: SessionOption[] } | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [submissionExamId, setSubmissionExamId] = useState<string | null>(null);

  const loadMeta = useCallback(async () => {
    try {
      const [subsRes, clsRes, sesRes] = await Promise.all([
        fetch("/api/subjects"),
        fetch("/api/classes"),
        fetch("/api/sessions"),
      ]);
      const subs = await subsRes.json();
      const cls = await clsRes.json();
      const ses = await sesRes.json();

      const subjects: string[] = (subs?.data ?? subs ?? []).map((s: { name: string }) => s.name);
      const classes: string[] = (cls?.data ?? cls ?? []).map((c: { title: string }) => c.title);
      const sessions: SessionOption[] = (ses?.data ?? ses ?? []).map((s: { id: string; sessionOne: string; sessionTwo: string }) => ({
        id: s.id,
        label: `${s.sessionOne}/${s.sessionTwo}`,
      }));

      setMeta({ subjects, classes, sessions });
    } catch {
      toast.error("Failed to load subjects / classes / sessions");
    } finally {
      setLoadingMeta(false);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoadingDashboard(true);
    try {
      const [qRes, eRes] = await Promise.all([
        fetch("/api/cbt/questions"),
        fetch("/api/cbt/exams"),
      ]);
      const qJson = await qRes.json();
      const eJson = await eRes.json();
      if (!qRes.ok || !qJson.success) throw new Error(qJson.message || "Failed to load questions");
      if (!eRes.ok || !eJson.success) throw new Error(eJson.message || "Failed to load exams");
      setDashboard({
        questionStats: qJson.data.stats,
        exams: eJson.data,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load dashboard");
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  useEffect(() => { loadMeta(); }, [loadMeta]);
  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const refreshAll = () => { loadDashboard(); };

  if (loadingMeta || !meta) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <StatsSkeleton />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <motion.div {...fadeIn} className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <MonitorPlay className="size-5 text-indigo-600" /> CBT &amp; Exams
          </h1>
          <p className="text-sm text-muted-foreground">
            Computer-based tests — question bank, timed exams, auto-grading &amp; performance.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshAll}>
          <RefreshCw className="size-4" /> Refresh
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v); if (v === "submissions" && !submissionExamId && dashboard?.exams.length) setSubmissionExamId(dashboard.exams[0].id); }}>
        <TabsList className="h-auto w-full justify-start overflow-x-auto">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="questions">Question Bank</TabsTrigger>
          <TabsTrigger value="exams">Exams</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "dashboard" && (
        <DashboardTab data={dashboard} loading={loadingDashboard} onGoTo={setTab} />
      )}
      {tab === "questions" && <QuestionsTab subjects={meta.subjects} classes={meta.classes} />}
      {tab === "exams" && (
        <ExamsTab
          subjects={meta.subjects}
          classes={meta.classes}
          sessions={meta.sessions}
          onDeleted={refreshAll}
          onViewSubmissions={(examId) => { setSubmissionExamId(examId); setTab("submissions"); }}
        />
      )}
      {tab === "submissions" && (
        <SubmissionsTab examId={submissionExamId} onExamChange={setSubmissionExamId} />
      )}
    </motion.div>
  );
}