"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/store/index";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Users,
  Loader2,
  Save,
  Link2,
  X,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CredentialsDialog } from "@/components/ui/credentials-dialog";

interface StudentItem {
  id: string;
  fullname: string;
  regNo: string;
  class: string;
}

interface Parent {
  id: string;
  fullname: string;
  email: string;
  phone: string;
  address: string;
  occupation: string;
  studentCount: number;
  studentIds: string[];
  students: StudentItem[];
}

// Skeleton row for loading state
function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-5 w-8" />
          <Skeleton className="h-5 flex-1" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}

// Student multi-select component
function StudentMultiSelect({
  availableStudents,
  selectedIds,
  onToggle,
  loading,
}: {
  availableStudents: StudentItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  loading: boolean;
}) {
  const [search, setSearch] = useState("");

  const filtered = search
    ? availableStudents.filter(
        (s) =>
          s.fullname.toLowerCase().includes(search.toLowerCase()) ||
          s.regNo.toLowerCase().includes(search.toLowerCase()) ||
          s.class.toLowerCase().includes(search.toLowerCase())
      )
    : availableStudents;

  return (
    <div className="space-y-2">
      <Label>Link Students</Label>
      <Input
        placeholder="Search students by name, reg no, or class..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="text-sm"
      />
      {loading ? (
        <div className="space-y-2 py-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-3 text-center text-sm text-muted-foreground">
          No students found
        </p>
      ) : (
        <ScrollArea className="max-h-48 rounded-md border">
          <div className="p-2 space-y-1">
            {filtered.map((student) => (
              <label
                key={student.id}
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={selectedIds.includes(student.id)}
                  onCheckedChange={() => onToggle(student.id)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {student.fullname}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {student.regNo} &middot; {student.class}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </ScrollArea>
      )}
      {selectedIds.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {selectedIds.length} student{selectedIds.length !== 1 ? "s" : ""}{" "}
          linked
        </p>
      )}
    </div>
  );
}

// Shared form component for Add/Edit
interface ParentFormProps {
  fullname: string;
  setFullname: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  occupation: string;
  setOccupation: (v: string) => void;
  availableStudents: StudentItem[];
  selectedStudentIds: string[];
  onToggleStudent: (id: string) => void;
  loadingStudents: boolean;
}

function ParentForm({
  fullname,
  setFullname,
  email,
  setEmail,
  phone,
  setPhone,
  address,
  setAddress,
  occupation,
  setOccupation,
  availableStudents,
  selectedStudentIds,
  onToggleStudent,
  loadingStudents,
}: ParentFormProps) {
  return (
    <div className="space-y-4">
      {/* Fullname & Email */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="parent-fullname">
            Fullname <span className="text-destructive">*</span>
          </Label>
          <Input
            id="parent-fullname"
            placeholder="Enter parent's full name"
            value={fullname}
            onChange={(e) => setFullname(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="parent-email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="parent-email"
            type="email"
            placeholder="e.g. parent@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      {/* Phone & Occupation */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="parent-phone">Phone</Label>
          <Input
            id="parent-phone"
            type="tel"
            placeholder="e.g. 08012345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="parent-occupation">Occupation</Label>
          <Input
            id="parent-occupation"
            placeholder="e.g. Businesswoman"
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
          />
        </div>
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="parent-address">Address</Label>
        <Textarea
          id="parent-address"
          placeholder="Enter parent's address"
          rows={3}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      {/* Student Linking */}
      <StudentMultiSelect
        availableStudents={availableStudents}
        selectedIds={selectedStudentIds}
        onToggle={onToggleStudent}
        loading={loadingStudents}
      />
    </div>
  );
}

export default function ParentListView() {
  const navigate = useAppStore((s) => s.navigate);

  // Data state
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Available students for linking
  const [availableStudents, setAvailableStudents] = useState<StudentItem[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  // Add dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);

  // Add form state
  const [addFullname, setAddFullname] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addAddress, setAddAddress] = useState("");
  const [addOccupation, setAddOccupation] = useState("");
  const [addSelectedStudentIds, setAddSelectedStudentIds] = useState<string[]>(
    []
  );

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Edit form state
  const [editFullname, setEditFullname] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editOccupation, setEditOccupation] = useState("");
  const [editSelectedStudentIds, setEditSelectedStudentIds] = useState<
    string[]
  >([]);

  // Delete dialog state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Credentials dialog state
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [credRole, setCredRole] = useState<"Student" | "Teacher" | "Parent">(
    "Parent"
  );
  const [credLoginId, setCredLoginId] = useState("");
  const [credPassword, setCredPassword] = useState("");
  const [credUserName, setCredUserName] = useState("");

  // Fetch students for linking
  const fetchStudents = useCallback(async () => {
    setLoadingStudents(true);
    try {
      const res = await fetch("/api/students");
      if (res.ok) {
        const data = await res.json();
        const students: StudentItem[] = (Array.isArray(data)
          ? data
          : data?.data || []
        ).map((s: Record<string, string>) => ({
          id: s.id,
          fullname: s.fullname,
          regNo: s.regNo,
          class: s.class,
        }));
        setAvailableStudents(students);
      }
    } catch {
      // silent fail
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  // Fetch parents
  const fetchParents = useCallback(async () => {
    setLoading(true);
    try {
      const url = search
        ? `/api/parents?q=${encodeURIComponent(search)}`
        : "/api/parents";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setParents(Array.isArray(data?.data) ? data.data : []);
      } else {
        toast.error("Failed to fetch parents");
      }
    } catch {
      toast.error("Network error while fetching parents");
    } finally {
      setLoading(false);
    }
  }, [search]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch on mount and search change
  useEffect(() => {
    fetchParents();
    fetchStudents();
  }, [fetchParents, fetchStudents]);

  // Reset add form
  function resetAddForm() {
    setAddFullname("");
    setAddEmail("");
    setAddPhone("");
    setAddAddress("");
    setAddOccupation("");
    setAddSelectedStudentIds([]);
  }

  // Open edit dialog
  function openEdit(parent: Parent) {
    setSelectedParent(parent);
    setEditFullname(parent.fullname);
    setEditEmail(parent.email);
    setEditPhone(parent.phone);
    setEditAddress(parent.address);
    setEditOccupation(parent.occupation);
    setEditSelectedStudentIds(parent.studentIds || []);
    setEditOpen(true);
  }

  // Toggle student selection
  function toggleAddStudent(id: string) {
    setAddSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function toggleEditStudent(id: string) {
    setEditSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  // Handle add submit
  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!addFullname.trim()) {
      toast.error("Fullname is required");
      return;
    }
    if (!addEmail.trim()) {
      toast.error("Email is required");
      return;
    }

    setAddSaving(true);
    try {
      const res = await fetch("/api/parents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullname: addFullname.trim(),
          email: addEmail.trim(),
          phone: addPhone.trim(),
          address: addAddress.trim(),
          occupation: addOccupation.trim(),
          studentIds: addSelectedStudentIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to add parent");
        return;
      }

      toast.success("Parent added successfully!");
      setAddOpen(false);

      // Show credentials dialog
      const creds = data.data?.credentials;
      if (creds) {
        setCredRole("Parent");
        setCredLoginId(creds.loginId);
        setCredPassword(creds.defaultPassword);
        setCredUserName(addFullname.trim());
        setCredentialsOpen(true);
      }

      resetAddForm();
      fetchParents();
    } catch {
      toast.error("An error occurred while adding the parent");
    } finally {
      setAddSaving(false);
    }
  }

  // Handle edit submit
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedParent) return;

    if (!editFullname.trim()) {
      toast.error("Fullname is required");
      return;
    }

    setEditSaving(true);
    try {
      const res = await fetch("/api/parents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedParent.id,
          fullname: editFullname.trim(),
          email: editEmail.trim(),
          phone: editPhone.trim(),
          address: editAddress.trim(),
          occupation: editOccupation.trim(),
          studentIds: editSelectedStudentIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to update parent");
        return;
      }

      toast.success("Parent updated successfully!");
      setEditOpen(false);
      fetchParents();
    } catch {
      toast.error("An error occurred while updating the parent");
    } finally {
      setEditSaving(false);
    }
  }

  // Handle delete
  async function handleDelete() {
    if (!deleteId) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/parents?id=${encodeURIComponent(deleteId)}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Failed to delete parent");
        return;
      }

      toast.success("Parent deleted successfully!");
      setDeleteOpen(false);
      setDeleteId(null);
      fetchParents();
    } catch {
      toast.error("An error occurred while deleting the parent");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            Parent Management
          </h1>
          {!loading && parents.length > 0 && (
            <Badge variant="secondary">{parents.length}</Badge>
          )}
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="size-4" />
          Add Parent
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search parents..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <Card>
          <CardContent className="p-6">
            <TableSkeleton rows={6} />
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && parents.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted">
              <Users className="size-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">No parents found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {search
                  ? "No parents match your search. Try a different keyword."
                  : "Get started by adding your first parent."}
              </p>
            </div>
            {!search && (
              <Button onClick={() => setAddOpen(true)} className="gap-2">
                <Plus className="size-4" />
                Add Parent
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Desktop Table */}
      {!loading && parents.length > 0 && (
        <>
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Fullname</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Occupation</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead className="w-28 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parents.map((parent, index) => (
                    <TableRow key={parent.id}>
                      <TableCell className="font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {parent.fullname}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {parent.email || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {parent.phone || "—"}
                      </TableCell>
                      <TableCell>{parent.occupation || "—"}</TableCell>
                      <TableCell>
                        {parent.studentCount > 0 ? (
                          <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100">
                            <Link2 className="mr-1 size-3" />
                            {parent.studentCount} linked
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            None
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => openEdit(parent)}
                            title="Edit parent"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <AlertDialog
                            open={deleteOpen && deleteId === parent.id}
                            onOpenChange={(open) => {
                              setDeleteOpen(open);
                              if (open) setDeleteId(parent.id);
                            }}
                          >
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-destructive hover:text-destructive"
                                title="Delete parent"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Parent</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete{" "}
                                  <span className="font-semibold">
                                    {parent.fullname}
                                  </span>
                                  ? This will also remove their student links.
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={deleting}>
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={handleDelete}
                                  disabled={deleting}
                                  className="bg-destructive text-white hover:bg-destructive/90"
                                >
                                  {deleting && (
                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                  )}
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile: Card view */}
          <div className="space-y-3 md:hidden">
            {parents.map((parent, index) => (
              <Card key={parent.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          #{index + 1}
                        </span>
                        {parent.studentCount > 0 ? (
                          <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100">
                            <Link2 className="mr-1 size-3" />
                            {parent.studentCount}
                          </Badge>
                        ) : null}
                      </div>
                      <h3 className="mt-1 truncate font-semibold">
                        {parent.fullname}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {parent.email}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => openEdit(parent)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <AlertDialog
                        open={deleteOpen && deleteId === parent.id}
                        onOpenChange={(open) => {
                          setDeleteOpen(open);
                          if (open) setDeleteId(parent.id);
                        }}
                      >
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Parent</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete{" "}
                              <span className="font-semibold">
                                {parent.fullname}
                              </span>
                              ? This will also remove their student links.
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={deleting}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDelete}
                              disabled={deleting}
                              className="bg-destructive text-white hover:bg-destructive/90"
                            >
                              {deleting && (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                              )}
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {parent.phone && <span>Phone: {parent.phone}</span>}
                    {parent.occupation && (
                      <span>Job: {parent.occupation}</span>
                    )}
                  </div>
                  {/* Show linked students on mobile */}
                  {parent.students && parent.students.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {parent.students.map((student) => (
                        <Badge
                          key={student.id}
                          variant="secondary"
                          className="text-xs"
                        >
                          {student.fullname} ({student.regNo})
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Add Parent Dialog */}
      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) resetAddForm();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Parent</DialogTitle>
            <DialogDescription>
              Fill in the details below to register a new parent. You can link
              students to this parent.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit}>
            <ParentForm
              fullname={addFullname}
              setFullname={setAddFullname}
              email={addEmail}
              setEmail={setAddEmail}
              phone={addPhone}
              setPhone={setAddPhone}
              address={addAddress}
              setAddress={setAddAddress}
              occupation={addOccupation}
              setOccupation={setAddOccupation}
              availableStudents={availableStudents}
              selectedStudentIds={addSelectedStudentIds}
              onToggleStudent={toggleAddStudent}
              loadingStudents={loadingStudents}
            />
            <DialogFooter className="mt-6 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAddOpen(false);
                  resetAddForm();
                }}
                disabled={addSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addSaving}>
                {addSaving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 size-4" />
                    Add Parent
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Parent Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Parent</DialogTitle>
            <DialogDescription>
              Update the parent&apos;s information and student links below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <ParentForm
              fullname={editFullname}
              setFullname={setEditFullname}
              email={editEmail}
              setEmail={setEditEmail}
              phone={editPhone}
              setPhone={setEditPhone}
              address={editAddress}
              setAddress={setEditAddress}
              occupation={editOccupation}
              setOccupation={setEditOccupation}
              availableStudents={availableStudents}
              selectedStudentIds={editSelectedStudentIds}
              onToggleStudent={toggleEditStudent}
              loadingStudents={loadingStudents}
            />
            <DialogFooter className="mt-6 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={editSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editSaving}>
                {editSaving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 size-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Credentials Dialog */}
      <CredentialsDialog
        open={credentialsOpen}
        onOpenChange={setCredentialsOpen}
        role={credRole}
        loginId={credLoginId}
        defaultPassword={credPassword}
        userName={credUserName}
      />
    </div>
  );
}
