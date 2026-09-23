// src/components/cbt/cbt-exams-tab.tsx
// Exams — list, create/edit (details + question picker + settings), publish/unpublish, delete

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Rocket, Ban, Loader2, FileText, BarChart3, Eye, EyeOff, ChevronLeft, ChevronRight, Check,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { examStatusMeta, formatDateTime, type SessionOption } from "@/components/cbt/cbt-view";
import type { CbtQuestionRow } from "@/components/cbt/cbt-questions-tab";

export interface CbtExamRow {
  id: string;
  title: string;
  description: string;
  subject: string;
  class: string;
  session: string;
  term: string;
  durationMinutes: number;
  questionCount: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  attemptsAllowed: number;
  startsAt: string;
  endsAt: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  createdByName: string;
  _count?: { questions: number; attempts: number };
}

const TERM_OPTIONS = ["First Term", "Second Term", "Third Term"];

interface ExamForm {
  title: string;
  description: string;
  subject: string;
  class: string;
  session: string;
  term: string;
  durationMinutes: number;
  questionCount: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  attemptsAllowed: number;
  startsAt: string; // datetime-local value
  endsAt: string;
  questionIds: string[];
}

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultForm(sessions: SessionOption[]): ExamForm {
  const activeLabel = sessions.find((s) => s.label)?.label || "";
  const now = new Date();
  const start = new Date(now.getTime() + 60 * 60 * 1000);
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    title: "", description: "", subject: "", class: "",
    session: activeLabel, term: TERM_OPTIONS[0],
    durationMinutes: 45, questionCount: 0,
    shuffleQuestions: true, shuffleOptions: false, attemptsAllowed: 1,
    startsAt: toLocalInputValue(start), endsAt: toLocalInputValue(end),
    questionIds: [],
  };
}

export function ExamsTab({
  subjects, classes, sessions, onDeleted, onViewSubmissions,
}: {
  subjects: string[];
  classes: string[];
  sessions: SessionOption[];
  onDeleted: () => void;
  onViewSubmissions: (examId: string) => void;
}) {
  const [exams, setExams] = useState<CbtExamRow[]>([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [fSession, setFSession] = useState("all");
  const [fTerm, setFTerm] = useState("all");
  const [fClass, setFClass] = useState("all");
  const [fStatus, setFStatus] = useState("all");

  // create/edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExamForm>(() => defaultForm(sessions));
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);

  // question picker (step 2)
  const [bankQuestions, setBankQuestions] = useState<CbtQuestionRow[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSubject, setBankSubject] = useState("all");

  const [deleteTarget, setDeleteTarget] = useState<CbtExamRow | null>(null);

  const loadExams = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fSession !== "all") params.set("session", fSession);
      if (fTerm !== "all") params.set("term", fTerm);
      if (fClass !== "all") params.set("class", fClass);
      if (fStatus !== "all") params.set("status", fStatus);
      const res = await fetch(`/api/cbt/exams?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to load exams");
      setExams(json.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load exams");
    } finally {
      setLoading(false);
    }
  }, [fSession, fTerm, fClass, fStatus]);

  useEffect(() => { loadExams(); }, [loadExams]);

  const openCreate = () => {
    setForm(defaultForm(sessions));
    setEditingId(null);
    setStep(1);
    setDialogOpen(true);
  };

  const openEdit = async (exam: CbtExamRow) => {
    try {
      const res = await fetch(`/api/cbt/exams/${exam.id}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to load exam");
      const d = json.data;
      setForm({
        title: d.title,
        description: d.description || "",
        subject: d.subject,
        class: d.class,
        session: d.session,
        term: d.term,
        durationMinutes: d.durationMinutes,
        questionCount: d.questionCount,
        shuffleQuestions: d.shuffleQuestions,
        shuffleOptions: d.shuffleOptions,
        attemptsAllowed: d.attemptsAllowed,
        startsAt: toLocalInputValue(new Date(d.startsAt)),
        endsAt: toLocalInputValue(new Date(d.endsAt)),
        questionIds: d.questions.map((q: { question: { id: string } }) => q.question.id),
      });
      setEditingId(d.id);
      setStep(1);
      setDialogOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load exam");
    }
  };

  const loadBank = useCallback(async (subject: string) => {
    setBankLoading(true);
    try {
      const params = new URLSearchParams();
      if (subject !== "all") params.set("subject", subject);
      const res = await fetch(`/api/cbt/questions?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to load question bank");
      setBankQuestions(json.data.questions);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load question bank");
    } finally {
      setBankLoading(false);
    }
  }, []);

  const goStep2 = async () => {
    if (!form.title.trim()) { toast.error("Enter the exam title"); return; }
    if (!form.subject) { toast.error("Select the subject"); return; }
    if (!form.class) { toast.error("Select the class"); return; }
    if (!form.session) { toast.error("Select the session"); return; }
    setStep(2);
    await loadBank(form.subject);
  };

  const toggleQuestion = (id: string) => {
    setForm((f) => ({
      ...f,
      questionIds: f.questionIds.includes(id)
        ? f.questionIds.filter((q) => q !== id)
        : [...f.questionIds, id],
    }));
  };

  const selectedPool = useMemo(() => form.questionIds.length, [form.questionIds]);

  const handleSubmit = async (publish: boolean) => {
    if (selectedPool < 1) { toast.error("Select at least one question"); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        status: publish ? "PUBLISHED" : "DRAFT",
      };
      const res = editingId
        ? await fetch(`/api/cbt/exams/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await fetch("/api/cbt/exams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to save exam");
      toast.success(json.message || "Saved");
      setDialogOpen(false);
      loadExams();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save exam");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (exam: CbtExamRow) => {
    const next = exam.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      const res = await fetch(`/api/cbt/exams/${exam.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to update");
      toast.success(next === "PUBLISHED" ? "Exam published — students can now see it" : "Exam unpublished");
      loadExams();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    }
  };

  const closeExam = async (exam: CbtExamRow) => {
    try {
      const res = await fetch(`/api/cbt/exams/${exam.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED" }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to close exam");
      toast.success("Exam closed");
      loadExams();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to close exam");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/cbt/exams/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to delete");
      toast.success("Exam deleted");
      setDeleteTarget(null);
      loadExams();
      onDeleted();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    }
  };

  const canEdit = (exam: CbtExamRow) => (exam._count?.attempts ?? 0) === 0;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={fSession} onValueChange={setFSession}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Session" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sessions</SelectItem>
            {sessions.map((s) => <SelectItem key={s.id} value={s.label}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fTerm} onValueChange={setFTerm}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Term" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All terms</SelectItem>
            {TERM_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fClass} onValueChange={setFClass}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Class" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            {classes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fStatus} onValueChange={setFStatus}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Button className="ml-auto" onClick={openCreate}>
          <Plus className="size-4" /> Create Exam
        </Button>
      </div>

      {/* Table */}
      <Card className="border shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading exams...
            </div>
          ) : exams.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <FileText className="size-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">No exams found</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Create an exam, pick questions from the bank, set the timer and publish it to the class.
              </p>
              <Button size="sm" className="mt-2" onClick={openCreate}><Plus className="size-4" /> Create Exam</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exam</TableHead>
                    <TableHead className="hidden lg:table-cell">Session / Term</TableHead>
                    <TableHead className="text-center">Questions</TableHead>
                    <TableHead className="hidden md:table-cell">Window</TableHead>
                    <TableHead className="text-center">Attempts</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-28 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map((exam) => {
                    const meta = examStatusMeta(exam.status);
                    return (
                      <TableRow key={exam.id}>
                        <TableCell>
                          <p className="max-w-56 truncate text-sm font-medium">{exam.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {exam.subject} · {exam.class} · {exam.durationMinutes}min
                            {exam.shuffleQuestions && " · shuffled"}
                          </p>
                        </TableCell>
                        <TableCell className="hidden text-sm lg:table-cell">
                          <p>{exam.session}</p>
                          <p className="text-xs text-muted-foreground">{exam.term}</p>
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {exam.questionCount > 0 ? `${exam.questionCount} of ${exam._count?.questions ?? 0}` : exam._count?.questions ?? 0}
                        </TableCell>
                        <TableCell className="hidden text-xs md:table-cell">
                          <p>{formatDateTime(exam.startsAt)}</p>
                          <p className="text-muted-foreground">→ {formatDateTime(exam.endsAt)}</p>
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {exam._count?.attempts ?? 0}
                          <span className="text-xs text-muted-foreground"> / {exam.attemptsAllowed}×per student</span>
                        </TableCell>
                        <TableCell><Badge variant="outline" className={meta.className}>{meta.label}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {(exam._count?.attempts ?? 0) > 0 && (
                              <Button variant="ghost" size="icon" className="size-8" title="Submissions" onClick={() => onViewSubmissions(exam.id)}>
                                <BarChart3 className="size-3.5" />
                              </Button>
                            )}
                            {exam.status !== "CLOSED" && (
                              <Button
                                variant="ghost" size="icon" className="size-8"
                                title={exam.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                                onClick={() => toggleStatus(exam)}
                              >
                                {exam.status === "PUBLISHED" ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                              </Button>
                            )}
                            {exam.status === "PUBLISHED" && (
                              <Button variant="ghost" size="icon" className="size-8" title="Close exam" onClick={() => closeExam(exam)}>
                                <Ban className="size-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost" size="icon" className="size-8" title={canEdit(exam) ? "Edit" : "Has submissions — locked"}
                              disabled={!canEdit(exam)} onClick={() => openEdit(exam)}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="size-8 text-red-600 hover:text-red-700" title="Delete" onClick={() => setDeleteTarget(exam)}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open && !saving) setDialogOpen(false); }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          {step === 1 ? (
            <>
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Exam" : "Create Exam"} — Details</DialogTitle>
                <DialogDescription>Step 1 of 2 — exam details, timing &amp; rules.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Exam title *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Mathematics — Mid-Term Test"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Description (optional)</Label>
                  <Textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Covers weeks 1–6: algebra, geometry basics..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Subject *</Label>
                    <Select value={form.subject || undefined} onValueChange={(v) => setForm((f) => ({ ...f, subject: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                      <SelectContent>{subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Class *</Label>
                    <Select value={form.class || undefined} onValueChange={(v) => setForm((f) => ({ ...f, class: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                      <SelectContent>{classes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Session *</Label>
                    <Select value={form.session || undefined} onValueChange={(v) => setForm((f) => ({ ...f, session: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select session" /></SelectTrigger>
                      <SelectContent>{sessions.map((s) => <SelectItem key={s.id} value={s.label}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Term *</Label>
                    <Select value={form.term} onValueChange={(v) => setForm((f) => ({ ...f, term: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TERM_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Duration (min) *</Label>
                    <Input
                      type="number" min={1} max={300} value={form.durationMinutes}
                      onChange={(e) => setForm((f) => ({ ...f, durationMinutes: Math.max(1, Number(e.target.value) || 1) }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Starts *</Label>
                    <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Ends *</Label>
                    <Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Questions per student</Label>
                    <Input
                      type="number" min={0} value={form.questionCount}
                      onChange={(e) => setForm((f) => ({ ...f, questionCount: Math.max(0, Number(e.target.value) || 0) }))}
                    />
                    <p className="text-[11px] text-muted-foreground">0 = all selected</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Attempts allowed</Label>
                    <Input
                      type="number" min={1} max={10} value={form.attemptsAllowed}
                      onChange={(e) => setForm((f) => ({ ...f, attemptsAllowed: Math.max(1, Math.min(10, Number(e.target.value) || 1)) }))}
                    />
                  </div>
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs">Shuffle questions</Label>
                      <Switch checked={form.shuffleQuestions} onCheckedChange={(v) => setForm((f) => ({ ...f, shuffleQuestions: v }))} />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs">Shuffle options</Label>
                      <Switch checked={form.shuffleOptions} onCheckedChange={(v) => setForm((f) => ({ ...f, shuffleOptions: v }))} />
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
                <Button onClick={goStep2}>Next: Pick questions <ChevronRight className="size-4" /></Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Pick Questions</DialogTitle>
                <DialogDescription>
                  Step 2 of 2 — {selectedPool} selected from the {form.subject} bank.
                  {form.questionCount > 0 && selectedPool >= form.questionCount
                    ? ` Each student receives ${form.questionCount}.`
                    : " Each student receives all selected questions."}
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-center gap-2">
                <Select value={bankSubject} onValueChange={(v) => { setBankSubject(v); loadBank(v); }}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Filter bank" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All subjects</SelectItem>
                    {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                {selectedPool > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setForm((f) => ({ ...f, questionIds: [] }))}>Clear selection</Button>
                )}
              </div>

              <ScrollArea className="h-72 rounded-md border">
                {bankLoading ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Loading bank...
                  </div>
                ) : bankQuestions.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-12 text-center">
                    <FileText className="size-8 text-muted-foreground/40" />
                    <p className="text-sm font-medium">No questions in the bank for this filter</p>
                    <p className="text-xs text-muted-foreground">Add questions in the Question Bank tab first.</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {bankQuestions.map((q) => {
                      const checked = form.questionIds.includes(q.id);
                      return (
                        <label key={q.id} className="flex cursor-pointer items-start gap-3 p-3 hover:bg-muted/50">
                          <Checkbox className="mt-0.5" checked={checked} onCheckedChange={() => toggleQuestion(q.id)} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-snug">{q.text}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {q.type === "MCQ" ? "MCQ" : "True/False"} · {q.marks} mark{q.marks > 1 ? "s" : ""}
                              {q.class ? ` · ${q.class}` : " · any class"}
                            </p>
                          </div>
                          {checked && <Check className="size-4 shrink-0 text-emerald-600" />}
                        </label>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setStep(1)} disabled={saving}>
                  <ChevronLeft className="size-4" /> Back
                </Button>
                <div className="ml-auto flex gap-2">
                  <Button variant="outline" onClick={() => handleSubmit(false)} disabled={saving || selectedPool < 1}>
                    {saving && <Loader2 className="size-4 animate-spin" />} Save as Draft
                  </Button>
                  <Button onClick={() => handleSubmit(true)} disabled={saving || selectedPool < 1}>
                    <Rocket className="size-4" /> Publish Now
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this exam?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; and all its submissions will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>Delete exam</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}