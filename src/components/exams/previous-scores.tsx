"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, Trash2, AlertCircle, Info, CheckCircle2 } from "lucide-react";

interface PreviousScoreEntry {
  id?: string;
  studentId: string;
  studentName: string;
  regNumber: string;
  totalScore: number;
  remark?: string;
  saved?: boolean;
}

interface ClassOption {
  id: string;
  name: string;
}

interface SubjectOption {
  id: string;
  name: string;
}

interface SessionOption {
  id: string;
  name: string;
}

export default function PreviousScoresPage() {
  // ─── Filters ─────────────────────────────────────────────────────────
  const [session, setSession] = useState("");
  const [term, setTerm] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");

  // ─── Data ────────────────────────────────────────────────────────────
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [students, setStudents] = useState<PreviousScoreEntry[]>([]);
  const [saving, setSaving] = useState(false);

  // ─── Status ──────────────────────────────────────────────────────────
  const [loaded, setLoaded] = useState(false);

  // ─── Fetch sessions ──────────────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions");
      const json = await res.json();
      if (json.success) {
        setSessions(
          json.data.map((s: any) => ({ id: String(s.id), name: s.name || s.session || String(s.id) }))
        );
      }
    } catch {
      // ignore
    }
  }, []);

  // ─── Fetch classes ───────────────────────────────────────────────────
  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch("/api/classes");
      const json = await res.json();
      if (json.success) {
        setClasses(
          json.data.map((c: any) => ({ id: c.id, name: c.name }))
        );
      }
    } catch {
      // ignore
    }
  }, []);

  // ─── Fetch subjects ──────────────────────────────────────────────────
  const fetchSubjects = useCallback(async () => {
    try {
      const res = await fetch("/api/subjects");
      const json = await res.json();
      if (json.success) {
        setSubjects(
          json.data.map((s: any) => ({ id: s.id, name: s.name }))
        );
      }
    } catch {
      // ignore
    }
  }, []);

  // ─── Load existing scores + students ─────────────────────────────────
  const loadScores = useCallback(async () => {
    if (!session || !term || !classId || !subjectId) return;

    setLoaded(false);
    try {
      // Fetch existing previous scores
      const scoresRes = await fetch(
        `/api/previous-scores?session=${encodeURIComponent(session)}&term=${term}&classId=${classId}&subjectId=${subjectId}`
      );
      const scoresJson = await scoresRes.json();

      const existingScores: Record<string, number> = {};
      const existingRemarks: Record<string, string> = {};
      const existingIds: Record<string, string> = {};
      if (scoresJson.success && scoresJson.data) {
        for (const s of scoresJson.data) {
          existingScores[s.studentId] = s.totalScore;
          if (s.remark) existingRemarks[s.studentId] = s.remark;
          existingIds[s.studentId] = s.id;
        }
      }

      // Fetch students in this class
      const studentsRes = await fetch(
        `/api/students?classId=${classId}`
      );
      const studentsJson = await studentsRes.json();

      if (studentsJson.success && studentsJson.data) {
        const entries: PreviousScoreEntry[] = studentsJson.data
          .map((st: any) => ({
            id: existingIds[st.id],
            studentId: st.id,
            studentName: st.name || st.studentName || "",
            regNumber: st.regNumber || st.studentId || "",
            totalScore: existingScores[st.id] || 0,
            remark: existingRemarks[st.id] || "",
            saved: !!existingIds[st.id],
          }))
          .sort((a: PreviousScoreEntry, b: PreviousScoreEntry) =>
            a.studentName.localeCompare(b.studentName)
          );

        setStudents(entries);
      }
    } catch {
      toast.error("Failed to load data");
    }
    setLoaded(true);
  }, [session, term, classId, subjectId]);

  // ─── Init ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchSessions();
    fetchClasses();
    fetchSubjects();
  }, [fetchSessions, fetchClasses, fetchSubjects]);

  // ─── Reload when filters change ──────────────────────────────────────
  useEffect(() => {
    if (session && term && classId && subjectId) {
      loadScores();
    }
  }, [session, term, classId, subjectId, loadScores]);

  // ─── Handle score change ─────────────────────────────────────────────
  const handleScoreChange = (
    studentId: string,
    field: "totalScore" | "remark",
    value: string
  ) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.studentId === studentId
          ? {
              ...s,
              [field]: field === "totalScore" ? parseFloat(value) || 0 : value,
              saved: false,
            }
          : s
      )
    );
  };

  // ─── Save all ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!session || !term || !classId || !subjectId) {
      toast.error("Please select session, term, class, and subject");
      return;
    }

    const validEntries = students.filter((s) => s.totalScore > 0);
    if (validEntries.length === 0) {
      toast.error("No scores to save");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/previous-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session,
          term: parseInt(term),
          classId,
          subjectId,
          scores: validEntries.map((s) => ({
            studentId: s.studentId,
            totalScore: s.totalScore,
            remark: s.remark,
          })),
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(`Saved ${json.data.length} score(s) successfully`);
        loadScores();
      } else {
        toast.error(json.message || "Failed to save");
      }
    } catch {
      toast.error("Network error");
    }
    setSaving(false);
  };

  // ─── Clear all ───────────────────────────────────────────────────────
  const handleClearAll = () => {
    setStudents((prev) =>
      prev.map((s) => ({ ...s, totalScore: 0, remark: "", saved: false }))
    );
  };

  const isReady = session && term && classId && subjectId;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Previous Term Scores</h2>
        <p className="text-muted-foreground mt-1">
          Enter scores from terms before you started using SIMS. These are used
          to calculate accurate cumulative averages on report cards.
        </p>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="flex items-start gap-3 pt-4">
          <Info className="text-blue-600 mt-0.5 h-5 w-5 shrink-0" />
          <div className="text-sm text-blue-800">
            <strong>How it works:</strong> If your school started using SIMS in
            2nd or 3rd term, enter the students&apos; scores from previous terms
            here. The report card will then calculate cumulative averages
            correctly. Only terms with data are counted — no zeros for missing
            terms.
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Criteria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Session</Label>
              <Select value={session} onValueChange={setSession}>
                <SelectTrigger>
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Term</Label>
              <Select value={term} onValueChange={setTerm}>
                <SelectTrigger>
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1st Term</SelectItem>
                  <SelectItem value="2">2nd Term</SelectItem>
                  <SelectItem value="3">3rd Term</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Class</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Subject</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student Scores Table */}
      {isReady && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              Student Scores
              {loaded && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({students.filter((s) => s.totalScore > 0).length} of{" "}
                  {students.length} entered)
                </span>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear All
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-1" />
                {saving ? "Saving..." : "Save All"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!loaded ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading students...
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No students found in this class.
              </div>
            ) : (
              <div className="overflow-auto max-h-[500px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium w-10">
                        #
                      </th>
                      <th className="text-left py-2 px-3 font-medium">
                        Student Name
                      </th>
                      <th className="text-left py-2 px-3 font-medium w-32">
                        Reg Number
                      </th>
                      <th className="text-left py-2 px-3 font-medium w-32">
                        Total Score
                      </th>
                      <th className="text-left py-2 px-3 font-medium w-48">
                        Remark
                      </th>
                      <th className="text-left py-2 px-3 font-medium w-20">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, idx) => (
                      <tr
                        key={s.studentId}
                        className="border-b hover:bg-muted/50"
                      >
                        <td className="py-2 px-3 text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-medium">
                          {s.studentName}
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">
                          {s.regNumber}
                        </td>
                        <td className="py-2 px-3">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={s.totalScore || ""}
                            onChange={(e) =>
                              handleScoreChange(
                                s.studentId,
                                "totalScore",
                                e.target.value
                              )
                            }
                            placeholder="0"
                            className="w-24"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <Input
                            type="text"
                            value={s.remark || ""}
                            onChange={(e) =>
                              handleScoreChange(
                                s.studentId,
                                "remark",
                                e.target.value
                              )
                            }
                            placeholder="Optional"
                            className="w-40"
                          />
                        </td>
                        <td className="py-2 px-3">
                          {s.saved ? (
                            <Badge
                              variant="secondary"
                              className="bg-green-100 text-green-700"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Saved
                            </Badge>
                          ) : s.totalScore > 0 ? (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Unsaved
                            </Badge>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}