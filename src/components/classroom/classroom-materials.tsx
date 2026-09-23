// src/components/classroom/classroom-materials.tsx
// Shared "Class Materials" section for the teacher & student portals.
// Reads the SAME materials the admin Classroom module creates
// (/api/classrooms/materials, tenant-wide) so all portals stay in sync.
// Renders nothing when there are no materials.

"use client";

import { useEffect, useState } from "react";
import { Globe, Video, FileText, File, ExternalLink, FolderOpen } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Material {
  id: string;
  classroomId: string;
  title: string;
  description: string;
  type: string;
  url: string;
  fileSize: string;
  uploadedByName: string;
  createdAt: string;
  classroom?: { id: string; name: string } | null;
}

const TYPE_ICON: Record<string, typeof Globe> = {
  link: Globe,
  video: Video,
  file: FileText,
  document: File,
};

const TYPE_STYLE: Record<string, string> = {
  link: "bg-sky-50 text-sky-600",
  video: "bg-purple-50 text-purple-600",
  file: "bg-amber-50 text-amber-600",
  document: "bg-emerald-50 text-emerald-600",
};

export function ClassroomMaterials() {
  const [materials, setMaterials] = useState<Material[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/classrooms/materials");
        const json = await res.json();
        if (!res.ok || !json.success) return;
        if (!cancelled) setMaterials(json.data || []);
      } catch {
        // non-fatal — section simply stays hidden
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // still loading → show nothing (avoid layout noise); empty → hide entirely
  if (materials === null || materials.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FolderOpen className="size-4 text-muted-foreground" />
          Class Materials
          <Badge variant="outline" className="ml-1">{materials.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {materials.map((m) => {
            const Icon = TYPE_ICON[m.type] || File;
            const style = TYPE_STYLE[m.type] || "bg-slate-50 text-slate-600";
            return (
              <a
                key={m.id}
                href={m.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/60"
              >
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${style}`}>
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate text-sm font-medium">
                    {m.title}
                    <ExternalLink className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
                  </p>
                  {m.description && (
                    <p className="truncate text-xs text-muted-foreground">{m.description}</p>
                  )}
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {m.classroom?.name || "Classroom"}
                    {m.uploadedByName ? ` · ${m.uploadedByName}` : ""}
                  </p>
                </div>
              </a>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}