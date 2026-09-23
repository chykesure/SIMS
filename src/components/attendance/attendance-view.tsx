// src/components/attendance/attendance-view.tsx
// Attendance module — teacher/admin shell: Dashboard, Take Attendance, QR Attendance, History

"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ClipboardCheck, RefreshCw, CheckCircle2, XCircle, Clock3, HelpCircle, UserX,
  QrCode, CalendarDays, History, PencilLine, Loader2,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RegisterTab } from "@/components/attendance/attendance-register";
import { QrTab } from "@/components/attendance/attendance-qr";
import { HistoryTab } from "@/components/attendance/attendance-history";

export const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

export function todayStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const STATUS_META: Record<string, { label: string; short: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
  PRESENT: { label: "Present", short: "P", className: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  ABSENT: { label: "Absent", short: "A", className: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
  LATE: { label: "Late", short: "L", className: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock3 },
  EXCUSED: { label: "Excused", short: "E", className: "bg-sky-100 text-sky-700 border-sky-200", icon: HelpCircle },
};

interface DashboardData {
  date: string;
  summary: { present: number; absent: number; late: number; excused: number; notMarked: number; marked: number };
  sessionsToday: number;
  activeSessions: number;
  byClass: { class: string; present: number; total: number; rate: number }[];
  recent: { id: string; class: string; subject: string; period: string; mode: string; status: string; teacherName: string; recordCount: number }[];
}

function DashboardTab({ data, loading }: { data: DashboardData | null; loading: boolean }) {
  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const cards = [
    { label: "Present", value: data.summary.present, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
    { label: "Absent", value: data.summary.absent, icon: XCircle, color: "text-red-600 bg-red-50" },
    { label: "Late", value: data.summary.late, icon: Clock3, color: "text-amber-600 bg-amber-50" },
    { label: "Not Marked", value: data.summary.notMarked, icon: UserX, color: "text-slate-500 bg-slate-100" },
    { label: "Registers Today", value: data.sessionsToday, hint: `${data.activeSessions} active now`, icon: ClipboardCheck, color: "text-indigo-600 bg-indigo-50" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label} className="border shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${c.color}`}>
                <c.icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold leading-tight">{c.value.toLocaleString()}</p>
                <p className="truncate text-xs font-medium text-muted-foreground">{c.label}</p>
                {"hint" in c && c.hint && <p className="truncate text-[11px] text-muted-foreground/80">{c.hint}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border shadow-sm">
          <CardContent className="p-5">
            <h3 className="mb-3 text-sm font-semibold">Class attendance — {data.date}</h3>
            {data.byClass.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No registers taken yet today. Start one in &ldquo;Take Attendance&rdquo; or &ldquo;QR Attendance&rdquo;.
              </p>
            ) : (
              <div className="space-y-2.5">
                {data.byClass.map((c) => (
                  <div key={c.class} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 truncate text-sm font-medium">{c.class}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${c.rate >= 75 ? "bg-emerald-500" : c.rate >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${Math.max(c.rate, 2)}%` }}
                      />
                    </div>
                    <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                      {c.present}/{c.total} · {c.rate}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-5">
            <h3 className="mb-3 text-sm font-semibold">Recent registers</h3>
            {data.recent.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nothing yet for {data.date}.</p>
            ) : (
              <div className="divide-y">
                {data.recent.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {s.class}{s.subject ? ` · ${s.subject}` : " · Daily"}{s.period ? ` (Period ${s.period})` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.teacherName || "—"} · {s.recordCount} marked
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {s.mode === "QR_TEACHER" && <QrCode className="size-3.5 text-muted-foreground" />}
                      <Badge variant="outline" className={s.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-600"}>
                        {s.status === "ACTIVE" ? "Active" : "Closed"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function AttendanceView() {
  const [tab, setTab] = useState("dashboard");
  const [meta, setMeta] = useState<{ classes: string[] } | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingDash, setLoadingDash] = useState(true);

  const loadMeta = useCallback(async () => {
    try {
      const res = await fetch("/api/classes");
      const json = await res.json();
      const classes: string[] = (json?.data ?? json ?? []).map((c: { title: string }) => c.title);
      setMeta({ classes });
    } catch {
      toast.error("Failed to load classes");
    } finally {
      setLoadingMeta(false);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoadingDash(true);
    try {
      const res = await fetch(`/api/attendance/dashboard?date=${todayStr()}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to load dashboard");
      setDashboard(json.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load dashboard");
    } finally {
      setLoadingDash(false);
    }
  }, []);

  useEffect(() => { loadMeta(); }, [loadMeta]);
  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const refresh = () => { loadDashboard(); };

  if (loadingMeta || !meta) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div {...fadeIn} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <ClipboardCheck className="size-5 text-emerald-600" /> Attendance
          </h1>
          <p className="text-sm text-muted-foreground">
            Daily &amp; per-period registers, QR scanning and reports.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}>
          {loadingDash ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Refresh
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto w-full justify-start overflow-x-auto">
          <TabsTrigger value="dashboard"><CalendarDays className="mr-1.5 size-4" />Dashboard</TabsTrigger>
          <TabsTrigger value="register"><PencilLine className="mr-1.5 size-4" />Take Attendance</TabsTrigger>
          <TabsTrigger value="qr"><QrCode className="mr-1.5 size-4" />QR Attendance</TabsTrigger>
          <TabsTrigger value="history"><History className="mr-1.5 size-4" />History &amp; Reports</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "dashboard" && <DashboardTab data={dashboard} loading={loadingDash} />}
      {tab === "register" && <RegisterTab classes={meta.classes} onSaved={refresh} />}
      {tab === "qr" && <QrTab classes={meta.classes} onSaved={refresh} />}
      {tab === "history" && <HistoryTab classes={meta.classes} />}
    </motion.div>
  );
}