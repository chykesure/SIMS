"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  Upload,
  Camera,
  X,
  Download,
  Filter,
  UserCircle,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  Building2,
  BookOpen,
  Home,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  KeyRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Student {
  id: string;
  regNo: string;
  fullname: string;
  gender: string;
  dateOfBirth: string;
  class: string;
  classRef: string;
  basic: string;
  department: string;
  parentNo: string;
  stateOfOrigin: string;
  lga: string;
  homeAddress: string;
  imageUrl: string;
}

interface ClassItem {
  id: string;
  title: string;
}

interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  skipped: number;
  errors: string[];
  students: Student[];
}

const BASIC_OPTIONS = ["None", "Basic7", "Basic8", "Basic9"];
const DEPARTMENT_OPTIONS = ["None", "Science", "Art", "Commerce"];

// Skeleton row for loading state
function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-5 w-8" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 flex-1" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}

export default function StudentListView() {
  const navigate = useAppStore((s) => s.navigate);
  const { user, tenant } = useAppStore();
  const tenantId = user?.tenantId || tenant?.id || '';

  // Data state
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Filter state
  const [classFilter, setClassFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState<"all" | "Male" | "Female">("all");

  // Fix logins state
  const [fixingLogins, setFixingLogins] = useState(false);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Edit form state
  const [editFullname, setEditFullname] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editDateOfBirth, setEditDateOfBirth] = useState("");
  const [editClass, setEditClass] = useState("");
  const [editClassRef, setEditClassRef] = useState("");
  const [editBasic, setEditBasic] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editParentNo, setEditParentNo] = useState("");
  const [editStateOfOrigin, setEditStateOfOrigin] = useState("");
  const [editLga, setEditLga] = useState("");
  const [editHomeAddress, setEditHomeAddress] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editUploading, setEditUploading] = useState(false);

  // Delete dialog state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Detail sheet state
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Classes for dropdown
  const [classes, setClasses] = useState<ClassItem[]>([]);

  // Import dialog state
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importDragOver, setImportDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete all students dialog state
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteAllConfirmText, setDeleteAllConfirmText] = useState("");
  const [deletingAll, setDeletingAll] = useState(false);

  // Client-side filtered students (gender filter applied on top of server results)
  const filteredStudents = useMemo(() => {
    if (genderFilter === "all") return students;
    return students.filter((s) => s.gender === genderFilter);
  }, [students, genderFilter]);

  // Stats computed from filtered students
  const stats = useMemo(() => {
    const total = filteredStudents.length;
    const maleCount = filteredStudents.filter((s) => s.gender === "Male").length;
    const femaleCount = filteredStudents.filter((s) => s.gender === "Female").length;
    const uniqueClasses = new Set(filteredStudents.map((s) => s.class)).size;
    return { total, maleCount, femaleCount, uniqueClasses };
  }, [filteredStudents]);

  // Check if any filters are active
  const hasActiveFilters = search || classFilter !== "all" || genderFilter !== "all";

  // Fetch students
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (classFilter && classFilter !== "all") params.set("class", classFilter);

      const url = params.toString()
        ? `/api/students?${params.toString()}`
        : "/api/students";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setStudents(Array.isArray(data) ? data : []);
      } else {
        toast.error("Failed to fetch students");
      }
    } catch {
      toast.error("Network error while fetching students");
    } finally {
      setLoading(false);
    }
  }, [search, classFilter]);

  // Fetch classes for dropdown
  useEffect(() => {
    async function fetchClasses() {
      try {
        const res = await fetch("/api/classes");
        if (res.ok) {
          const data = await res.json();
          setClasses(Array.isArray(data) ? data : []);
        }
      } catch {
        // silently fail
      }
    }
    fetchClasses();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch students on mount and when search/class filter changes
  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Clear all filters
  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setClassFilter("all");
    setGenderFilter("all");
  }

  const handleFixLogins = async () => {
    setFixingLogins(true);
    try {
      const res = await fetch("/api/students/fix-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (data.success) {
        if (data.created > 0) {
          toast.success(
            `Created ${data.created} login accounts. Students can now log in with their registration number (lowercase) as password.`
          );
        } else {
          toast.info("All students already have login accounts.");
        }
      } else {
        toast.error(data.message || "Failed to fix logins");
      }
    } catch {
      toast.error("Failed to fix logins. Please try again.");
    } finally {
      setFixingLogins(false);
    }
  };

  // Open edit dialog
  function openEdit(student: Student) {
    setSelectedStudent(student);
    setEditFullname(student.fullname);
    setEditGender(student.gender);
    setEditDateOfBirth(student.dateOfBirth);
    setEditClass(student.class);
    setEditClassRef(student.classRef);
    setEditBasic(student.basic);
    setEditDepartment(student.department);
    setEditParentNo(student.parentNo);
    setEditStateOfOrigin(student.stateOfOrigin);
    setEditLga(student.lga);
    setEditHomeAddress(student.homeAddress);
    setEditImageUrl(student.imageUrl);
    setEditOpen(true);
  }

  // Open detail sheet
  function openDetail(student: Student) {
    setDetailStudent(student);
    setDetailOpen(true);
  }

  // Handle edit photo upload
  async function handleEditPhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only image files are allowed (JPEG, PNG, GIF, WebP)");
      return;
    }

    setEditUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Upload failed");
        return;
      }
      setEditImageUrl(data.url);
      toast.success("Photo uploaded successfully!");
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setEditUploading(false);
      e.target.value = "";
    }
  }

  // Handle edit submit
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudent) return;

    if (!editFullname.trim()) {
      toast.error("Fullname is required");
      return;
    }

    setEditSaving(true);
    try {
      const res = await fetch("/api/students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedStudent.id,
          fullname: editFullname.trim(),
          gender: editGender,
          dateOfBirth: editDateOfBirth,
          class: editClass,
          basic: editBasic,
          department: editDepartment,
          parentNo: editParentNo.trim(),
          stateOfOrigin: editStateOfOrigin.trim(),
          lga: editLga.trim(),
          homeAddress: editHomeAddress.trim(),
          imageUrl: editImageUrl.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to update student");
        return;
      }

      toast.success("Student updated successfully!");
      setEditOpen(false);
      setDetailOpen(false);
      fetchStudents();
    } catch {
      toast.error("An error occurred while updating the student");
    } finally {
      setEditSaving(false);
    }
  }

  // Handle delete
  async function handleDelete() {
    if (!deleteId) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/students?id=${encodeURIComponent(deleteId)}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Failed to delete student");
        return;
      }

      toast.success("Student deleted successfully!");
      setDeleteOpen(false);
      setDeleteId(null);
      setDetailOpen(false);
      fetchStudents();
    } catch {
      toast.error("An error occurred while deleting the student");
    } finally {
      setDeleting(false);
    }
  }

  // Export CSV
  function exportCSV() {
    if (filteredStudents.length === 0) {
      toast.error("No students to export");
      return;
    }

    const headers = ["S/N", "Reg No", "Fullname", "Gender", "Class", "Basic", "Department", "Parent Phone"];
    const rows = filteredStudents.map((s, i) => [
      i + 1,
      s.regNo,
      s.fullname,
      s.gender || "",
      s.class,
      s.basic || "",
      s.department || "",
      s.parentNo || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `students_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredStudents.length} students to CSV`);
  }

  // Handle delete from detail sheet
  function handleDetailDelete(student: Student) {
    setDetailOpen(false);
    setDeleteId(student.id);
    setDeleteOpen(true);
  }

  // Handle edit from detail sheet
  function handleDetailEdit(student: Student) {
    setDetailOpen(false);
    openEdit(student);
  }

  // Build active filter description for empty state
  function getFilterDescription() {
    const parts: string[] = [];
    if (search) parts.push(`search "${search}"`);
    if (classFilter !== "all") parts.push(`class "${classFilter}"`);
    if (genderFilter !== "all") parts.push(`gender "${genderFilter}"`);
    return parts.length > 0 ? parts.join(" and ") : "";
  }

  // Download CSV import template
  function downloadTemplate() {
    const headers = [
      "Fullname", "Gender", "DateOfBirth", "Class", "Basic",
      "Department", "ParentPhone", "StateOfOrigin", "LGA", "HomeAddress",
    ];
    const sampleRows = [
      [
        "John Doe", "Male", "2010-05-15", "JSS 1", "Basic7",
        "Science", "08012345678", "Lagos", "Ikeja", "12 Main Street",
      ],
      [
        "Jane Smith", "Female", "2009-08-22", "JSS 2", "Basic8",
        "Art", "08098765432", "Abuja", "Garki", "45 Park Avenue",
      ],
    ];
    const csvContent = [
      headers.join(","),
      ...sampleRows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "student_import_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Template downloaded successfully!");
  }

  // Handle file selection for import
  function handleFileSelect(file: File | undefined) {
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      toast.error("Please select a CSV file");
      return;
    }
    setImportFile(file);
    setImportResult(null);
  }

  // Handle drag events
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setImportDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setImportDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setImportDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  }

  // Execute CSV import
  async function handleImport() {
    if (!importFile) {
      toast.error("Please select a CSV file");
      return;
    }

    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", importFile);

      const res = await fetch("/api/students/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Import failed");
        return;
      }

      setImportResult(data);

      if (data.imported > 0) {
        toast.success(`Successfully imported ${data.imported} student${data.imported !== 1 ? "s" : ""}`);
        fetchStudents();
      }
      if (data.failed > 0) {
        toast.warning(`${data.failed} row${data.failed !== 1 ? "s" : ""} failed`);
      }
      if (data.skipped > 0) {
        toast.info(`${data.skipped} duplicate${data.skipped !== 1 ? "s" : ""} skipped`);
      }
    } catch {
      toast.error("An error occurred during import");
    } finally {
      setImporting(false);
    }
  }

  // Handle delete all students
  async function handleDeleteAll() {
    if (deleteAllConfirmText !== "DELETE ALL") return;

    setDeletingAll(true);
    try {
      const res = await fetch('/api/students/clear?all=true', {
        method: 'DELETE',
        headers: { 'x-tenant-id': tenantId },
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Successfully deleted ${data.deletedCount} student(s)`);
        setDeleteAllOpen(false);
        setDeleteAllConfirmText("");
        fetchStudents();
      } else {
        toast.error(data.message || 'Failed to delete students');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setDeletingAll(false);
    }
  }

  // Reset import dialog state
  function resetImportDialog() {
    setImportFile(null);
    setImportResult(null);
    setImporting(false);
    setImportDragOver(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Student List</h1>
          {!loading && filteredStudents.length > 0 && (
            <Badge variant="secondary">{filteredStudents.length}</Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              resetImportDialog();
              setImportOpen(true);
            }}
            className="gap-2"
          >
            <FileSpreadsheet className="size-4" />
            <span className="hidden sm:inline">Import CSV</span>
          </Button>
          {!loading && filteredStudents.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              className="gap-2"
            >
              <Download className="size-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          )}
          <Button onClick={() => navigate("student-add")} className="gap-2">
            <Plus className="size-4" />
            Add Student
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleFixLogins}
            disabled={fixingLogins}
            className="gap-2 border-amber-500 text-amber-700 hover:bg-amber-50 hover:text-amber-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <KeyRound className="size-4" />
            {fixingLogins ? "Fixing..." : "Fix Logins"}
          </Button>

          {/* Delete All Students — Custom Confirmation */}
          <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                className="gap-2 bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="size-4" />
                Delete All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="sm:max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="size-5" />
                  Delete All Students
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-3 pt-2">
                  <p className="text-sm">
                    This will <strong>permanently delete ALL students</strong> in your school.
                    This action cannot be undone.
                  </p>
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">
                      All student records, scores, and data will be lost forever.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delete-all-confirm" className="text-sm font-medium">
                      Type <span className="font-bold text-red-600">DELETE ALL</span> to confirm:
                    </Label>
                    <Input
                      id="delete-all-confirm"
                      placeholder="Type DELETE ALL here"
                      value={deleteAllConfirmText}
                      onChange={(e) => setDeleteAllConfirmText(e.target.value)}
                      className="border-red-200 focus:border-red-400 focus:ring-red-400"
                    />
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel
                  onClick={() => {
                    setDeleteAllOpen(false);
                    setDeleteAllConfirmText("");
                    setDeletingAll(false);
                  }}
                  disabled={deletingAll}
                >
                  Cancel
                </AlertDialogCancel>
                <Button
                  onClick={handleDeleteAll}
                  disabled={deletingAll || deleteAllConfirmText !== "DELETE ALL"}
                  className="gap-2 bg-red-600 hover:bg-red-700 text-white"
                >
                  {deletingAll ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="size-4" />
                      Delete All Students
                    </>
                  )}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Filter Row: Class + Gender + Search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          {/* Class Filter */}
          <div className="w-full sm:w-48 shrink-0">
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 shrink-0 text-muted-foreground" />
                  <SelectValue placeholder="All Classes" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.title}>
                    {cls.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Gender Toggle */}
          <div className="flex items-center rounded-lg border bg-muted/50 p-0.5">
            {(["all", "Male", "Female"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGenderFilter(g)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${genderFilter === g
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {g === "all" ? "All" : g}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Stats Row */}
        {!loading && filteredStudents.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Users className="size-3.5" />
              <span>
                <span className="font-medium text-foreground">{stats.total}</span> student{stats.total !== 1 ? "s" : ""}
              </span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1.5">
              <Building2 className="size-3.5" />
              <span>
                <span className="font-medium text-foreground">{stats.uniqueClasses}</span> class{stats.uniqueClasses !== 1 ? "es" : ""}
              </span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              <span>
                <span className="font-medium text-foreground">{stats.maleCount}</span> Male
              </span>
              <span className="text-muted-foreground/50">/</span>
              <span>
                <span className="font-medium text-foreground">{stats.femaleCount}</span> Female
              </span>
            </div>
          </div>
        )}

        {/* Clear Filters button */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
              Clear Filters
            </Button>
          </div>
        )}
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
      {!loading && filteredStudents.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted">
              {hasActiveFilters ? (
                <Filter className="size-8 text-muted-foreground" />
              ) : (
                <Users className="size-8 text-muted-foreground" />
              )}
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">
                {hasActiveFilters ? "No matching students" : "No students found"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasActiveFilters ? (
                  <>
                    No students match the current filters
                    {getFilterDescription() && (
                      <span className="font-medium text-foreground">
                        {" "}({getFilterDescription()})
                      </span>
                    )}
                    .
                  </>
                ) : (
                  "Get started by adding your first student."
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="gap-2">
                  <X className="size-4" />
                  Clear Filters
                </Button>
              )}
              {!hasActiveFilters && (
                <Button
                  onClick={() => navigate("student-add")}
                  className="gap-2"
                >
                  <Plus className="size-4" />
                  Add Student
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Desktop Table */}
      {!loading && filteredStudents.length > 0 && (
        <>
          {/* Desktop: Table view */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Reg No</TableHead>
                    <TableHead>Fullname</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Basic</TableHead>
                    <TableHead className="w-28 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student, index) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {student.regNo}
                      </TableCell>
                      <TableCell className="font-medium">
                        <button
                          type="button"
                          onClick={() => openDetail(student)}
                          className="hover:underline hover:text-primary cursor-pointer text-left"
                          title="View details"
                        >
                          {student.fullname}
                        </button>
                      </TableCell>
                      <TableCell>{student.gender || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{student.class}</Badge>
                      </TableCell>
                      <TableCell>{student.basic || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => openEdit(student)}
                            title="Edit student"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <AlertDialog open={deleteOpen && deleteId === student.id} onOpenChange={(open) => {
                            setDeleteOpen(open);
                            if (open) setDeleteId(student.id);
                          }}>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-destructive hover:text-destructive"
                                title="Delete student"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Student</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete{" "}
                                  <span className="font-semibold">{student.fullname}</span>?
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
                                  {deleting ? (
                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                  ) : null}
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
            {filteredStudents.map((student, index) => (
              <Card key={student.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          #{index + 1}
                        </span>
                        <Badge variant="outline">{student.class}</Badge>
                      </div>
                      <button
                        type="button"
                        onClick={() => openDetail(student)}
                        className="mt-1 w-full text-left"
                      >
                        <h3 className="truncate font-semibold hover:underline hover:text-primary">
                          {student.fullname}
                        </h3>
                      </button>
                      <p className="text-xs text-muted-foreground">
                        {student.regNo}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => openEdit(student)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <AlertDialog open={deleteOpen && deleteId === student.id} onOpenChange={(open) => {
                        setDeleteOpen(open);
                        if (open) setDeleteId(student.id);
                      }}>
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
                            <AlertDialogTitle>Delete Student</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete{" "}
                              <span className="font-semibold">{student.fullname}</span>?
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
                              {deleting ? (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                              ) : null}
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Gender: {student.gender || "—"}</span>
                    <span>Basic: {student.basic || "—"}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Student Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="right" className="overflow-y-auto p-0 sm:max-w-md">
          {detailStudent && (
            <>
              <SheetHeader className="p-6 pb-0">
                <SheetTitle className="sr-only">Student Details</SheetTitle>
                <SheetDescription className="sr-only">
                  Detailed information for {detailStudent.fullname}
                </SheetDescription>
              </SheetHeader>

              <div className="px-6 pb-6">
                {/* Photo and Name */}
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-28 w-28 rounded-full border-4 border-primary/10">
                    {detailStudent.imageUrl ? (
                      <AvatarImage
                        src={detailStudent.imageUrl}
                        alt={detailStudent.fullname}
                        className="object-cover"
                      />
                    ) : null}
                    <AvatarFallback className="bg-primary/5 text-primary text-3xl font-bold">
                      <UserCircle className="size-16" />
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="mt-4 text-xl font-bold">
                    {detailStudent.fullname}
                  </h2>
                  <p className="mt-1 font-mono text-sm text-muted-foreground">
                    {detailStudent.regNo}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="outline">{detailStudent.class}</Badge>
                    {detailStudent.gender && (
                      <Badge
                        variant="secondary"
                        className={
                          detailStudent.gender === "Male"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            : "bg-pink-50 text-pink-700 dark:bg-pink-950 dark:text-pink-300"
                        }
                      >
                        {detailStudent.gender}
                      </Badge>
                    )}
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Details */}
                <div className="space-y-4">
                  {/* Personal */}
                  <div>
                    <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <UserCircle className="size-3.5" />
                      Personal Information
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <DetailItem
                        icon={<Calendar className="size-3.5" />}
                        label="Date of Birth"
                        value={detailStudent.dateOfBirth || "—"}
                      />
                      <DetailItem
                        icon={<MapPin className="size-3.5" />}
                        label="State of Origin"
                        value={detailStudent.stateOfOrigin || "—"}
                      />
                      <DetailItem
                        icon={<MapPin className="size-3.5" />}
                        label="LGA"
                        value={detailStudent.lga || "—"}
                      />
                      <DetailItem
                        icon={<Home className="size-3.5" />}
                        label="Home Address"
                        value={detailStudent.homeAddress || "—"}
                        fullWidth
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Academic */}
                  <div>
                    <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <GraduationCap className="size-3.5" />
                      Academic Information
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <DetailItem
                        icon={<Building2 className="size-3.5" />}
                        label="Class"
                        value={detailStudent.class || "—"}
                      />
                      <DetailItem
                        icon={<BookOpen className="size-3.5" />}
                        label="Basic Level"
                        value={detailStudent.basic || "—"}
                      />
                      <DetailItem
                        icon={<GraduationCap className="size-3.5" />}
                        label="Department"
                        value={detailStudent.department || "—"}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Contact */}
                  <div>
                    <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Phone className="size-3.5" />
                      Contact Information
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <DetailItem
                        icon={<Phone className="size-3.5" />}
                        label="Parent Phone"
                        value={detailStudent.parentNo || "—"}
                      />
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Quick Actions */}
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => handleDetailEdit(detailStudent)}
                    className="flex-1 gap-2"
                  >
                    <Pencil className="size-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDetailDelete(detailStudent)}
                    className="flex-1 gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Update the student&apos;s information below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-6">
            {/* Personal */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Personal Information
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-fullname">
                    Fullname <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-fullname"
                    value={editFullname}
                    onChange={(e) => setEditFullname(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-gender">Gender</Label>
                  <Select value={editGender} onValueChange={setEditGender}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-dob">Date of Birth</Label>
                  <Input
                    id="edit-dob"
                    type="date"
                    value={editDateOfBirth}
                    onChange={(e) => setEditDateOfBirth(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Academic */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Academic Information
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-class">Class</Label>
                  <Select value={editClass} onValueChange={setEditClass}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.title}>
                          {cls.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-basic">Basic Level</Label>
                  <Select value={editBasic} onValueChange={setEditBasic}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select basic level" />
                    </SelectTrigger>
                    <SelectContent>
                      {BASIC_OPTIONS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-department">Department</Label>
                  <Select
                    value={editDepartment}
                    onValueChange={setEditDepartment}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENT_OPTIONS.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Passport Photo */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Passport Photograph
              </h4>
              <div className="flex items-start gap-5">
                <div className="relative group">
                  <Avatar className="h-24 w-24 rounded-lg border-2 border-emerald-200">
                    {editImageUrl ? (
                      <AvatarImage src={editImageUrl} alt="Student passport" className="object-cover" />
                    ) : null}
                    <AvatarFallback className="rounded-lg bg-emerald-50">
                      <Camera className="h-8 w-8 text-emerald-300" />
                    </AvatarFallback>
                  </Avatar>
                  {editImageUrl && (
                    <button
                      type="button"
                      onClick={() => setEditImageUrl("")}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                      title="Remove photo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <Label>Upload Photo</Label>
                    <div className="mt-1.5 flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById("edit-photo-upload")?.click()}
                        disabled={!!editUploading}
                      >
                        {editUploading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="mr-2 h-4 w-4" />
                        )}
                        {editUploading ? "Uploading..." : "Browse Files"}
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        JPEG, PNG, GIF or WebP (max 5MB)
                      </span>
                    </div>
                    <input
                      id="edit-photo-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      onChange={handleEditPhotoUpload}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-imageUrl" className="text-xs text-muted-foreground">Or paste image URL</Label>
                    <Input
                      id="edit-imageUrl"
                      placeholder="https://example.com/photo.jpg"
                      value={editImageUrl}
                      onChange={(e) => setEditImageUrl(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Contact Information
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-parentNo">Parent Phone</Label>
                  <Input
                    id="edit-parentNo"
                    type="tel"
                    value={editParentNo}
                    onChange={(e) => setEditParentNo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-state">State of Origin</Label>
                  <Input
                    id="edit-state"
                    value={editStateOfOrigin}
                    onChange={(e) => setEditStateOfOrigin(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-lga">LGA</Label>
                  <Input
                    id="edit-lga"
                    value={editLga}
                    onChange={(e) => setEditLga(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-address">Home Address</Label>
                <Textarea
                  id="edit-address"
                  rows={3}
                  value={editHomeAddress}
                  onChange={(e) => setEditHomeAddress(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
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

      {/* Import CSV Dialog */}
      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
          if (!open) resetImportDialog();
          setImportOpen(open);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="size-5" />
              Import Students from CSV
            </DialogTitle>
            <DialogDescription>
              Import multiple students at once using a CSV file. Only Fullname and Class are required.
            </DialogDescription>
          </DialogHeader>

          {!importResult ? (
            <div className="space-y-6">
              {/* Step 1: Download Template */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    1
                  </span>
                  <h3 className="text-sm font-semibold">Download Template</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Download the CSV template and fill in your student data. Registration numbers are auto-generated.
                </p>
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  className="gap-2"
                >
                  <Download className="size-4" />
                  Download Template
                </Button>

                {/* Template Preview */}
                <div className="overflow-hidden rounded-lg border">
                  <div className="bg-muted/50 px-4 py-2">
                    <p className="text-xs font-medium text-muted-foreground">Template Preview</p>
                  </div>
                  <ScrollArea className="max-h-36">
                    <div className="min-w-[600px]">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-muted/30">
                            <th className="px-3 py-2 text-left font-medium">Fullname*</th>
                            <th className="px-3 py-2 text-left font-medium">Gender</th>
                            <th className="px-3 py-2 text-left font-medium">DateOfBirth</th>
                            <th className="px-3 py-2 text-left font-medium">Class*</th>
                            <th className="px-3 py-2 text-left font-medium">Basic</th>
                            <th className="px-3 py-2 text-left font-medium">Department</th>
                            <th className="px-3 py-2 text-left font-medium">ParentPhone</th>
                            <th className="px-3 py-2 text-left font-medium">StateOfOrigin</th>
                            <th className="px-3 py-2 text-left font-medium">LGA</th>
                            <th className="px-3 py-2 text-left font-medium">HomeAddress</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="px-3 py-2">John Doe</td>
                            <td className="px-3 py-2">Male</td>
                            <td className="px-3 py-2">2010-05-15</td>
                            <td className="px-3 py-2">JSS 1</td>
                            <td className="px-3 py-2">Basic7</td>
                            <td className="px-3 py-2">Science</td>
                            <td className="px-3 py-2">08012345678</td>
                            <td className="px-3 py-2">Lagos</td>
                            <td className="px-3 py-2">Ikeja</td>
                            <td className="px-3 py-2">12 Main St</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-2">Jane Smith</td>
                            <td className="px-3 py-2">Female</td>
                            <td className="px-3 py-2">2009-08-22</td>
                            <td className="px-3 py-2">JSS 2</td>
                            <td className="px-3 py-2">Basic8</td>
                            <td className="px-3 py-2">Art</td>
                            <td className="px-3 py-2">08098765432</td>
                            <td className="px-3 py-2">Abuja</td>
                            <td className="px-3 py-2">Garki</td>
                            <td className="px-3 py-2">45 Park Ave</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </ScrollArea>
                </div>
              </div>

              <Separator />

              {/* Step 2: Upload File */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    2
                  </span>
                  <h3 className="text-sm font-semibold">Upload CSV File</h3>
                </div>

                {/* Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors ${importDragOver
                    ? "border-primary bg-primary/5"
                    : importFile
                      ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30"
                      : "border-muted-foreground/25 hover:border-muted-foreground/50"
                    }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={(e) => handleFileSelect(e.target.files?.[0])}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                  {importFile ? (
                    <>
                      <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
                        <CheckCircle className="size-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">{importFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(importFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImportFile(null);
                          setImportResult(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        <X className="mr-1 size-3" />
                        Remove file
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                        <Upload className="size-6 text-muted-foreground" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">
                          Drag & drop your CSV file here, or click to browse
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Only .csv files are accepted
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <Button
                  onClick={handleImport}
                  disabled={!importFile || importing}
                  className="w-full gap-2"
                >
                  {importing ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Importing Students...
                    </>
                  ) : (
                    <>
                      <Upload className="size-4" />
                      Import Students
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Import Results */
            <div className="space-y-5">
              {/* Summary Stats */}
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  {importResult.imported > 0 ? (
                    <CheckCircle className="size-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="size-4 text-amber-600" />
                  )}
                  Import Complete
                </h3>

                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col items-center rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
                    <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                      {importResult.imported}
                    </span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-500">Imported</span>
                  </div>
                  <div className="flex flex-col items-center rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
                    <span className="text-2xl font-bold text-red-700 dark:text-red-400">
                      {importResult.failed}
                    </span>
                    <span className="text-xs text-red-600 dark:text-red-500">Failed</span>
                  </div>
                  <div className="flex flex-col items-center rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                    <span className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                      {importResult.skipped}
                    </span>
                    <span className="text-xs text-amber-600 dark:text-amber-500">Skipped</span>
                  </div>
                </div>

                {/* Progress Bar */}
                {importResult.students.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Success Rate</span>
                      <span>
                        {importResult.students.length} of{" "}
                        {importResult.students.length + importResult.failed + importResult.skipped} rows
                      </span>
                    </div>
                    <Progress
                      value={
                        ((importResult.students.length) /
                          (importResult.students.length + importResult.failed + importResult.skipped)) *
                        100
                      }
                      className="h-2"
                    />
                  </div>
                )}
              </div>

              {/* Imported Students List */}
              {importResult.students.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Imported Students
                  </h4>
                  <ScrollArea className="max-h-48">
                    <div className="space-y-1">
                      {importResult.students.map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{student.fullname}</p>
                            <p className="text-xs text-muted-foreground">
                              {student.class}
                              {student.gender ? ` · ${student.gender}` : ""}
                            </p>
                          </div>
                          <Badge variant="secondary" className="shrink-0 font-mono text-xs">
                            {student.regNo}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Errors List */}
              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-destructive">
                    <XCircle className="size-3.5" />
                    Errors ({importResult.errors.length})
                  </h4>
                  <ScrollArea className="max-h-36">
                    <div className="space-y-1">
                      {importResult.errors.map((error, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive"
                        >
                          <XCircle className="mt-0.5 size-3.5 shrink-0" />
                          <span>{error}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetImportDialog();
                  }}
                  className="flex-1 gap-2"
                >
                  <Upload className="size-4" />
                  Import More
                </Button>
                <Button
                  onClick={() => {
                    resetImportDialog();
                    setImportOpen(false);
                  }}
                  className="flex-1 gap-2"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Detail item component for the sheet
function DetailItem({
  icon,
  label,
  value,
  fullWidth = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? "sm:col-span-2" : ""}>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}