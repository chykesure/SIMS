"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { MessageSquare, Plus, Pencil, Trash2 } from "lucide-react";
import { useAppStore } from "@/store/index";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface Remark {
  id: string;
  remark: string;
  createdAt: string;
  updatedAt: string;
}

type RemarkTab = "teacher" | "principal";

export default function RemarksView() {
  const { currentPage } = useAppStore();
  const [activeTab, setActiveTab] = useState<RemarkTab>("teacher");

  const [teacherRemarks, setTeacherRemarks] = useState<Remark[]>([]);
  const [principalRemarks, setPrincipalRemarks] = useState<Remark[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [remarkText, setRemarkText] = useState("");

  const apiType =
    activeTab === "teacher" ? "teacher-remark" : "principal-remark";

  const fetchRemarks = useCallback(async () => {
    try {
      setLoading(true);
      const [tRes, pRes] = await Promise.all([
        fetch("/api/settings?type=teacher-remarks"),
        fetch("/api/settings?type=principal-remarks"),
      ]);
      if (tRes.ok) {
        const tData = await tRes.json();
        const seen = new Set<string>();
        setTeacherRemarks(
          tData.filter((r: Remark) => {
            const key = r.remark.trim().toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
        );
      }
      if (pRes.ok) {
        const pData = await pRes.json();
        const seen = new Set<string>();
        setPrincipalRemarks(
          pData.filter((r: Remark) => {
            const key = r.remark.trim().toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
        );
      }
    } catch {
      toast.error("Failed to load remarks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentPage === "remarks") fetchRemarks();
  }, [currentPage, fetchRemarks]);

  const openAddDialog = () => {
    setEditingId(null);
    setRemarkText("");
    setDialogOpen(true);
  };

  const openEditDialog = (remark: Remark) => {
    setEditingId(remark.id);
    setRemarkText(remark.remark);
    setDialogOpen(true);
  };

  const openDeleteDialog = (id: string) => {
    setDeletingId(id);
    setDeleteOpen(true);
  };

  const handleSubmit = async () => {
    if (!remarkText.trim()) {
      toast.error("Remark text is required");
      return;
    }
    try {
      if (editingId) {
        const res = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: apiType,
            id: editingId,
            remark: remarkText.trim(),
          }),
        });
        if (!res.ok) throw new Error("Update failed");
        toast.success("Remark updated");
      } else {
        const res = await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: apiType, remark: remarkText.trim() }),
        });
        if (!res.ok) throw new Error("Create failed");
        toast.success("Remark added");
      }
      setDialogOpen(false);
      fetchRemarks();
    } catch {
      toast.error("Failed to save remark");
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const res = await fetch(
        `/api/settings?id=${deletingId}&type=${apiType}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Remark deleted");
      setDeleteOpen(false);
      setDeletingId(null);
      fetchRemarks();
    } catch {
      toast.error("Failed to delete remark");
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        <h2 className="text-lg font-semibold md:text-xl">Remarks Management</h2>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as RemarkTab)}
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="teacher">Teacher Remarks</TabsTrigger>
          <TabsTrigger value="principal">Principal Remarks</TabsTrigger>
        </TabsList>

        <TabsContent value="teacher" className="mt-4 space-y-4">
          <RemarkList
            remarks={teacherRemarks}
            loading={loading}
            onAdd={openAddDialog}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
          />
        </TabsContent>

        <TabsContent value="principal" className="mt-4 space-y-4">
          <RemarkList
            remarks={principalRemarks}
            loading={loading}
            onAdd={openAddDialog}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
          />
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Remark" : "Add Remark"}{" "}
              <span className="text-muted-foreground">
                ({activeTab === "teacher" ? "Teacher" : "Principal"})
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="grid gap-2">
              <Label htmlFor="remark">Remark Text</Label>
              <Textarea
                id="remark"
                placeholder="Enter remark text..."
                rows={4}
                value={remarkText}
                onChange={(e) => setRemarkText(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingId ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Remark</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this remark? This action cannot be
              undone.
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

function RemarkList({
  remarks,
  loading,
  onAdd,
  onEdit,
  onDelete,
}: {
  remarks: Remark[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (r: Remark) => void;
  onDelete: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <>
      <Button onClick={onAdd} size="sm" className="gap-2">
        <Plus className="h-4 w-4" />
        Add Remark
      </Button>
      {remarks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <MessageSquare className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No remarks yet.</p>
            <p className="text-sm text-muted-foreground/70">
              Click &quot;Add Remark&quot; to create one.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {remarks.map((remark) => (
            <Card key={remark.id}>
              <CardContent className="flex items-start justify-between gap-4 p-4">
                <p className="flex-1 text-sm leading-relaxed">
                  {remark.remark}
                </p>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEdit(remark)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => onDelete(remark.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}