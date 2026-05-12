"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Calendar, Plus, Pencil, Trash2, Search, CheckCircle } from "lucide-react";

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
  updatedAt: string;
}

export default function SessionListView() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [formOne, setFormOne] = useState("");
  const [formTwo, setFormTwo] = useState("");
  const [formActive, setFormActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Set active state
  const [activating, setActivating] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/sessions");
      if (!res.ok) throw new Error("Failed to fetch sessions");
      const data = await res.json();
      setSessions(data);
    } catch {
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const sessionDisplay = (s: Session) => `${s.sessionOne}/${s.sessionTwo}`;

  const filtered = sessions.filter((s) =>
    sessionDisplay(s).toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const openAdd = () => {
    setEditingSession(null);
    setFormOne("");
    setFormTwo("");
    setFormActive(false);
    setDialogOpen(true);
  };

  const openEdit = (session: Session) => {
    setEditingSession(session);
    setFormOne(session.sessionOne);
    setFormTwo(session.sessionTwo);
    setFormActive(session.active === "Yes");
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const trimmedOne = formOne.trim();
    const trimmedTwo = formTwo.trim();
    if (!trimmedOne) {
      toast.error("Session start year is required");
      return;
    }
    if (!trimmedTwo) {
      toast.error("Session end year is required");
      return;
    }

    try {
      setSubmitting(true);
      const method = editingSession ? "PUT" : "POST";
      const body = {
        ...(editingSession ? { id: editingSession.id } : {}),
        sessionOne: trimmedOne,
        sessionTwo: trimmedTwo,
        active: formActive ? "Yes" : "No",
      };

      const res = await fetch("/api/sessions", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Operation failed");
      }

      toast.success(
        editingSession
          ? "Session updated successfully"
          : "Session added successfully"
      );
      setDialogOpen(false);
      fetchSessions();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save session"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/sessions?id=${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Delete failed");
      }
      toast.success("Session deleted successfully");
      setDeleteTarget(null);
      fetchSessions();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete session"
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleSetActive = async (session: Session) => {
    try {
      setActivating(session.id);
      const res = await fetch("/api/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: session.id,
          sessionOne: session.sessionOne,
          sessionTwo: session.sessionTwo,
          active: "Yes",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to activate session");
      }

      toast.success(
        `Session ${sessionDisplay(session)} is now active`
      );
      fetchSessions();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to activate session"
      );
    } finally {
      setActivating(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Academic Sessions
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage academic sessions and set active session
            </p>
          </div>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Session
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search sessions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Session</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-48 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-6" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="ml-auto h-8 w-24" />
                  </TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-32 text-center text-muted-foreground"
                >
                  {debouncedSearch
                    ? "No sessions match your search."
                    : "No sessions found. Click 'Add Session' to create one."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((session, idx) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">{idx + 1}</TableCell>
                  <TableCell className="font-medium">
                    {sessionDisplay(session)}
                  </TableCell>
                  <TableCell>
                    {session.active === "Yes" ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-muted-foreground">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {session.active !== "Yes" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetActive(session)}
                          disabled={activating === session.id}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                        >
                          <CheckCircle className="mr-1 h-3.5 w-3.5" />
                          {activating === session.id ? "Setting..." : "Set Active"}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(session)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(session)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
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
            <DialogTitle>
              {editingSession ? "Edit Session" : "Add Session"}
            </DialogTitle>
            <DialogDescription>
              {editingSession
                ? "Update the academic session details below."
                : "Enter the start and end years for the new academic session."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="session-start">Start Year</Label>
                <Input
                  id="session-start"
                  type="number"
                  placeholder="e.g. 2023"
                  value={formOne}
                  onChange={(e) => setFormOne(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmit();
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="session-end">End Year</Label>
                <Input
                  id="session-end"
                  type="number"
                  placeholder="e.g. 2024"
                  value={formTwo}
                  onChange={(e) => setFormTwo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmit();
                  }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="session-active">Set as Active</Label>
                <p className="text-xs text-muted-foreground">
                  Only one session can be active at a time
                </p>
              </div>
              <Switch
                id="session-active"
                checked={formActive}
                onCheckedChange={setFormActive}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting
                ? "Saving..."
                : editingSession
                ? "Update Session"
                : "Add Session"}
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
            <AlertDialogTitle>Delete Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete session{" "}
              <span className="font-semibold text-foreground">
                &quot;{deleteTarget ? sessionDisplay(deleteTarget) : ""}&quot;
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
