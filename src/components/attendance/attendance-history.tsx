// src/components/attendance/attendance-history.tsx
// History & Reports — session list + per-student attendance lookup

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { History, Search, Loader2, QrCode, PencilLine, CalendarDays } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { STATUS_META } from "@/components/attendance/attendance-view";

interface SessionRow {
  id: string;
  class: string;
  subject: string;
  period: string;
  date: string;
  mode: string;
  status: string;
  teacherName: string;
  recordCount: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
}

interface HistoryRecord {
  id: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  method: string;
  markedAt: string;
  session: { id: string; class: string; subject: string; period: string; date: string };
}

interface StudentLite {
  id: string;
  regNo: string;
  fullname: string;
  class: string;
}

function fmtDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export function HistoryTab({ classes }: { classes: string[] }) {
  const [fClass, setFClass] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  // student lookup
  const [lookupName, setLookupName] = useState("");
  const [studentOptions, setStudentOptions] = useState<StudentLite[]>([]);
  const [student, setStudent] = useState<StudentLite | null>(null);
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [summary, setSummary] = useState<{ present: number; absent: number; late: number; excused: number; rate: number } | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (fClass !== "all") params.set("class", fClass);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/attendance/sessions?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to load history");
      setSessions(json.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, [fClass, from, to]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  // student search — debounced
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!lookupName.trim()) { setStudentOptions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: lookupName.trim() });
        if (fClass !== "all") params.set("class", fClass);
        const res = await fetch(`/api/students?${params.toString()}`);
        const list = await res.json();
        setStudentOptions((Array.isArray(list) ? list : []).slice(0, 8));
      } catch {
        /* ignore */
      }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [lookupName, fClass]);

  const loadStudentHistory = useCallback(async (s: StudentLite) => {
    setStudent(s);
    setLookupLoading(true);
    try {
      const params = new URLSearchParams({ studentId: s.id });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/attendance/records?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to load records");
      setRecords(json.data.records);
      setSummary(json.data.summary);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load records");
    } finally {
      setLookupLoading(false);
    }
  }, [from, to]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Class</Label>
          <Select value={fClass} onValueChange={setFClass}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </div>
        <Button variant="outline" size="sm" onClick={loadSessions}><Search className="size-4" /> Apply</Button>
      </div>

      {/* Student lookup */}
      <Card className="border shadow-sm">
        <CardContent className="space-y-3 p-5">
          <p className="text-sm font-semibold">Student attendance history</p>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={student ? student.fullname : lookupName}
              onChange={(e) => { setStudent(null); setLookupName(e.target.value); }}
              placeholder="Type a student's name..."
              className="pl-8"
            />
            {!student && studentOptions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border bg-background shadow-md">
                {studentOptions.map((s) => (
                  <button
                    key={s.id}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => { setStudent(s); setStudentOptions([]); loadStudentHistory(s); }}
                  >
                    <span>{s.fullname}</span>
                    <span className="text-xs text-muted-foreground">{s.regNo} · {s.class}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {lookupLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading records...
            </div>
          ) : student && summary ? (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {[
                  { label: "Present", value: summary.present, cls: "text-emerald-600" },
                  { label: "Absent", value: summary.absent, cls: "text-red-600" },
                  { label: "Late", value: summary.late, cls: "text-amber-600" },
                  { label: "Excused", value: summary.excused, cls: "text-sky-600" },
                  { label: "Rate", value: `${summary.rate}%`, cls: summary.rate >= 75 ? "text-emerald-600" : "text-red-600" },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border p-3 text-center">
                    <p className={`text-xl font-bold ${s.cls}`}>{s.value}</p>
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="max-h-64 space-y-1.5 overflow-y-auto">
                {records.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">No attendance records found for this student.</p>
                ) : (
                  records.map((r) => {
                    const meta = STATUS_META[r.status];
                    return (
                      <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm">
                            {r.session.subject || "Daily register"}
                            {r.session.period ? ` · Period ${r.session.period}` : ""} — {r.session.class}
                          </p>
                          <p className="text-xs text-muted-foreground">{fmtDate(r.session.date)}</p>
                        </div>
                        <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* Session history */}
      <Card className="border shadow-sm">
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <History className="size-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Registers</p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading registers...
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-14 text-center">
              <CalendarDays className="size-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">No registers found</p>
              <p className="text-xs text-muted-foreground">Adjust the filters or take attendance first.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="hidden md:table-cell">Subject / Period</TableHead>
                    <TableHead className="text-center">Marked</TableHead>
                    <TableHead className="text-center">P / A / L / E</TableHead>
                    <TableHead className="hidden sm:table-cell">Mode</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm">{fmtDate(s.date)}</TableCell>
                      <TableCell className="text-sm font-medium">{s.class}</TableCell>
                      <TableCell className="hidden text-sm md:table-cell">
                        {s.subject || "Daily"}{s.period ? ` · P${s.period}` : ""}
                      </TableCell>
                      <TableCell className="text-center text-sm">{s.recordCount}</TableCell>
                      <TableCell className="text-center text-xs">
                        <span className="font-semibold text-emerald-600">{s.present}</span> /{" "}
                        <span className="font-semibold text-red-600">{s.absent}</span> /{" "}
                        <span className="font-semibold text-amber-600">{s.late}</span> /{" "}
                        <span className="font-semibold text-sky-600">{s.excused}</span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {s.mode === "QR_TEACHER" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><QrCode className="size-3.5" /> QR</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><PencilLine className="size-3.5" /> Manual</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={s.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-600"}>
                          {s.status === "ACTIVE" ? "Active" : "Closed"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}