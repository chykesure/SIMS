// src/components/attendance/attendance-register.tsx
// Take Attendance — manual class register (daily or per-period)

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Lock, LockOpen, CheckCheck, Search, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { STATUS_META, todayStr } from "@/components/attendance/attendance-view";

type Status = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

interface RosterRow {
  studentId: string;
  regNo: string;
  fullname: string;
  imageUrl: string;
  status: Status | null;
  markedAt: string | null;
}

interface SessionInfo {
  id: string;
  class: string;
  subject: string;
  period: string;
  date: string;
  status: "ACTIVE" | "CLOSED";
}

const ALL: Status[] = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];

export function RegisterTab({ classes, onSaved }: { classes: string[]; onSaved: () => void }) {
  const [klass, setKlass] = useState("");
  const [subject, setSubject] = useState("");
  const [period, setPeriod] = useState("");
  const [date, setDate] = useState(todayStr());
  const [session, setSession] = useState<SessionInfo | null>(null);

  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  // subject list fetched from the Subjects module when this tab opens
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSubjectsLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/subjects");
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Failed to load subjects");
        const rows: { name: string }[] = Array.isArray(json) ? json : json.success ? json.data : [];
        const names = Array.from(
          new Set(rows.map((s) => s.name).filter(Boolean))
        ).sort((a, b) => a.localeCompare(b));
        if (!cancelled) setSubjects(names);
      } catch {
        // non-fatal — the teacher can still take a daily register without a subject
      } finally {
        if (!cancelled) setSubjectsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const loadRoster = useCallback(async (sessionId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/sessions/${sessionId}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to load register");
      setRoster(json.data.roster);
      const saved: Record<string, Status> = {};
      for (const r of json.data.roster) {
        if (r.status) saved[r.studentId] = r.status;
      }
      setMarks(saved);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load register");
    } finally {
      setLoading(false);
    }
  }, []);

  const startSession = async () => {
    if (!klass) { toast.error("Select a class"); return; }
    try {
      const res = await fetch("/api/attendance/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class: klass, subject, period, date, mode: "MANUAL" }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to start");
      setSession(json.data);
      toast.success(json.message);
      await loadRoster(json.data.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start");
    }
  };

  const setAll = (status: Status) => {
    const next: Record<string, Status> = {};
    for (const r of roster) next[r.studentId] = status;
    setMarks(next);
  };

  const save = async (closeAfter?: boolean) => {
    if (!session) return;
    const payload = roster.map((r) => ({ studentId: r.studentId, status: marks[r.studentId] || "ABSENT" }));
    setSaving(true);
    try {
      const res = await fetch("/api/attendance/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, marks: payload }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to save");
      toast.success(json.message);

      if (closeAfter) {
        const res2 = await fetch(`/api/attendance/sessions/${session.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "CLOSED" }),
        });
        const json2 = await res2.json();
        if (res2.ok && json2.success) {
          setSession({ ...session, status: "CLOSED" });
          toast.success("Register closed");
        }
      }
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const filtered = roster.filter(
    (r) => r.fullname.toLowerCase().includes(search.toLowerCase()) || r.regNo.toLowerCase().includes(search.toLowerCase())
  );
  const markedCount = Object.keys(marks).length;
  const presentCount = Object.values(marks).filter((v) => v === "PRESENT").length;

  // ---------- setup view ----------
  if (!session) {
    return (
      <Card className="border shadow-sm">
        <CardContent className="mx-auto max-w-lg space-y-4 p-6">
          <div className="text-center">
            <h3 className="font-semibold">Start a register</h3>
            <p className="text-sm text-muted-foreground">
              Pick a subject for a period register, or leave it on &ldquo;Daily register&rdquo;.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Class *</Label>
              <Select value={klass || undefined} onValueChange={setKlass}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{classes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Subject (optional)</Label>
              <Select
                value={subject || "__none__"}
                onValueChange={(v) => setSubject(v === "__none__" ? "" : v)}
                disabled={subjectsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={subjectsLoading ? "Loading subjects..." : "Daily register (no subject)"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Daily register (no subject)</SelectItem>
                  {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              {!subjectsLoading && subjects.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No subjects found — add subjects in the Subjects module first.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Period (optional)</Label>
              <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="e.g. 2" />
            </div>
          </div>
          <Button className="w-full" onClick={startSession}>
            <CheckCheck className="size-4" /> Open Register
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ---------- register view ----------
  return (
    <div className="space-y-4">
      <Card className="border shadow-sm">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-semibold">
              {session.class} — {session.subject || "Daily register"}{session.period ? ` · Period ${session.period}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(`${session.date}T00:00:00`).toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              {" · "}{presentCount}/{roster.length} present
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={session.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-600"}>
              {session.status === "ACTIVE" ? "Active" : "Closed"}
            </Badge>
            {session.status === "ACTIVE" ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setAll("PRESENT")}><CheckCheck className="size-4" /> All present</Button>
                <Button size="sm" onClick={() => save(false)} disabled={saving || markedCount === 0}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save
                </Button>
                <Button variant="secondary" size="sm" onClick={() => save(true)} disabled={saving}>
                  <Lock className="size-4" /> Save &amp; close
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/attendance/sessions/${session.id}`, {
                      method: "PUT", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status: "ACTIVE" }),
                    });
                    const json = await res.json();
                    if (!res.ok || !json.success) throw new Error(json.message);
                    setSession({ ...session, status: "ACTIVE" });
                    toast.success("Register reopened");
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Failed to reopen");
                  }
                }}
              >
                <LockOpen className="size-4" /> Reopen
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student..." className="pl-8" />
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading class list...
            </div>
          ) : roster.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Users className="size-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">No students in {session.class}</p>
              <p className="text-xs text-muted-foreground">Add students to this class first.</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((r) => {
                const current = marks[r.studentId] || null;
                return (
                  <div key={r.studentId} className="flex flex-wrap items-center gap-3 px-4 py-2.5 sm:flex-nowrap">
                    <Avatar className="size-9 shrink-0">
                      <AvatarImage src={r.imageUrl || undefined} alt={r.fullname} />
                      <AvatarFallback className="text-xs">{r.fullname.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.fullname}</p>
                      <p className="text-xs text-muted-foreground">{r.regNo}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {ALL.map((s) => {
                        const meta = STATUS_META[s];
                        const active = current === s;
                        return (
                          <button
                            key={s}
                            disabled={session.status !== "ACTIVE"}
                            onClick={() => setMarks((m) => ({ ...m, [r.studentId]: s }))}
                            className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                              active ? meta.className : "bg-white text-muted-foreground hover:bg-muted"
                            }`}
                            title={meta.label}
                          >
                            {meta.short}
                          </button>
                        );
                      })}
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