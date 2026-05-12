"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Calendar,
  Plus,
  Pencil,
  Trash2,
  Search,
  CheckCircle2,
  RefreshCw,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

interface Session {
  id: string;
  sessionOne: string;
  sessionTwo: string;
  active: string;
  createdAt: string;
  tenant: { id: string; name: string; slug: string };
}

interface Summary {
  totalSchools: number;
  schoolsWithSessions: number;
  totalSessions: number;
}

export function DevSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSchool, setFilterSchool] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Session | null>(null);
  const [formSchoolId, setFormSchoolId] = useState("");
  const [formSchoolName, setFormSchoolName] = useState("");
  const [formOne, setFormOne] = useState("");
  const [formTwo, setFormTwo] = useState("");
  const [formActive, setFormActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [schoolSearch, setSchoolSearch] = useState("");
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);

  const sessionDisplay = (s: Session) => `${s.sessionOne}/${s.sessionTwo}`;

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const params = filterSchool ? `?tenantId=${filterSchool}` : "";
      const res = await fetch(`/api/dev/sessions${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSessions(data.sessions || []);
      setSummary(data.summary || null);
    } catch {
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, [filterSchool]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const filtered = sessions.filter((s) => {
    const matchSearch =
      sessionDisplay(s).toLowerCase().includes(search.toLowerCase()) ||
      s.tenant.name.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const uniqueSchools = Array.from(
    new Map(sessions.map((s) => [s.tenant.id, s.tenant])).values()
  );

  const openAdd = () => {
    setEditing(null);
    setFormSchoolId("");
    setFormSchoolName("");
    setFormOne("");
    setFormTwo("");
    setFormActive(false);
    setDialogOpen(true);
  };

  const openEdit = (session: Session) => {
    setEditing(session);
    setFormSchoolId(session.tenant.id);
    setFormSchoolName(session.tenant.name);
    setFormOne(session.sessionOne);
    setFormTwo(session.sessionTwo);
    setFormActive(session.active === "Yes");
    setDialogOpen(true);
  };

  const searchSchools = async (query: string) => {
    if (query.length < 2) {
      setSchools([]);
      return;
    }
    try {
      setSchoolsLoading(true);
      const res = await fetch("/api/dev/schools");
      if (!res.ok) return;
      const data = await res.json();
      const all = Array.isArray(data) ? data : data.schools || [];
      const filtered = all.filter(
        (s: { id: string; name: string; status?: string }) =>
          s.name.toLowerCase().includes(query.toLowerCase()) &&
          s.status === "approved"
      );
      setSchools(filtered.slice(0, 10));
    } catch {
      // ignore
    } finally {
      setSchoolsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formSchoolId) {
      toast.error("Please select a school");
      return;
    }
    if (!formOne.trim() || !formTwo.trim()) {
      toast.error("Both session years are required");
      return;
    }

    try {
      setSubmitting(true);
      const method = editing ? "PUT" : "POST";
      const body: Record<string, unknown> = {
        sessionOne: formOne.trim(),
        sessionTwo: formTwo.trim(),
        active: formActive ? "Yes" : "No",
      };
      if (editing) {
        body.id = editing.id;
      } else {
        body.tenantId = formSchoolId;
      }

      const res = await fetch("/api/dev/sessions", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Operation failed");
      }

      toast.success(editing ? "Session updated" : "Session created");
      setDialogOpen(false);
      fetchSessions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/dev/sessions?id=${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Session deleted");
      setDeleteTarget(null);
      fetchSessions();
    } catch {
      toast.error("Failed to delete session");
    } finally {
      setDeleting(false);
    }
  };

  const handleSetActive = async (session: Session) => {
    try {
      const res = await fetch("/api/dev/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: session.id,
          sessionOne: session.sessionOne,
          sessionTwo: session.sessionTwo,
          active: "Yes",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`${sessionDisplay(session)} set as active`);
      fetchSessions();
    } catch {
      toast.error("Failed to activate session");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/10">
            <Calendar className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Session Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage academic sessions across all schools
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchSessions} disabled={loading}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={openAdd}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Session
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span className="text-xs font-medium">Total Schools</span>
            </div>
            <p className="mt-1 text-2xl font-bold">{summary.totalSchools}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-medium">Schools with Sessions</span>
            </div>
            <p className="mt-1 text-2xl font-bold">{summary.schoolsWithSessions}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-xs font-medium">Total Sessions</span>
            </div>
            <p className="mt-1 text-2xl font-bold">{summary.totalSessions}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by session or school..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {uniqueSchools.length > 1 && (
          <select
            value={filterSchool}
            onChange={(e) => setFilterSchool(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">All Schools</option>
            {uniqueSchools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Session</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-48 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="ml-auto h-8 w-24" /></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  No sessions found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((session, idx) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">{idx + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{session.tenant.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{sessionDisplay(session)}</TableCell>
                  <TableCell>
                    {session.active === "Yes" ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px]">
                        <CheckCircle2 className="mr-0.5 h-2.5 w-2.5" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {session.active !== "Yes" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetActive(session)}
                          className="h-7 text-green-600 hover:text-green-700 hover:bg-green-50 text-[11px]"
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Activate
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(session)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget(session)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Session" : "Create Session"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update session details for this school." : "Create a new academic session for a school."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editing && (
              <div className="space-y-2">
                <Label>School</Label>
                {formSchoolName ? (
                  <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm flex-1">{formSchoolName}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => { setFormSchoolId(""); setFormSchoolName(""); }}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search for a school..."
                      value={schoolSearch}
                      onChange={(e) => { setSchoolSearch(e.target.value); searchSchools(e.target.value); }}
                      className="pl-9"
                    />
                    {schools.length > 0 && (
                      <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg max-h-48 overflow-y-auto">
                        {schoolsLoading && <div className="p-3 text-sm text-muted-foreground">Searching...</div>}
                        {schools.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => { setFormSchoolId(s.id); setFormSchoolName(s.name); setSchoolSearch(""); setSchools([]); }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                          >
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            {s.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {editing && (
              <div className="space-y-2">
                <Label>School</Label>
                <div className="flex items-center gap-2 rounded-lg border px-3 py-2 bg-muted/50">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{formSchoolName}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dev-session-start">Start Year</Label>
                <Input id="dev-session-start" type="number" placeholder="e.g. 2024" value={formOne} onChange={(e) => setFormOne(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dev-session-end">End Year</Label>
                <Input id="dev-session-end" type="number" placeholder="e.g. 2025" value={formTwo} onChange={(e) => setFormTwo(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label>Set as Active</Label>
                <p className="text-xs text-muted-foreground">Only one session per school can be active</p>
              </div>
              <Switch checked={formActive} onCheckedChange={setFormActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Saving..." : editing ? "Update" : "Create Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session</AlertDialogTitle>
            <AlertDialogDescription>
              Delete session &quot;{deleteTarget ? sessionDisplay(deleteTarget) : ""}&quot; for {deleteTarget?.tenant.name}? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-white hover:bg-destructive/90">
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}