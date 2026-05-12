"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  School,
  Plus,
  Pencil,
  Trash2,
  Search,
  Layers,
  GraduationCap,
  Users,
  UserX,
  X,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Label } from "@/components/ui/label";

interface Class {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_ARMS = ["A", "B", "C", "D", "E", "F"];

function parseClassName(title: string): { base: string; arm: string | null } {
  const patterns = [
    /^([A-Za-z]+\s*\d+)\s*([A-Z])$/i,
    /^([A-Za-z]+\s*\d+)\s+([A-Z])$/i,
  ];
  for (const p of patterns) {
    const m = title.match(p);
    if (m) return { base: m[1].trim(), arm: m[2].toUpperCase() };
  }
  return { base: title, arm: null };
}

interface ClassGroup {
  base: string;
  arms: (Class & { arm: string | null })[];
}

function groupClasses(classes: Class[]): ClassGroup[] {
  const groups: ClassGroup[] = [];
  const groupMap = new Map<string, ClassGroup>();

  for (const cls of classes) {
    const { base, arm } = parseClassName(cls.title);
    if (!groupMap.has(base)) {
      const group: ClassGroup = { base, arms: [] };
      groupMap.set(base, group);
      groups.push(group);
    }
    groupMap.get(base)!.arms.push({ ...cls, arm });
  }

  // Sort: groups with arms first (sorted by base), then standalone
  return groups.sort((a, b) => {
    const aHasArms = a.arms.some((c) => c.arm !== null);
    const bHasArms = b.arms.some((c) => c.arm !== null);
    if (aHasArms && !bHasArms) return -1;
    if (!aHasArms && bHasArms) return 1;
    return a.base.localeCompare(b.base);
  });
}

const ARM_COLORS = [
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
  "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
];

function getArmColor(arm: string | null, index: number): string {
  if (!arm) return "bg-muted text-muted-foreground";
  const code = arm.charCodeAt(0) - 65;
  return ARM_COLORS[code % ARM_COLORS.length];
}

export default function ClassListView() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Add dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addClassName, setAddClassName] = useState("");
  const [selectedArms, setSelectedArms] = useState<string[]>([]);
  const [customArmInput, setCustomArmInput] = useState("");
  const [customArms, setCustomArms] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Class | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/classes");
      if (!res.ok) throw new Error("Failed to fetch classes");
      const data = await res.json();
      setClasses(data);
    } catch {
      toast.error("Failed to load classes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  // Filtered classes
  const filtered = useMemo(
    () =>
      classes.filter((c) =>
        c.title.toLowerCase().includes(debouncedSearch.toLowerCase())
      ),
    [classes, debouncedSearch]
  );

  // Grouped classes
  const grouped = useMemo(() => groupClasses(filtered), [filtered]);

  // Stats
  const stats = useMemo(() => {
    const parsedAll = classes.map((c) => parseClassName(c.title));
    const baseNames = new Set(parsedAll.map((p) => p.base));
    const withArms = parsedAll.filter((p) => p.arm !== null);
    const armBases = new Set(withArms.map((p) => p.base));
    const standalone = parsedAll.filter((p) => p.arm === null);

    return {
      totalGroups: baseNames.size,
      totalClasses: classes.length,
      totalArms: withArms.length,
      standalone: standalone.length,
    };
  }, [classes]);

  // Preview for add dialog
  const previewClasses = useMemo(() => {
    const allArms = [...selectedArms, ...customArms];
    const trimmedName = addClassName.trim();
    if (!trimmedName) return [];
    if (allArms.length === 0) return [trimmedName];
    return allArms
      .sort()
      .map((arm) => `${trimmedName} ${arm}`);
  }, [addClassName, selectedArms, customArms]);

  // Arm checkbox toggle
  const toggleArm = (arm: string) => {
    setSelectedArms((prev) =>
      prev.includes(arm) ? prev.filter((a) => a !== arm) : [...prev, arm]
    );
  };

  // Add custom arm
  const addCustomArm = () => {
    const trimmed = customArmInput.trim().toUpperCase();
    if (!trimmed) return;
    const allArms = [...DEFAULT_ARMS, ...customArms];
    if (allArms.includes(trimmed)) {
      toast.error(`Arm "${trimmed}" already exists`);
      return;
    }
    setCustomArms((prev) => [...prev, trimmed]);
    setCustomArmInput("");
  };

  // Remove custom arm
  const removeCustomArm = (arm: string) => {
    setCustomArms((prev) => prev.filter((a) => a !== arm));
  };

  // Open add dialog
  const openAdd = () => {
    setAddClassName("");
    setSelectedArms([]);
    setCustomArms([]);
    setCustomArmInput("");
    setAddDialogOpen(true);
  };

  // Open edit dialog
  const openEdit = (cls: Class) => {
    setEditingClass(cls);
    setEditTitle(cls.title);
    setEditDialogOpen(true);
  };

  // Handle bulk add
  const handleAdd = async () => {
    const trimmedName = addClassName.trim();
    if (!trimmedName) {
      toast.error("Class name is required");
      return;
    }

    const allArms = [...selectedArms, ...customArms];

    try {
      setSubmitting(true);

      if (allArms.length === 0) {
        // Single class creation (backward compatible)
        const res = await fetch("/api/classes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: trimmedName }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || "Failed to create class");
        }

        toast.success(`"${trimmedName}" created successfully`);
      } else {
        // Bulk creation with arms
        const res = await fetch("/api/classes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: trimmedName, arms: allArms }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || "Failed to create classes");
        }

        const data = await res.json();
        const { created, skipped } = data;

        if (created.length > 0 && skipped.length > 0) {
          toast.success(
            `${created.length} class${created.length > 1 ? "es" : ""} created, ${skipped.length} skipped (already exist)`
          );
        } else if (created.length > 0) {
          toast.success(
            `${created.length} class${created.length > 1 ? "es" : ""} created successfully`
          );
        } else {
          toast.info("All classes already exist");
        }
      }

      setAddDialogOpen(false);
      fetchClasses();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create class(es)"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Handle edit
  const handleEdit = async () => {
    if (!editingClass) return;
    const trimmed = editTitle.trim();
    if (!trimmed) {
      toast.error("Class name is required");
      return;
    }

    try {
      setEditSubmitting(true);
      const res = await fetch("/api/classes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingClass.id, title: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Update failed");
      }

      toast.success("Class updated successfully");
      setEditDialogOpen(false);
      fetchClasses();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update class"
      );
    } finally {
      setEditSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/classes?id=${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Delete failed");
      }
      toast.success("Class deleted successfully");
      setDeleteTarget(null);
      fetchClasses();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete class"
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <School className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Class Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage all school classes and arms
            </p>
          </div>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Class
        </Button>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="mb-2 h-4 w-24" />
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Layers className="h-4 w-4" />
                <span className="text-xs font-medium">Total Groups</span>
              </div>
              <p className="mt-1 text-2xl font-bold">{stats.totalGroups}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <GraduationCap className="h-4 w-4" />
                <span className="text-xs font-medium">Total Classes</span>
              </div>
              <p className="mt-1 text-2xl font-bold">{stats.totalClasses}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="text-xs font-medium">With Arms</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {stats.totalArms}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <UserX className="h-4 w-4" />
                <span className="text-xs font-medium">Standalone</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
                {stats.standalone}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search classes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Grouped Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Class Name</TableHead>
              <TableHead className="w-28 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-6" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="ml-auto h-8 w-20" />
                  </TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="h-32 text-center text-muted-foreground"
                >
                  {debouncedSearch
                    ? "No classes match your search."
                    : "No classes found. Click 'Add Class' to create one."}
                </TableCell>
              </TableRow>
            ) : (
              grouped.map((group) => {
                const hasArms = group.arms.some((c) => c.arm !== null);

                return (
                  <ClassGroupRow
                    key={group.base}
                    group={group}
                    hasArms={hasArms}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                  />
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Class Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Class</DialogTitle>
            <DialogDescription>
              Enter a base class name and optionally select arms to create
              multiple classes at once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Class name input */}
            <div className="space-y-2">
              <Label htmlFor="add-class-name">Class Name</Label>
              <Input
                id="add-class-name"
                placeholder="e.g. JSS 1, SSS 2, Primary 3"
                value={addClassName}
                onChange={(e) => setAddClassName(e.target.value)}
              />
            </div>

            {/* Default arm checkboxes */}
            <div className="space-y-2">
              <Label>Arms</Label>
              <div className="flex flex-wrap gap-3">
                {DEFAULT_ARMS.map((arm) => (
                  <div key={arm} className="flex items-center gap-2">
                    <Checkbox
                      id={`arm-${arm}`}
                      checked={selectedArms.includes(arm)}
                      onCheckedChange={() => toggleArm(arm)}
                    />
                    <Label
                      htmlFor={`arm-${arm}`}
                      className="cursor-pointer text-sm font-medium"
                    >
                      {arm}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom arm input */}
            <div className="space-y-2">
              <Label>Custom Arm</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. G, AB"
                  value={customArmInput}
                  onChange={(e) => setCustomArmInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomArm();
                    }
                  }}
                  className="max-w-[160px]"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomArm}
                  disabled={!customArmInput.trim()}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add
                </Button>
              </div>
              {/* Custom arm badges */}
              {customArms.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {customArms.map((arm) => (
                    <Badge
                      key={arm}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {arm}
                      <button
                        type="button"
                        onClick={() => removeCustomArm(arm)}
                        className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Live Preview */}
            {previewClasses.length > 0 && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">
                  Preview ({previewClasses.length} class
                  {previewClasses.length !== 1 ? "es" : ""} will be created)
                </Label>
                <div className="rounded-md border bg-muted/50 p-3">
                  <div className="flex flex-wrap gap-2">
                    {previewClasses.map((name) => (
                      <Badge
                        key={name}
                        variant="outline"
                        className="rounded-md border-primary/30 bg-background font-medium"
                      >
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={submitting || !addClassName.trim()}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : previewClasses.length > 1 ? (
                `Add ${previewClasses.length} Classes`
              ) : (
                "Add Class"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Class Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
            <DialogDescription>Update the class name below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-class-name">Class Name</Label>
              <Input
                id="edit-class-name"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEdit();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={editSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={editSubmitting}>
              {editSubmitting ? "Updating..." : "Update Class"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Class</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                &quot;{deleteTarget?.title}&quot;
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Sub-component for rendering a class group
function ClassGroupRow({
  group,
  hasArms,
  onEdit,
  onDelete,
}: {
  group: ClassGroup;
  hasArms: boolean;
  onEdit: (cls: Class) => void;
  onDelete: (cls: Class) => void;
}) {
  if (!hasArms) {
    // Standalone class
    const cls = group.arms[0];
    return (
      <TableRow key={cls.id}>
        <TableCell className="font-medium text-muted-foreground">—</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <span className="font-medium">{cls.title}</span>
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Standalone
            </Badge>
          </div>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(cls)}
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(cls)}
              title="Delete"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  // Grouped classes with arms
  return (
    <>
      {/* Group header row */}
      <TableRow key={`header-${group.base}`} className="bg-muted/50 hover:bg-muted/70">
        <TableCell className="font-medium text-muted-foreground" />
        <TableCell>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">{group.base}</span>
            <Badge variant="secondary" className="text-xs">
              {group.arms.length} arm{group.arms.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </TableCell>
        <TableCell />
      </TableRow>

      {/* Arm rows */}
      {group.arms
        .sort((a, b) => (a.arm || "").localeCompare(b.arm || ""))
        .map((cls, idx) => (
          <TableRow key={cls.id}>
            <TableCell className="pl-8 text-muted-foreground" />
            <TableCell>
              <div className="flex items-center gap-2 pl-6">
                <Badge
                  className={`rounded-md text-xs font-semibold ${getArmColor(cls.arm, idx)}`}
                >
                  {cls.arm || cls.title}
                </Badge>
                <span className="text-sm">{cls.title}</span>
              </div>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(cls)}
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(cls)}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
    </>
  );
}
