"use client";

import { useState, useCallback, useMemo } from "react";
import { Settings2, RotateCcw, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  type ReportCardVisibility,
  getReportCardVisibility,
  saveReportCardVisibility,
  resetReportCardVisibility,
  SECTION_LABELS,
  SECTION_GROUPS,
} from "@/lib/report-card-settings";

interface ReportCardSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string | null;
  visibility: ReportCardVisibility;
  onVisibilityChange: (visibility: ReportCardVisibility) => void;
}

export function ReportCardSettingsDialog({
  open,
  onOpenChange,
  tenantId,
  visibility,
  onVisibilityChange,
}: ReportCardSettingsDialogProps) {
  // Use visibility prop as source of truth when dialog opens
  const localSettings = open ? visibility : visibility;

  const handleToggle = (key: keyof ReportCardVisibility) => {
    const next = { ...localSettings, [key]: !localSettings[key] };
    saveReportCardVisibility(tenantId, next);
    onVisibilityChange(next);
  };

  const handleReset = () => {
    const defaults = resetReportCardVisibility(tenantId);
    onVisibilityChange(defaults);
  };

  const handleSelectAll = () => {
    const allOn: ReportCardVisibility = {
      header: true,
      titleBar: true,
      studentPhoto: true,
      studentInfo: true,
      subjectTable: true,
      subjectsTakenLine: true,
      summaryStats: true,
      positionSection: true,
      teacherRemark: true,
      principalRemark: true,
      resumptionInfo: true,
      signatures: true,
      gradingKey: true,
      footer: true,
    };
    saveReportCardVisibility(tenantId, allOn);
    onVisibilityChange(allOn);
  };

  const activeCount = Object.values(localSettings).filter(Boolean).length;
  const totalCount = Object.keys(localSettings).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Settings2 className="h-5 w-5" />
            Report Card Display Settings
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Toggle which sections appear on the printed report card.{" "}
          <span className="font-medium text-foreground">
            {activeCount} of {totalCount} sections visible
          </span>
        </p>

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSelectAll} className="gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            Show All
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to Default
          </Button>
          <div className="ml-auto">
            <Badge variant={activeCount === totalCount ? "default" : "secondary"}>
              {activeCount}/{totalCount}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Section groups */}
        <div className="space-y-5">
          {SECTION_GROUPS.map((group) => (
            <div key={group.group}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {group.group}
              </h4>
              <div className="space-y-3">
                {group.keys.map((key) => {
                  const info = SECTION_LABELS[key];
                  const isOn = localSettings[key];
                  return (
                    <div
                      key={key}
                      className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                        isOn
                          ? "border-border bg-background"
                          : "border-dashed border-muted-foreground/25 bg-muted/30"
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5">
                          {isOn ? (
                            <Eye className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <Label
                            htmlFor={`rc-toggle-${key}`}
                            className={`text-sm font-medium leading-tight cursor-pointer ${
                              isOn ? "" : "text-muted-foreground line-through"
                            }`}
                          >
                            {info.label}
                          </Label>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {info.description}
                          </p>
                        </div>
                      </div>
                      <Switch
                        id={`rc-toggle-${key}`}
                        checked={isOn}
                        onCheckedChange={() => handleToggle(key)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <Separator />

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)} size="sm">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
