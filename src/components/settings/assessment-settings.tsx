"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/store/index";
import {
  Settings,
  Save,
  Loader2,
  Calculator,
  RefreshCw,
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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
/*  Defaults                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_SETTINGS: SchoolSettings = {
  id: "",
  caCount: 1,
  ca1Max: 40,
  ca2Max: 20,
  ca3Max: 10,
  ca1Label: "1st CA",
  ca2Label: "2nd CA",
  ca3Label: "3rd CA",
  examMax: 60,
  examLabel: "Exam",
  totalMax: 100,
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AssessmentSettings() {
  const [settings, setSettings] = useState<SchoolSettings>({ ...DEFAULT_SETTINGS });
  const [form, setForm] = useState<SchoolSettings>({ ...DEFAULT_SETTINGS });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  /* ---- fetch ---- */
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings?type=school-settings");
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) {
          setSettings(data);
          setForm(data);
        }
      }
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  /* ---- derived ---- */
  const computedTotal =
    form.ca1Max + (form.caCount >= 2 ? form.ca2Max : 0) + (form.caCount >= 3 ? form.ca3Max : 0) + form.examMax;

  /* ---- save ---- */
  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "school-settings",
          ...form,
        }),
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
          ...form,
          id: data.id || prev.id,
        }));
      }

      toast.success("Assessment settings saved successfully");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  /* ---- reset ---- */
  function handleReset() {
    setForm({ ...DEFAULT_SETTINGS });
    toast.info("Form reset to defaults. Click Save to apply.");
  }

  /* ---- format number input ---- */
  function numVal(v: string, min = 0): number {
    return Math.max(min, Number(v) || 0);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assessment Settings</h1>
          <p className="text-sm text-muted-foreground">Configure score components and weights</p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assessment Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure the number of continuous assessments, their labels, max scores, and exam settings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Settings
          </Button>
        </div>
      </div>

      {/* Formula Preview */}
      <Card className="border-dashed border-2 border-emerald-200 bg-emerald-50/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600">
              <Calculator className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-900">Score Formula Preview</h3>
              <p className="text-xs text-emerald-700">This is how scores will be calculated</p>
            </div>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-white p-4 font-mono text-sm">
            <span className="font-bold text-emerald-700">{form.ca1Label}({form.ca1Max})</span>
            {form.caCount >= 2 && (
              <>
                <span className="text-muted-foreground"> + </span>
                <span className="font-bold text-emerald-700">{form.ca2Label}({form.ca2Max})</span>
              </>
            )}
            {form.caCount >= 3 && (
              <>
                <span className="text-muted-foreground"> + </span>
                <span className="font-bold text-emerald-700">{form.ca3Label}({form.ca3Max})</span>
              </>
            )}
            <span className="text-muted-foreground"> + </span>
            <span className="font-bold text-emerald-700">{form.examLabel}({form.examMax})</span>
            <span className="text-muted-foreground"> = </span>
            <span className="font-bold text-lg text-emerald-800">{computedTotal}</span>
          </div>
        </CardContent>
      </Card>

      {/* Settings Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Score Components
          </CardTitle>
          <CardDescription>
            Define how many continuous assessments (CAs) are used, their labels, max scores, and the exam component.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Number of CAs */}
          <div className="space-y-1.5">
            <Label>Number of Continuous Assessments</Label>
            <Select
              value={String(form.caCount)}
              onValueChange={(val) =>
                setForm((prev) => ({ ...prev, caCount: Math.max(1, Math.min(5, Number(val))) }))
              }
            >
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Select CA count" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 CA + Exam</SelectItem>
                <SelectItem value="2">2 CAs + Exam</SelectItem>
                <SelectItem value="3">3 CAs + Exam</SelectItem>
                <SelectItem value="4">4 CAs + Exam</SelectItem>
                <SelectItem value="5">5 CAs + Exam</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The number of continuous assessment components scored before the exam.
            </p>
          </div>

          <Separator />

          {/* CA Components */}
          <div className="space-y-1.5">
            <h4 className="text-sm font-semibold">Continuous Assessment Components</h4>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* CA1 - always shown */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">CA1</Badge>
                  <span className="text-sm text-muted-foreground">First Assessment</span>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Label</Label>
                  <Input
                    value={form.ca1Label}
                    onChange={(e) => setForm((prev) => ({ ...prev, ca1Label: e.target.value }))}
                    placeholder="1st CA"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Max Score</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.ca1Max}
                    onChange={(e) => setForm((prev) => ({ ...prev, ca1Max: numVal(e.target.value, 1) }))}
                  />
                </div>
              </div>

              {/* CA2 - shown when caCount >= 2 */}
              {form.caCount >= 2 && (
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">CA2</Badge>
                  <span className="text-sm text-muted-foreground">Second Assessment</span>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Label</Label>
                  <Input
                    value={form.ca2Label}
                    onChange={(e) => setForm((prev) => ({ ...prev, ca2Label: e.target.value }))}
                    placeholder="2nd CA"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Max Score</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.ca2Max}
                    onChange={(e) => setForm((prev) => ({ ...prev, ca2Max: numVal(e.target.value, 1) }))}
                  />
                </div>
              </div>
              )}

              {/* CA3 - shown when caCount >= 3 */}
              {form.caCount >= 3 && (
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">CA3</Badge>
                    <span className="text-sm text-muted-foreground">Third Assessment</span>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Label</Label>
                    <Input
                      value={form.ca3Label}
                      onChange={(e) => setForm((prev) => ({ ...prev, ca3Label: e.target.value }))}
                      placeholder="3rd CA"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Max Score</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.ca3Max}
                      onChange={(e) => setForm((prev) => ({ ...prev, ca3Max: numVal(e.target.value, 1) }))}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Exam Component */}
          <div className="space-y-1.5">
            <h4 className="text-sm font-semibold">Examination Component</h4>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-amber-600 font-mono">EXAM</Badge>
                  <span className="text-sm text-muted-foreground">Final Examination</span>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Label</Label>
                  <Input
                    value={form.examLabel}
                    onChange={(e) => setForm((prev) => ({ ...prev, examLabel: e.target.value }))}
                    placeholder="Exam"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Max Score</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.examMax}
                    onChange={(e) => setForm((prev) => ({ ...prev, examMax: numVal(e.target.value, 1) }))}
                  />
                </div>
              </div>

              {/* Total */}
              <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50/30 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-600 font-mono">TOTAL</Badge>
                  <span className="text-sm text-muted-foreground">Auto-Calculated</span>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Total Max Score</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={form.totalMax}
                      onChange={(e) => setForm((prev) => ({ ...prev, totalMax: numVal(e.target.value, 1) }))}
                    />
                  </div>
                </div>
                <div className="rounded-md bg-white border px-3 py-2 text-xs">
                  <span className="text-muted-foreground">Computed: </span>
                  <span className="font-bold text-emerald-700">{computedTotal}</span>
                  {computedTotal !== form.totalMax && (
                    <span className="text-red-500 ml-1">(mismatch with Total Max)</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Current / Saved Indicator */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className={`h-2 w-2 rounded-full ${JSON.stringify(form) === JSON.stringify(settings) ? "bg-emerald-500" : "bg-amber-500"}`} />
            {JSON.stringify(form) === JSON.stringify(settings)
              ? "All changes saved"
              : "Unsaved changes — click Save to apply"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}