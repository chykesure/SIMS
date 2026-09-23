// src/components/cbt/cbt-questions-tab.tsx
// Question Bank — CRUD for MCQ / True-False questions

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, FileQuestion, Loader2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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

export interface CbtQuestionRow {
  id: string;
  subject: string;
  class: string;
  type: "MCQ" | "TRUE_FALSE";
  text: string;
  options: string[];
  correctIndex: number;
  marks: number;
  explanation: string;
}

interface FormState {
  id?: string;
  subject: string;
  class: string;
  type: "MCQ" | "TRUE_FALSE";
  text: string;
  options: string[];
  correctIndex: number;
  marks: number;
  explanation: string;
}

function emptyForm(): FormState {
  return { subject: "", class: "", type: "MCQ", text: "", options: ["", "", "", ""], correctIndex: 0, marks: 1, explanation: "" };
}

const TRUE_FALSE_OPTIONS = ["True", "False"];

export function QuestionsTab({ subjects, classes }: { subjects: string[]; classes: string[] }) {
  const [questions, setQuestions] = useState<CbtQuestionRow[]>([]);
  const [stats, setStats] = useState({ total: 0, mcqCount: 0, tfCount: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // filters
  const [fSubject, setFSubject] = useState("all");
  const [fClass, setFClass] = useState("all");
  const [fType, setFType] = useState("all");
  const [search, setSearch] = useState("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchInput, setSearchInput] = useState("");

  // form dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<CbtQuestionRow | null>(null);

  const loadQuestions = useCallback(async (opts?: { subject?: string; class?: string; type?: string; search?: string }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (opts?.subject && opts.subject !== "all") params.set("subject", opts.subject);
      if (opts?.class && opts.class !== "all") params.set("class", opts.class);
      if (opts?.type && opts.type !== "all") params.set("type", opts.type);
      if (opts?.search) params.set("search", opts.search);
      const res = await fetch(`/api/cbt/questions?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to load questions");
      setQuestions(json.data.questions);
      setStats(json.data.stats);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load questions");
    } finally {
      setLoading(false);
    }
  }, []);

  // debounced search + filter effect
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearch(searchInput);
    }, 350);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [searchInput]);

  useEffect(() => {
    loadQuestions({ subject: fSubject, class: fClass, type: fType, search });
  }, [fSubject, fClass, fType, search, loadQuestions]);

  const openCreate = () => { setForm(emptyForm()); setDialogOpen(true); };

  const openEdit = (q: CbtQuestionRow) => {
    setForm({
      id: q.id,
      subject: q.subject,
      class: q.class || "all",
      type: q.type,
      text: q.text,
      options: q.type === "TRUE_FALSE" ? [...TRUE_FALSE_OPTIONS] : [...q.options, "", "", "", ""].slice(0, Math.max(4, q.options.length)),
      correctIndex: q.correctIndex,
      marks: q.marks,
      explanation: q.explanation || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.subject) { toast.error("Select a subject"); return; }
    if (!form.text.trim()) { toast.error("Enter the question text"); return; }

    const options = form.type === "TRUE_FALSE"
      ? TRUE_FALSE_OPTIONS
      : form.options.map((o) => o.trim()).filter(Boolean);

    if (options.length < 2) { toast.error("Provide at least 2 options"); return; }
    if (form.correctIndex >= options.length) { toast.error("Select a correct option"); return; }

    setSaving(true);
    try {
      const payload = {
        subject: form.subject,
        class: form.class === "all" ? "" : form.class,
        type: form.type,
        text: form.text,
        options,
        correctIndex: form.correctIndex,
        marks: form.marks,
        explanation: form.explanation,
      };
      const res = form.id
        ? await fetch(`/api/cbt/questions/${form.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await fetch("/api/cbt/questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to save question");
      toast.success(json.message || "Saved");
      setDialogOpen(false);
      loadQuestions({ subject: fSubject, class: fClass, type: fType, search });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save question");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/cbt/questions/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to delete");
      toast.success("Question deleted");
      setDeleteTarget(null);
      loadQuestions({ subject: fSubject, class: fClass, type: fType, search });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    }
  };

  const setOption = (i: number, value: string) => {
    setForm((f) => {
      const options = [...f.options];
      options[i] = value;
      return { ...f, options };
    });
  };

  const activeFilterCount = [fSubject, fClass, fType].filter((v) => v !== "all").length;

  return (
    <div className="space-y-4">
      {/* Stats + filters row */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="gap-1 px-2.5 py-1">
          <FileQuestion className="size-3.5" /> {stats.total} total
        </Badge>
        <Badge variant="outline" className="px-2.5 py-1">{stats.mcqCount} MCQ</Badge>
        <Badge variant="outline" className="px-2.5 py-1">{stats.tfCount} True/False</Badge>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search questions..."
              className="w-52 pl-8"
            />
          </div>
          <Select value={fSubject} onValueChange={setFSubject}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Subject" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fClass} onValueChange={setFClass}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Class" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fType} onValueChange={setFType}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="MCQ">MCQ</SelectItem>
              <SelectItem value="TRUE_FALSE">True/False</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={openCreate}>
            <Plus className="size-4" /> Add Question
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="border shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading questions...
            </div>
          ) : questions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <FileQuestion className="size-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">
                {activeFilterCount > 0 || search ? "No questions match your filters" : "The question bank is empty"}
              </p>
              <p className="max-w-sm text-xs text-muted-foreground">
                {activeFilterCount > 0 || search
                  ? "Try clearing the filters or adjusting your search."
                  : "Add your first question — it becomes a reusable asset for every future exam."}
              </p>
              <Button size="sm" className="mt-2" onClick={openCreate}><Plus className="size-4" /> Add Question</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead className="hidden md:table-cell">Subject</TableHead>
                    <TableHead className="hidden md:table-cell">Class</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Marks</TableHead>
                    <TableHead className="w-20 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((q, i) => (
                    <TableRow key={q.id}>
                      <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="max-w-sm">
                        <p className="truncate text-sm font-medium">{q.text}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {q.options.map((o, oi) => (
                            <span key={oi} className={oi === q.correctIndex ? "font-semibold text-emerald-600" : ""}>
                              {String.fromCharCode(65 + oi)}. {o}{oi < q.options.length - 1 ? "  ·  " : ""}
                            </span>
                          ))}
                        </p>
                      </TableCell>
                      <TableCell className="hidden text-sm md:table-cell">{q.subject}</TableCell>
                      <TableCell className="hidden text-sm md:table-cell">{q.class || "Any"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={q.type === "MCQ" ? "bg-sky-50 text-sky-700" : "bg-violet-50 text-violet-700"}>
                          {q.type === "MCQ" ? "MCQ" : "True/False"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm">{q.marks}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(q)} title="Edit">
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8 text-red-600 hover:text-red-700" onClick={() => setDeleteTarget(q)} title="Delete">
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Question" : "Add Question"}</DialogTitle>
            <DialogDescription>
              Questions live in a reusable bank — tag them by subject &amp; class, then pick them in any exam.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Subject *</Label>
                <Select value={form.subject || undefined} onValueChange={(v) => setForm((f) => ({ ...f, subject: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Class</Label>
                <Select value={form.class || "all"} onValueChange={(v) => setForm((f) => ({ ...f, class: v }))}>
                  <SelectTrigger><SelectValue placeholder="Any class" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any class</SelectItem>
                    {classes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Question type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v as "MCQ" | "TRUE_FALSE", options: v === "TRUE_FALSE" ? [...TRUE_FALSE_OPTIONS] : ["", "", "", ""], correctIndex: 0 }))}
                  disabled={!!form.id}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MCQ">Multiple Choice</SelectItem>
                    <SelectItem value="TRUE_FALSE">True / False</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Marks</Label>
                <Input
                  type="number" min={1} max={100} value={form.marks}
                  onChange={(e) => setForm((f) => ({ ...f, marks: Math.max(1, Number(e.target.value) || 1) }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Question text *</Label>
              <Textarea
                rows={3}
                value={form.text}
                onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                placeholder="What is the value of x if 2x + 6 = 14?"
              />
            </div>

            <div className="space-y-2">
              <Label>{form.type === "TRUE_FALSE" ? "Options (fixed)" : "Options *"}</Label>
              {form.type === "TRUE_FALSE" ? (
                <div className="grid grid-cols-2 gap-2">
                  {TRUE_FALSE_OPTIONS.map((opt, i) => (
                    <div key={opt} className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                      <Checkbox checked={form.correctIndex === i} onCheckedChange={() => setForm((f) => ({ ...f, correctIndex: i }))} />
                      {opt}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {form.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Checkbox
                        checked={form.correctIndex === i}
                        onCheckedChange={() => setForm((f) => ({ ...f, correctIndex: i }))}
                        title="Mark as correct"
                      />
                      <Input
                        value={opt}
                        onChange={(e) => setOption(i, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      />
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">Tick the checkbox of the correct option.</p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Explanation (optional)</Label>
              <Textarea
                rows={2}
                value={form.explanation}
                onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
                placeholder="Shown to students after submission"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {form.id ? "Save changes" : "Add question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this question?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.text.slice(0, 120)}...
              <br /><br />
              Questions linked to an exam cannot be deleted — remove them from the exam first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}