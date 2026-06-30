//src/components/settings/card-settings.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Settings, Plus, Pencil, Trash2, Calendar } from "lucide-react";
import { useAppStore } from "@/store/index";

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

interface ResumptionRecord {
  id: string;
  session: string;
  term: string;
  openTerm: string;
  nextTerm: string;
  noSchoolOpen: number;
  createdAt: string;
  updatedAt: string;
}

const emptyForm = {
  session: "",
  term: "",
  openTerm: "",
  nextTerm: "",
  noSchoolOpen: 0,
};

export default function CardSettingsView() {
  const { currentPage } = useAppStore();
  const [records, setRecords] = useState<ResumptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings?type=resumptions");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setRecords(data);
    } catch {
      toast.error("Failed to load resumption records");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentPage === "card-settings") fetchRecords();
  }, [currentPage, fetchRecords]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-NG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const openAddDialog = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (record: ResumptionRecord) => {
    setEditingId(record.id);
    setForm({
      session: record.session,
      term: record.term,
      openTerm: record.openTerm || "",
      nextTerm: record.nextTerm || "",
      noSchoolOpen: record.noSchoolOpen || 0,
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (id: string) => {
    setDeletingId(id);
    setDeleteOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.session.trim() || !form.term) {
      toast.error("Session and Term are required");
      return;
    }
    try {
      if (editingId) {
        const res = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "resumption", id: editingId, ...form }),
        });
        if (!res.ok) throw new Error("Update failed");
        toast.success("Resumption record updated");
      } else {
        const res = await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "resumption", ...form }),
        });
        if (!res.ok) throw new Error("Create failed");
        toast.success("Resumption record created");
      }
      setDialogOpen(false);
      fetchRecords();
    } catch {
      toast.error("Failed to save resumption record");
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/settings?id=${deletingId}&type=resumption`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Resumption record deleted");
      setDeleteOpen(false);
      setDeletingId(null);
      fetchRecords();
    } catch {
      toast.error("Failed to delete record");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Settings className="h-5 w-5" />
            Report Card Settings
          </CardTitle>
          <Button onClick={openAddDialog} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Record
          </Button>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="mb-3 h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">No resumption records yet.</p>
              <p className="text-sm text-muted-foreground/70">
                Click &quot;Add Record&quot; to create one.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead className="hidden sm:table-cell">Opens</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Next Resumption
                    </TableHead>
                    <TableHead className="text-center">School Days</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record, idx) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{idx + 1}</TableCell>
                      <TableCell>{record.session}</TableCell>
                      <TableCell>{record.term}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {formatDate(record.openTerm)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {formatDate(record.nextTerm)}
                      </TableCell>
                      <TableCell className="text-center">
                        {record.noSchoolOpen}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(record)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => openDeleteDialog(record.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Resumption Record" : "Add Resumption Record"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="session">Session</Label>
              <Input
                id="session"
                placeholder="e.g. 2023/2024"
                value={form.session}
                onChange={(e) =>
                  setForm((f) => ({ ...f, session: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Term</Label>
              <Select
                value={form.term}
                onValueChange={(val) =>
                  setForm((f) => ({ ...f, term: val }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="First">First Term</SelectItem>
                  <SelectItem value="Second">Second Term</SelectItem>
                  <SelectItem value="Third">Third Term</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="openTerm">School Opens</Label>
              <Input
                id="openTerm"
                type="date"
                value={form.openTerm}
                onChange={(e) =>
                  setForm((f) => ({ ...f, openTerm: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nextTerm">Next Term Resumption</Label>
              <Input
                id="nextTerm"
                type="date"
                value={form.nextTerm}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nextTerm: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="noSchoolOpen">Number of School Days</Label>
              <Input
                id="noSchoolOpen"
                type="number"
                min={0}
                placeholder="e.g. 90"
                value={form.noSchoolOpen || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    noSchoolOpen: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this resumption record? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}