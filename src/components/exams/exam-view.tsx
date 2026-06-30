"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/store/index";
import {
  GraduationCap,
  BookOpen,
  Calculator,
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Save,
  Loader2,
  ChevronRight,
  Settings,
  MessageSquare,
  User,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Session {
  id: string;
  sessionOne: string;
  sessionTwo: string;
  active: string;
}

interface ClassItem {
  id: string;
  title: string;
}

interface Student {
  id: string;
  regNo: string;
  fullname: string;
  class: string;
}

interface Subject {
  id: string;
  name: string;
}

interface ExamScore {
  id: string;
  session: string;
  class: string;
  term: string;
  fullname: string;
  subject: string;
  firstCa: number;
  secondCa: number;
  thirdCa: number;
  exam: number;
  total: number;
}

interface SchoolSettings {
  id: string;
  caCount: number;
  ca1Max: number;
  ca2Max: number;
  ca3Max: number;
  ca1Label: string;
  ca2Label: string;
  ca3Label: string;
  examMax: number;
  examLabel: string;
  totalMax: number;
}

/* ------------------------------------------------------------------ */
/*  Constants & Defaults                                                */
/* ------------------------------------------------------------------ */

const TERMS = ["First Term", "Second Term", "Third Term"];

const DEFAULT_SETTINGS: SchoolSettings = {
  id: "",
  caCount: 2,
  ca1Max: 15,
  ca2Max: 15,
  ca3Max: 10,
  ca1Label: "1st CA",
  ca2Label: "2nd CA",
  ca3Label: "3rd CA",
  examMax: 60,
  examLabel: "Exam",
  totalMax: 100,
};

const SCHOOL_CARDS = [
  {
    key: "JSS",
    title: "Junior Secondary School",
    subtitle: "JSS1 – JSS3",
    gradient: "from-emerald-600 to-teal-700",
    icon: GraduationCap,
  },
  {
    key: "SSS",
    title: "Senior Secondary School",
    subtitle: "SSS1 – SSS3",
    gradient: "from-amber-600 to-orange-700",
    icon: BookOpen,
  },
  {
    key: "Teacher",
    title: "Teacher's Score Computing",
    subtitle: "Compute & manage scores",
    gradient: "from-rose-600 to-pink-700",
    icon: Calculator,
  },
] as const;

/* ------------------------------------------------------------------ */
/*  Helper                                                             */
/* ------------------------------------------------------------------ */

function sessionLabel(s: Session) {
  return `${s.sessionOne}/${s.sessionTwo}`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ExamView() {
  const navigate = useAppStore((s) => s.navigate);

  /* ---- school settings ---- */
  const [settings, setSettings] = useState<SchoolSettings>({ ...DEFAULT_SETTINGS });
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  /* ---- settings dialog ---- */
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState<SchoolSettings>({ ...DEFAULT_SETTINGS });
  const [settingsSaving, setSettingsSaving] = useState(false);

  /* ---- master data ---- */
  const [sessions, setSessions] = useState<Session[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  /* ---- selection state ---- */
  const [view, setView] = useState<"cards" | "entry">("cards");
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedClass, setSelectedClass] = useState("");

  /* ---- modal ---- */
  const [modalOpen, setModalOpen] = useState(false);

  /* ---- scores table ---- */
  const [examScores, setExamScores] = useState<ExamScore[]>([]);
  const [scoresLoading, setScoresLoading] = useState(false);

  /* ---- form ---- */
  const [formStudent, setFormStudent] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formFirstCa, setFormFirstCa] = useState("");
  const [formSecondCa, setFormSecondCa] = useState("");
  const [formThirdCa, setFormThirdCa] = useState("");
  const [formExam, setFormExam] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  /* ---- edit mode ---- */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFirstCa, setEditFirstCa] = useState("");
  const [editSecondCa, setEditSecondCa] = useState("");
  const [editThirdCa, setEditThirdCa] = useState("");
  const [editExam, setEditExam] = useState("");

  /* ---- student filter ---- */
  const [showAllStudents, setShowAllStudents] = useState(false);

  /* ---- delete confirmation ---- */
  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* ---- loading master data ---- */
  const [masterLoading, setMasterLoading] = useState(false);

  /* ---- report card comments ---- */
  const [commentTeacher, setCommentTeacher] = useState("");
  const [commentPrincipal, setCommentPrincipal] = useState("");
  const [commentDaysOpened, setCommentDaysOpened] = useState("");
  const [commentResumption, setCommentResumption] = useState("");
  const [commentNextTerm, setCommentNextTerm] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentSaving, setCommentSaving] = useState(false);

  /* ---- remarks dropdown options ---- */
  const [teacherRemarkOptions, setTeacherRemarkOptions] = useState<string[]>([]);
  const [principalRemarkOptions, setPrincipalRemarkOptions] = useState<string[]>([]);

  /* ================================================================ */
  /*  Fetch school settings                                             */
  /* ================================================================ */

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings?type=school-settings");
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) {
          setSettings(data);
        }
      }
    } catch {
      // Use defaults if fetch fails
    } finally {
      setSettingsLoaded(true);
    }
  }, []);

  /* ================================================================ */
  /*  Fetch helpers                                                    */
  /* ================================================================ */

  const fetchMasterData = useCallback(async () => {
    setMasterLoading(true);
    try {
      const [sessRes, classRes, subjRes] = await Promise.all([
        fetch("/api/sessions"),
        fetch("/api/classes"),
        fetch("/api/subjects"),
      ]);

      const sessData: Session[] = sessRes.ok ? await sessRes.json() : [];
      const classData: ClassItem[] = classRes.ok ? await classRes.json() : [];
      const subjData: Subject[] = subjRes.ok ? await subjRes.json() : [];

      setSessions(sessData);
      setClasses(classData);
      setSubjects(subjData);

      // Auto-select active session
      const active = sessData.find((s) => s.active === "Yes");
      if (active) setSelectedSession(`${active.sessionOne}/${active.sessionTwo}`);
    } catch {
      toast.error("Failed to load reference data");
    } finally {
      setMasterLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchMasterData();
  }, [fetchSettings, fetchMasterData]);

  /* ---- fetch students by class ---- */
  useEffect(() => {
    if (!selectedClass) {
      setStudents([]);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/students?class=${encodeURIComponent(selectedClass)}`);
        if (res.ok) setStudents(await res.json());
      } catch {
        /* ignore */
      }
    })();
  }, [selectedClass]);

  /* ---- fetch exam scores ---- */
  const fetchScores = useCallback(async () => {
    if (!selectedSession || !selectedClass || !selectedTerm) return;
    setScoresLoading(true);
    try {
      const params = new URLSearchParams({
        session: selectedSession,
        class: selectedClass,
        term: selectedTerm,
      });
      const res = await fetch(`/api/exams?${params}`);
      if (res.ok) {
        const data: ExamScore[] = await res.json();
        setExamScores(data);
      }
    } catch {
      toast.error("Failed to load exam scores");
    } finally {
      setScoresLoading(false);
    }
  }, [selectedSession, selectedClass, selectedTerm]);

  useEffect(() => {
    if (view === "entry") fetchScores();
  }, [view, fetchScores]);

  /* ================================================================ */
  /*  Load report card comments when session/class/term change          */
  /* ================================================================ */

  useEffect(() => {
    if (!selectedSession || !selectedClass || !selectedTerm) return;
    setCommentLoading(true);
    (async () => {
      try {
        const [trRes, prRes, rsRes] = await Promise.all([
          fetch("/api/settings?type=teacher-remarks"),
          fetch("/api/settings?type=principal-remarks"),
          fetch("/api/settings?type=resumptions"),
        ]);
        const studentName = (formStudent || "").toLowerCase();
        // Get all remarks for the dropdown (deduplicated)
        if (trRes.ok) {
          const remarks = await trRes.json() as { remark?: string; session?: string; term?: string; studentName?: string }[];
          const allRemarks = [...new Set(remarks.map((r) => r.remark).filter(Boolean) as string[])];
          setTeacherRemarkOptions(allRemarks);
          const matched = remarks.find((r) =>
            r.session === selectedSession && r.term === selectedTerm &&
            (!r.studentName || (r.studentName || "").toLowerCase() === studentName)
          );
          setCommentTeacher(matched?.remark || "");
        }
        if (prRes.ok) {
          const remarks = await prRes.json() as { remark?: string; session?: string; term?: string; studentName?: string }[];
          const allRemarks = [...new Set(remarks.map((r) => r.remark).filter(Boolean) as string[])];
          setPrincipalRemarkOptions(allRemarks);
          const matched = remarks.find((r) =>
            r.session === selectedSession && r.term === selectedTerm &&
            (!r.studentName || (r.studentName || "").toLowerCase() === studentName)
          );
          setCommentPrincipal(matched?.remark || "");
        }
        if (rsRes.ok) {
          const resumptions = await rsRes.json() as { session?: string; term?: string; openTerm?: string; nextTerm?: string; nextTermLabel?: string; noSchoolOpen?: number }[];
          const matched = resumptions.find((r) => r.session === selectedSession && r.term === selectedTerm);
          if (matched) {
            setCommentDaysOpened(String(matched.noSchoolOpen || ""));
            setCommentResumption(matched.openTerm || "");
            setCommentNextTerm(matched.nextTermLabel || "");
          } else {
            setCommentDaysOpened("");
            setCommentResumption("");
            setCommentNextTerm("");
          }
        }
      } catch {
        /* ignore */
      } finally {
        setCommentLoading(false);
      }
    })();
  }, [selectedSession, selectedClass, selectedTerm, formStudent]);

  /* ================================================================ */
  /*  Save report card comments                                         */
  /* ================================================================ */

  async function saveComments() {
    if (!selectedSession || !selectedTerm) return;
    setCommentSaving(true);
    try {
      const nextTerm = selectedTerm === "First Term" ? "Second Term" : selectedTerm === "Second Term" ? "Third Term" : "";
      const studentName = formStudent || "";
      await Promise.all([
        fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "teacher-remark", session: selectedSession, term: selectedTerm, studentName, remark: commentTeacher }) }),
        fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "principal-remark", session: selectedSession, term: selectedTerm, studentName, remark: commentPrincipal }) }),
        fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "resumption", session: selectedSession, term: selectedTerm, openTerm: commentResumption, nextTerm, nextTermLabel: commentNextTerm, noSchoolOpen: Number(commentDaysOpened) || 0 }) }),
      ]);
      toast.success("Report card comments saved");
    } catch {
      toast.error("Failed to save comments");
    } finally {
      setCommentSaving(false);
    }
  }

  /* ---- reset student filter when form student changes ---- */
  useEffect(() => {
    setShowAllStudents(false);
  }, [formStudent]);

  /* ================================================================ */
  /*  Derived values                                                    */
  /* ================================================================ */

  const caCount = settings.caCount;
  const showThirdCa = caCount === 3;
  const hideStudentColumn = !showAllStudents && !!formStudent;

  const filteredScores = hideStudentColumn
    ? examScores.filter((s) => s.fullname === formStudent)
    : examScores;

  const autoTotal =
    (Number(formFirstCa) || 0) +
    (Number(formSecondCa) || 0) +
    (showThirdCa ? Number(formThirdCa) || 0 : 0) +
    (Number(formExam) || 0);

  /* ================================================================ */
  /*  Handlers                                                         */
  /* ================================================================ */

  function handleTermClick(school: string, term: string) {
    setSelectedSchool(school);
    setSelectedTerm(term);
    setModalOpen(true);
  }

  function handleModalConfirm() {
    if (!selectedSession || !selectedClass) {
      toast.error("Please select a session and class");
      return;
    }
    setModalOpen(false);
    setView("entry");
    resetForm();
  }

  function resetForm() {
    setFormStudent("");
    setFormSubject("");
    setFormFirstCa("");
    setFormSecondCa("");
    setFormThirdCa("");
    setFormExam("");
    setEditingId(null);
  }

  async function handleSubmit() {
    if (!formStudent || !formSubject) {
      toast.error("Please select a student and subject");
      return;
    }
    const fca = Number(formFirstCa) || 0;
    const sca = Number(formSecondCa) || 0;
    const tca = showThirdCa ? Number(formThirdCa) || 0 : 0;
    const ex = Number(formExam) || 0;

    if (fca > settings.ca1Max || sca > settings.ca2Max || ex > settings.examMax) {
      toast.error(
        `Score limits: ${settings.ca1Label} max ${settings.ca1Max}, ${settings.ca2Label} max ${settings.ca2Max}, ${settings.examLabel} max ${settings.examMax}`
      );
      return;
    }
    if (showThirdCa && tca > settings.ca3Max) {
      toast.error(`${settings.ca3Label} cannot exceed ${settings.ca3Max}`);
      return;
    }

    /* ---- client-side duplicate check ---- */
    const duplicate = examScores.find(
      (s) => s.fullname === formStudent && s.subject === formSubject
    );
    if (duplicate) {
      toast.warning(`A score already exists for "${formStudent}" in "${formSubject}".`, {
        description: 'Edit the existing record instead.',
        action: {
          label: 'Edit existing',
          onClick: () => startEdit(duplicate),
        },
        duration: 6000,
      });
      return;
    }

    setFormSubmitting(true);
    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session: selectedSession,
          class: selectedClass,
          term: selectedTerm,
          fullname: formStudent,
          subject: formSubject,
          firstCa: fca,
          secondCa: sca,
          thirdCa: tca,
          exam: ex,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.message || "Failed to save score");
        return;
      }

      toast.success("Score saved successfully");
      resetForm();
      fetchScores();
    } catch {
      toast.error("Network error");
    } finally {
      setFormSubmitting(false);
    }
  }

  function startEdit(score: ExamScore) {
    setEditingId(score.id);
    setEditFirstCa(String(score.firstCa));
    setEditSecondCa(String(score.secondCa));
    setEditThirdCa(String(score.thirdCa));
    setEditExam(String(score.exam));
  }

  async function saveEdit() {
    if (!editingId) return;

    // VALIDATION: Check score limits before saving
    const eca1 = Number(editFirstCa) || 0;
    const eca2 = Number(editSecondCa) || 0;
    const eca3 = showThirdCa ? Number(editThirdCa) || 0 : 0;
    const eex = Number(editExam) || 0;

    if (eca1 > settings.ca1Max || eca2 > settings.ca2Max || eex > settings.examMax) {
      toast.error(
        `Score limits: ${settings.ca1Label} max ${settings.ca1Max}, ${settings.ca2Label} max ${settings.ca2Max}, ${settings.examLabel} max ${settings.examMax}`
      );
      return;
    }
    if (showThirdCa && eca3 > settings.ca3Max) {
      toast.error(`${settings.ca3Label} cannot exceed ${settings.ca3Max}`);
      return;
    }

    try {
      const res = await fetch("/api/exams", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          firstCa: eca1,
          secondCa: eca2,
          thirdCa: eca3,
          exam: eex,
        }),
      });
      if (!res.ok) {
        toast.error("Failed to update score");
        return;
      }
      toast.success("Score updated");
      setEditingId(null);
      fetchScores();
    } catch {
      toast.error("Network error");
    }
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/exams?id=${deleteId}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed to delete score");
        return;
      }
      toast.success("Score deleted");
      setDeleteId(null);
      fetchScores();
    } catch {
      toast.error("Network error");
    }
  }

  function goBack() {
    setView("cards");
    setExamScores([]);
    resetForm();
  }

  /* ---- Settings dialog handlers ---- */

  function openSettingsDialog() {
    setSettingsForm({ ...settings });
    setSettingsDialogOpen(true);
  }

  async function saveSettings() {
    setSettingsSaving(true);
    try {
      const body = {
        type: "school-settings",
        ...settingsForm,
      };

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.message || "Failed to save settings");
        return;
      }

      const data = await res.json();
      if (data) {
        setSettings((prev) => ({
          ...prev,
          ...settingsForm,
          id: data.id || prev.id,
        }));
      }

      toast.success("Assessment settings saved");
      setSettingsDialogOpen(false);
      fetchScores();
    } catch {
      toast.error("Network error");
    } finally {
      setSettingsSaving(false);
    }
  }

  /* ================================================================ */
  /*  Filtered classes by school type                                  */
  /* ================================================================ */
  const filteredClasses = selectedSchool
    ? classes.filter((c) => {
      if (selectedSchool === "Teacher") return true;
      return c.title.toUpperCase().startsWith(selectedSchool);
    })
    : classes;

  /* ================================================================ */
  /*  Edit-mode auto total                                             */
  /* ================================================================ */
  const editAutoTotal =
    (Number(editFirstCa) || 0) +
    (Number(editSecondCa) || 0) +
    (showThirdCa ? Number(editThirdCa) || 0 : 0) +
    (Number(editExam) || 0);

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {view === "entry" && (
            <Button variant="ghost" size="icon" onClick={goBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Examination Records</h1>
            <p className="text-sm text-muted-foreground">
              {view === "cards"
                ? "Select a school section and term to enter scores"
                : `${selectedSchool === "Teacher" ? "Teacher Computing" : selectedSchool} — ${selectedTerm} — ${selectedClass}`}
            </p>
          </div>
        </div>

        {view === "entry" && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={openSettingsDialog}
          >
            <Settings className="h-4 w-4" />
            Assessment Settings
          </Button>
        )}
      </div>

      {/* ======================== CARDS VIEW ======================== */}
      {view === "cards" && (
        <div className="grid gap-6 md:grid-cols-3">
          {SCHOOL_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.key} className="overflow-hidden border-0 shadow-lg">
                <CardContent className="p-0">
                  <div className={`bg-gradient-to-br ${card.gradient} p-6`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white/80">{card.subtitle}</p>
                        <h2 className="mt-1 text-xl font-bold text-white">{card.title}</h2>
                      </div>
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
                        <Icon className="h-7 w-7 text-white" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 p-4">
                    {TERMS.map((term) => (
                      <Button
                        key={term}
                        variant="outline"
                        className="w-full justify-between"
                        onClick={() => handleTermClick(card.key, term)}
                        disabled={masterLoading}
                      >
                        <span className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          {term}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ===================== ENTRY VIEW ========================== */}
      {view === "entry" && (
        <div className="space-y-6">
          {/* ---- Active Settings Summary ---- */}
          <Card className="border-dashed bg-muted/30">
            <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-sm">
              <span className="font-medium text-muted-foreground">Active Assessment:</span>
              <Badge variant="secondary">
                {caCount} CA{caCount > 1 ? "s" : ""} + {settings.examLabel}
              </Badge>
              <span className="text-muted-foreground">
                {settings.ca1Label} ({settings.ca1Max}) + {settings.ca2Label} ({settings.ca2Max})
                {showThirdCa && (
                  <> + {settings.ca3Label} ({settings.ca3Max})</>
                )}
                {" + "}
                {settings.examLabel} ({settings.examMax}) = {settings.totalMax}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-7 gap-1 text-xs"
                onClick={openSettingsDialog}
              >
                <Settings className="h-3 w-3" />
                Edit
              </Button>
            </CardContent>
          </Card>

          {/* ---- Score Entry Form ---- */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Enter Score</CardTitle>
              <CardDescription>
                Fill in the assessment scores for the selected student and subject. Scores are
                validated against the configured maximums.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {/* Student */}
                <div className="space-y-1.5">
                  <Label>Student</Label>
                  <Select value={formStudent} onValueChange={setFormStudent}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.length === 0 && (
                        <SelectItem value="__none" disabled>
                          No students in this class
                        </SelectItem>
                      )}
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.fullname}>
                          {s.fullname}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Subject */}
                <div className="space-y-1.5">
                  <Label>Subject</Label>
                  <Select value={formSubject} onValueChange={setFormSubject}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.name}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* First CA */}
                <div className="space-y-1.5">
                  <Label>
                    {settings.ca1Label}{" "}
                    <span className="text-muted-foreground">(0–{settings.ca1Max})</span>
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={settings.ca1Max}
                    value={formFirstCa}
                    onChange={(e) =>
                      setFormFirstCa(
                        Math.min(settings.ca1Max, Math.max(0, Number(e.target.value))).toString()
                      )
                    }
                    placeholder="0"
                  />
                </div>

                {/* Second CA */}
                <div className="space-y-1.5">
                  <Label>
                    {settings.ca2Label}{" "}
                    <span className="text-muted-foreground">(0–{settings.ca2Max})</span>
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={settings.ca2Max}
                    value={formSecondCa}
                    onChange={(e) =>
                      setFormSecondCa(
                        Math.min(settings.ca2Max, Math.max(0, Number(e.target.value))).toString()
                      )
                    }
                    placeholder="0"
                  />
                </div>

                {/* Third CA (conditional) */}
                {showThirdCa && (
                  <div className="space-y-1.5">
                    <Label>
                      {settings.ca3Label}{" "}
                      <span className="text-muted-foreground">(0–{settings.ca3Max})</span>
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={settings.ca3Max}
                      value={formThirdCa}
                      onChange={(e) =>
                        setFormThirdCa(
                          Math.min(settings.ca3Max, Math.max(0, Number(e.target.value))).toString()
                        )
                      }
                      placeholder="0"
                    />
                  </div>
                )}

                {/* Exam */}
                <div className="space-y-1.5">
                  <Label>
                    {settings.examLabel}{" "}
                    <span className="text-muted-foreground">(0–{settings.examMax})</span>
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={settings.examMax}
                    value={formExam}
                    onChange={(e) =>
                      setFormExam(
                        Math.min(settings.examMax, Math.max(0, Number(e.target.value))).toString()
                      )
                    }
                    placeholder="0"
                  />
                </div>

                {/* Total (auto) */}
                <div className="space-y-1.5">
                  <Label>Total</Label>
                  <div className="flex h-9 items-center rounded-md border bg-muted/50 px-3 text-sm font-semibold">
                    {autoTotal} / {settings.totalMax}
                  </div>
                </div>

                {/* Submit */}
                <div className="flex items-end sm:col-span-2">
                  <Button
                    className="w-full"
                    onClick={handleSubmit}
                    disabled={formSubmitting || !formStudent || !formSubject}
                  >
                    {formSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Save Score
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ---- Existing Scores Table ---- */}
          <Card>
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {hideStudentColumn
                    ? `Scores for ${formStudent}`
                    : "Existing Scores"}
                  <Badge variant="secondary" className="ml-2">
                    {filteredScores.length} records
                  </Badge>
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setShowAllStudents((prev) => !prev)}
                >
                  {showAllStudents ? (
                    <>
                      <User className="h-4 w-4" />
                      Current Student Only
                    </>
                  ) : (
                    <>
                      <Users className="h-4 w-4" />
                      Show All Students
                    </>
                  )}
                </Button>
              </div>

              {scoresLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredScores.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No scores entered yet. Use the form above to add scores.
                </p>
              ) : (
                <div className="max-h-[420px] overflow-y-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        {!hideStudentColumn && <TableHead>Student</TableHead>}
                        <TableHead>Subject</TableHead>
                        <TableHead className="text-center">{settings.ca1Label}</TableHead>
                        <TableHead className="text-center">{settings.ca2Label}</TableHead>
                        {showThirdCa && (
                          <TableHead className="text-center">{settings.ca3Label}</TableHead>
                        )}
                        <TableHead className="text-center">{settings.examLabel}</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredScores.map((score) => (
                        <TableRow key={score.id}>
                          {!hideStudentColumn && <TableCell className="font-medium">{score.fullname}</TableCell>}
                          <TableCell>{score.subject}</TableCell>
                          {editingId === score.id ? (
                            <>
                              <TableCell>
                                <Input
                                  className="h-8 w-16"
                                  type="number"
                                  min={0}
                                  max={settings.ca1Max}
                                  value={editFirstCa}
                                  onChange={(e) => setEditFirstCa(Math.min(settings.ca1Max, Math.max(0, Number(e.target.value))).toString())}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  className="h-8 w-16"
                                  type="number"
                                  min={0}
                                  max={settings.ca2Max}
                                  value={editSecondCa}
                                  onChange={(e) => setEditSecondCa(Math.min(settings.ca2Max, Math.max(0, Number(e.target.value))).toString())}
                                />
                              </TableCell>
                              {showThirdCa && (
                                <TableCell>
                                  <Input
                                    className="h-8 w-16"
                                    type="number"
                                    min={0}
                                    max={settings.ca3Max}
                                    value={editThirdCa}
                                    onChange={(e) => setEditThirdCa(Math.min(settings.ca3Max, Math.max(0, Number(e.target.value))).toString())}
                                  />
                                </TableCell>
                              )}
                              <TableCell>
                                <Input
                                  className="h-8 w-16"
                                  type="number"
                                  min={0}
                                  max={settings.examMax}
                                  value={editExam}
                                  onChange={(e) => setEditExam(Math.min(settings.examMax, Math.max(0, Number(e.target.value))).toString())}
                                />
                              </TableCell>
                              <TableCell className="text-center font-semibold">
                                {editAutoTotal}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button size="sm" variant="ghost" onClick={saveEdit}>
                                    <Save className="h-4 w-4 text-emerald-600" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                </div>
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="text-center">{score.firstCa}</TableCell>
                              <TableCell className="text-center">{score.secondCa}</TableCell>
                              {showThirdCa && (
                                <TableCell className="text-center">{score.thirdCa}</TableCell>
                              )}
                              <TableCell className="text-center">{score.exam}</TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant={score.total >= settings.totalMax * 0.4 ? "default" : "destructive"}
                                >
                                  {score.total}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => startEdit(score)}
                                  >
                                    <Pencil className="h-4 w-4 text-amber-600" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setDeleteId(score.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ---- Report Card Comments ---- */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MessageSquare className="h-5 w-5" />
                    Report Card Comments
                  </CardTitle>
                  <CardDescription>
                    These comments appear on the report card for {selectedTerm}
                  </CardDescription>
                </div>
                <Button
                  onClick={saveComments}
                  disabled={commentSaving || commentLoading}
                  size="sm"
                  className="gap-2"
                >
                  {commentSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Comments
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {commentLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Teacher Remark - Dropdown */}
                  <div className="space-y-1.5">
                    <Label>Teacher Remark</Label>
                    <Select value={commentTeacher} onValueChange={setCommentTeacher}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select remark..." />
                      </SelectTrigger>
                      <SelectContent>
                        {teacherRemarkOptions.length === 0 && (
                          <SelectItem value="__none" disabled>
                            No remarks added yet
                          </SelectItem>
                        )}
                        {teacherRemarkOptions.map((r, i) => (
                          <SelectItem key={i} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                      Add remarks in Report Card Settings
                    </p>
                  </div>

                  {/* Principal Comment - Dropdown */}
                  <div className="space-y-1.5">
                    <Label>Principal Comment</Label>
                    <Select value={commentPrincipal} onValueChange={setCommentPrincipal}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select comment..." />
                      </SelectTrigger>
                      <SelectContent>
                        {principalRemarkOptions.length === 0 && (
                          <SelectItem value="__none" disabled>
                            No comments added yet
                          </SelectItem>
                        )}
                        {principalRemarkOptions.map((r, i) => (
                          <SelectItem key={i} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                      Add comments in Report Card Settings
                    </p>
                  </div>

                  {/* School Days Opened */}
                  <div className="space-y-1.5">
                    <Label>School Days Opened</Label>
                    <Input
                      type="number"
                      min={0}
                      value={commentDaysOpened}
                      onChange={(e) => setCommentDaysOpened(e.target.value)}
                      placeholder="e.g. 95"
                    />
                  </div>

                  {/* Next Term Label */}
                  <div className="space-y-1.5">
                    <Label>Next Term</Label>
                    <Input
                      type="text"
                      value={commentNextTerm}
                      onChange={(e) => setCommentNextTerm(e.target.value)}
                      placeholder="e.g. Second Term 2025/2026"
                    />
                  </div>

                  {/* Next Term Resumption */}
                  <div className="space-y-1.5">
                    <Label>Next Term Begins</Label>
                    <Input
                      type="date"
                      value={commentResumption}
                      onChange={(e) => setCommentResumption(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===================== SESSION/CLASS MODAL ================= */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Session &amp; Class</DialogTitle>
            <DialogDescription>
              Choose the session and class for {selectedTerm} entry.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Session</Label>
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={sessionLabel(s)}>
                      {sessionLabel(s)}
                      {s.active === "Yes" && (
                        <Badge className="ml-2 bg-emerald-600" variant="default">
                          Active
                        </Badge>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {filteredClasses.map((c) => (
                    <SelectItem key={c.id} value={c.title}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleModalConfirm} disabled={!selectedSession || !selectedClass}>
              Continue
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================== DELETE CONFIRM ===================== */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Score</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this exam score? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===================== SETTINGS DIALOG ===================== */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Assessment Settings
            </DialogTitle>
            <DialogDescription>
              Configure the number of continuous assessments (CAs), their maximum scores, and labels.
              Changes apply to new score entries. Total is auto-calculated.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Number of CAs */}
            <div className="space-y-1.5">
              <Label>Number of CAs</Label>
              <Select
                value={String(settingsForm.caCount)}
                onValueChange={(val) =>
                  setSettingsForm((prev) => ({
                    ...prev,
                    caCount: Number(val) as 2 | 3,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select CA count" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 CAs + Exam</SelectItem>
                  <SelectItem value="3">3 CAs + Exam</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* CA Labels & Max Scores */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* CA1 */}
              <div className="space-y-1.5">
                <Label>{settingsForm.ca1Label} Label</Label>
                <Input
                  value={settingsForm.ca1Label}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({ ...prev, ca1Label: e.target.value }))
                  }
                  placeholder="1st CA"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{settingsForm.ca1Label} Max Score</Label>
                <Input
                  type="number"
                  min={1}
                  value={settingsForm.ca1Max}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      ca1Max: Math.max(1, Number(e.target.value)),
                    }))
                  }
                />
              </div>

              {/* CA2 */}
              <div className="space-y-1.5">
                <Label>{settingsForm.ca2Label} Label</Label>
                <Input
                  value={settingsForm.ca2Label}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({ ...prev, ca2Label: e.target.value }))
                  }
                  placeholder="2nd CA"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{settingsForm.ca2Label} Max Score</Label>
                <Input
                  type="number"
                  min={1}
                  value={settingsForm.ca2Max}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      ca2Max: Math.max(1, Number(e.target.value)),
                    }))
                  }
                />
              </div>

              {/* CA3 (conditional) */}
              {settingsForm.caCount === 3 && (
                <>
                  <div className="space-y-1.5">
                    <Label>{settingsForm.ca3Label} Label</Label>
                    <Input
                      value={settingsForm.ca3Label}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({ ...prev, ca3Label: e.target.value }))
                      }
                      placeholder="3rd CA"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{settingsForm.ca3Label} Max Score</Label>
                    <Input
                      type="number"
                      min={1}
                      value={settingsForm.ca3Max}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({
                          ...prev,
                          ca3Max: Math.max(1, Number(e.target.value)),
                        }))
                      }
                    />
                  </div>
                </>
              )}
            </div>

            <Separator />

            {/* Exam */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{settingsForm.examLabel} Label</Label>
                <Input
                  value={settingsForm.examLabel}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({ ...prev, examLabel: e.target.value }))
                  }
                  placeholder="Exam"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{settingsForm.examLabel} Max Score</Label>
                <Input
                  type="number"
                  min={1}
                  value={settingsForm.examMax}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      examMax: Math.max(1, Number(e.target.value)),
                    }))
                  }
                />
              </div>
            </div>

            {/* Total Max */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Total Max Score</Label>
                <Input
                  type="number"
                  min={1}
                  value={settingsForm.totalMax}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      totalMax: Math.max(1, Number(e.target.value)),
                    }))
                  }
                />
              </div>
              <div className="flex items-end">
                <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  Calculated total:{" "}
                  <span className="font-semibold text-foreground">
                    {settingsForm.ca1Max + settingsForm.ca2Max + (settingsForm.caCount === 3 ? settingsForm.ca3Max : 0) + settingsForm.examMax}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveSettings} disabled={settingsSaving}>
              {settingsSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
