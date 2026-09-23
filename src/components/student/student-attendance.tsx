// src/components/student/student-attendance.tsx
// Student portal — My Attendance: rate summary + record history

"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ClipboardCheck, RefreshCw } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  PRESENT: { label: "Present", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  ABSENT: { label: "Absent", className: "bg-red-100 text-red-700 border-red-200" },
  LATE: { label: "Late", className: "bg-amber-100 text-amber-700 border-amber-200" },
  EXCUSED: { label: "Excused", className: "bg-sky-100 text-sky-700 border-sky-200" },
};

interface RecordRow {
  id: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  markedAt: string;
  session: { id: string; class: string; subject: string; period: string; date: string };
}

interface AttendanceData {
  summary: { present: number; absent: number; late: number; excused: number; rate: number };
  records: RecordRow[];
}

function fmtDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export function StudentAttendance() {
  const [data, setData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/student/attendance");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to load attendance");
      setData(json.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-56" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  const s = data?.summary;

  return (
    <motion.div {...fadeIn} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <ClipboardCheck className="size-5 text-emerald-600" /> My Attendance
          </h1>
          <p className="text-sm text-muted-foreground">Your attendance record across all registers.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {s && (
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: "Present", value: s.present, color: "text-emerald-600 bg-emerald-50" },
            { label: "Absent", value: s.absent, color: "text-red-600 bg-red-50" },
            { label: "Late", value: s.late, color: "text-amber-600 bg-amber-50" },
            { label: "Attendance Rate", value: `${s.rate}%`, color: s.rate >= 75 ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50" },
          ].map((c) => (
            <Card key={c.label} className="border shadow-sm">
              <CardContent className="flex items-center gap-3 p-5">
                <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${c.color}`}>
                  <span className="text-lg font-bold">{c.label === "Attendance Rate" ? "%" : c.value}</span>
                </div>
                <div>
                  <p className="text-xl font-bold leading-tight">{c.label === "Attendance Rate" ? `${s.rate}%` : c.value}</p>
                  <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border shadow-sm">
        <CardContent className="p-0">
          {!data || data.records.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-14 text-center">
              <ClipboardCheck className="size-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">No attendance records yet</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Once your teachers mark the register, your attendance will show here.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {data.records.map((r) => {
                const meta = STATUS_STYLE[r.status];
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {r.session.subject || "Daily register"}
                        {r.session.period ? ` · Period ${r.session.period}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">{fmtDate(r.session.date)} · {r.session.class}</p>
                    </div>
                    <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}