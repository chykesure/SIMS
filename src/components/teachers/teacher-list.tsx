"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/store/index";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, GraduationCap, Loader2, Save } from "lucide-react";

import { CredentialsDialog } from "@/components/ui/credentials-dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Teacher {
  id: string;
  fullname: string;
  subject: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  active: string;
  imageUrl: string;
}

// Skeleton row for loading state
function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-5 w-8" />
          <Skeleton className="h-5 flex-1" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}

// Shared form component for Add/Edit
interface TeacherFormProps {
  fullname: string;
  setFullname: (v: string) => void;
  subject: string;
  setSubject: (v: string) => void;
  gender: string;
  setGender: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  isActive: boolean;
  setIsActive: (v: boolean) => void;
}

function TeacherForm({
  fullname,
  setFullname,
  subject,
  setSubject,
  gender,
  setGender,
  phone,
  setPhone,
  email,
  setEmail,
  address,
  setAddress,
  isActive,
  setIsActive,
}: TeacherFormProps) {
  return (
    <div className="space-y-4">
      {/* Name & Subject */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="teacher-fullname">
            Fullname <span className="text-destructive">*</span>
          </Label>
          <Input
            id="teacher-fullname"
            placeholder="Enter teacher's full name"
            value={fullname}
            onChange={(e) => setFullname(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="teacher-subject">Subject</Label>
          <Input
            id="teacher-subject"
            placeholder="e.g. Mathematics"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
      </div>

      {/* Gender & Phone */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="teacher-gender">Gender</Label>
          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="teacher-phone">Phone</Label>
          <Input
            id="teacher-phone"
            type="tel"
            placeholder="e.g. 08012345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="teacher-email">Email</Label>
        <Input
          id="teacher-email"
          type="email"
          placeholder="e.g. teacher@school.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="teacher-address">Address</Label>
        <Textarea
          id="teacher-address"
          placeholder="Enter teacher's address"
          rows={3}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      {/* Active Toggle */}
      <div className="flex items-center gap-3">
        <Switch
          id="teacher-active"
          checked={isActive}
          onCheckedChange={setIsActive}
        />
        <Label htmlFor="teacher-active" className="cursor-pointer">
          {isActive ? "Active" : "Inactive"}
        </Label>
      </div>
    </div>
  );
}

export default function TeacherListView() {
  const navigate = useAppStore((s) => s.navigate);

  // Data state
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Add dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);

  // Add form state
  const [addFullname, setAddFullname] = useState("");
  const [addSubject, setAddSubject] = useState("");
  const [addGender, setAddGender] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addAddress, setAddAddress] = useState("");
  const [addIsActive, setAddIsActive] = useState(true);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Edit form state
  const [editFullname, setEditFullname] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  // Delete dialog state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Credentials dialog state
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [credLoginId, setCredLoginId] = useState("");
  const [credPassword, setCredPassword] = useState("");
  const [credUserName, setCredUserName] = useState("");

  // Fetch teachers
  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const url = search
        ? `/api/teachers?q=${encodeURIComponent(search)}`
        : "/api/teachers";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTeachers(Array.isArray(data?.data) ? data.data : []);
      } else {
        toast.error("Failed to fetch teachers");
      }
    } catch {
      toast.error("Network error while fetching teachers");
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
    fetchTeachers();
  }, [fetchTeachers]);

  // Reset add form
  function resetAddForm() {
    setAddFullname("");
    setAddSubject("");
    setAddGender("");
    setAddPhone("");
    setAddEmail("");
    setAddAddress("");
    setAddIsActive(true);
  }

  // Open edit dialog
  function openEdit(teacher: Teacher) {
    setSelectedTeacher(teacher);
    setEditFullname(teacher.fullname);
    setEditSubject(teacher.subject);
    setEditGender(teacher.gender);
    setEditPhone(teacher.phone);
    setEditEmail(teacher.email);
    setEditAddress(teacher.address);
    setEditIsActive(teacher.active === "Yes");
    setEditOpen(true);
  }

  // Handle add submit
  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!addFullname.trim()) {
      toast.error("Fullname is required");
      return;
    }

    setAddSaving(true);
    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullname: addFullname.trim(),
          subject: addSubject.trim(),
          gender: addGender,
          phone: addPhone.trim(),
          email: addEmail.trim(),
          address: addAddress.trim(),
          active: addIsActive ? "Yes" : "No",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to add teacher");
        return;
      }

      toast.success("Teacher added successfully!");
      setAddOpen(false);

      // Show credentials dialog
      const creds = data.data?.credentials || data.credentials;
      if (creds) {
        setCredLoginId(creds.loginId);
        setCredPassword(creds.defaultPassword);
        setCredUserName(addFullname.trim());
        setCredentialsOpen(true);
      }

      resetAddForm();
      fetchTeachers();
    } catch {
      toast.error("An error occurred while adding the teacher");
    } finally {
      setAddSaving(false);
    }
  }

  // Handle edit submit
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTeacher) return;

    if (!editFullname.trim()) {
      toast.error("Fullname is required");
      return;
    }

    setEditSaving(true);
    try {
      const res = await fetch("/api/teachers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedTeacher.id,
          fullname: editFullname.trim(),
          subject: editSubject.trim(),
          gender: editGender,
          phone: editPhone.trim(),
          email: editEmail.trim(),
          address: editAddress.trim(),
          active: editIsActive ? "Yes" : "No",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to update teacher");
        return;
      }

      toast.success("Teacher updated successfully!");
      setEditOpen(false);
      fetchTeachers();
    } catch {
      toast.error("An error occurred while updating the teacher");
    } finally {
      setEditSaving(false);
    }
  }

  // Handle delete
  async function handleDelete() {
    if (!deleteId) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/teachers?id=${encodeURIComponent(deleteId)}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Failed to delete teacher");
        return;
      }

      toast.success("Teacher deleted successfully!");
      setDeleteOpen(false);
      setDeleteId(null);
      fetchTeachers();
    } catch {
      toast.error("An error occurred while deleting the teacher");
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
            Teacher Management
          </h1>
          {!loading && teachers.length > 0 && (
            <Badge variant="secondary">{teachers.length}</Badge>
          )}
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="size-4" />
          Add Teacher
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search teachers..."
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
      {!loading && teachers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted">
              <GraduationCap className="size-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">No teachers found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {search
                  ? "No teachers match your search. Try a different keyword."
                  : "Get started by adding your first teacher."}
              </p>
            </div>
            {!search && (
              <Button onClick={() => setAddOpen(true)} className="gap-2">
                <Plus className="size-4" />
                Add Teacher
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Desktop Table */}
      {!loading && teachers.length > 0 && (
        <>
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Fullname</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-28 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((teacher, index) => (
                    <TableRow key={teacher.id}>
                      <TableCell className="font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {teacher.fullname}
                      </TableCell>
                      <TableCell>{teacher.subject || "—"}</TableCell>
                      <TableCell>{teacher.gender || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {teacher.phone || "—"}
                      </TableCell>
                      <TableCell>
                        {teacher.active === "Yes" ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => openEdit(teacher)}
                            title="Edit teacher"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <AlertDialog
                            open={deleteOpen && deleteId === teacher.id}
                            onOpenChange={(open) => {
                              setDeleteOpen(open);
                              if (open) setDeleteId(teacher.id);
                            }}
                          >
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-destructive hover:text-destructive"
                                title="Delete teacher"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Teacher</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete{" "}
                                  <span className="font-semibold">
                                    {teacher.fullname}
                                  </span>
                                  ? This action cannot be undone.
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
            {teachers.map((teacher, index) => (
              <Card key={teacher.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          #{index + 1}
                        </span>
                        {teacher.active === "Yes" ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <h3 className="mt-1 truncate font-semibold">
                        {teacher.fullname}
                      </h3>
                      {teacher.subject && (
                        <p className="text-sm text-muted-foreground">
                          {teacher.subject}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => openEdit(teacher)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <AlertDialog
                        open={deleteOpen && deleteId === teacher.id}
                        onOpenChange={(open) => {
                          setDeleteOpen(open);
                          if (open) setDeleteId(teacher.id);
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
                            <AlertDialogTitle>Delete Teacher</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete{" "}
                              <span className="font-semibold">
                                {teacher.fullname}
                              </span>
                              ? This action cannot be undone.
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
                    {teacher.gender && <span>Gender: {teacher.gender}</span>}
                    {teacher.phone && <span>Phone: {teacher.phone}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Add Teacher Dialog */}
      <Dialog open={addOpen} onOpenChange={(open) => {
        setAddOpen(open);
        if (!open) resetAddForm();
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Teacher</DialogTitle>
            <DialogDescription>
              Fill in the details below to register a new teacher.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit}>
            <TeacherForm
              fullname={addFullname}
              setFullname={setAddFullname}
              subject={addSubject}
              setSubject={setAddSubject}
              gender={addGender}
              setGender={setAddGender}
              phone={addPhone}
              setPhone={setAddPhone}
              email={addEmail}
              setEmail={setAddEmail}
              address={addAddress}
              setAddress={setAddAddress}
              isActive={addIsActive}
              setIsActive={setAddIsActive}
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
                    Add Teacher
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Teacher Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Teacher</DialogTitle>
            <DialogDescription>
              Update the teacher&apos;s information below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <TeacherForm
              fullname={editFullname}
              setFullname={setEditFullname}
              subject={editSubject}
              setSubject={setEditSubject}
              gender={editGender}
              setGender={setEditGender}
              phone={editPhone}
              setPhone={setEditPhone}
              email={editEmail}
              setEmail={setEditEmail}
              address={editAddress}
              setAddress={setEditAddress}
              isActive={editIsActive}
              setIsActive={setEditIsActive}
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
        role="Teacher"
        loginId={credLoginId}
        defaultPassword={credPassword}
        userName={credUserName}
      />
    </div>
  );
}
