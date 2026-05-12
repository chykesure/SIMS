'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAppStore } from '@/store/index';
import {
  GraduationCap,
  Plus,
  ArrowLeft,
  Pin,
  PinOff,
  FileText,
  Globe,
  Video,
  File,
  BookOpen,
  Users,
  Calendar,
  Clock,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Edit,
  Trash2,
  ExternalLink,
  Search,
  Loader2,
  Megaphone,
  ClipboardList,
  FolderOpen,
  Send,
  Save,
  MessageSquare,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ─── Types ──────────────────────────────────────────────────────────

interface Classroom {
  id: string;
  name: string;
  description: string;
  section: string;
  subject: string;
  teacherName: string;
  room: string;
  coverImage: string;
  isActive: boolean;
  createdAt: string;
  _count: {
    announcements: number;
    assignments: number;
    materials: number;
  };
}

interface Announcement {
  id: string;
  classroomId: string;
  title: string;
  content: string;
  createdBy: string;
  createdByName: string;
  pinned: boolean;
  createdAt: string;
}

interface Assignment {
  id: string;
  classroomId: string;
  title: string;
  description: string;
  instructions: string;
  dueDate: string;
  dueTime: string;
  maxScore: number;
  status: string;
  createdAt: string;
  _count: {
    submissions: number;
  };
}

interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  studentRegNo: string;
  content: string;
  score: number;
  feedback: string;
  status: string;
  submittedAt: string;
  gradedAt: string | null;
}

interface Material {
  id: string;
  classroomId: string;
  title: string;
  description: string;
  type: string;
  url: string;
  fileSize: string;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: string;
}

// ─── Cover Colors ───────────────────────────────────────────────────

const COVER_COLORS = [
  '#821329', '#0d9488', '#7c3aed', '#2563eb',
  '#dc2626', '#059669', '#d97706', '#4f46e5',
  '#be185d', '#0e7490', '#6d28d9', '#ca8a04',
];

function getCoverColor(index: number) {
  return COVER_COLORS[index % COVER_COLORS.length];
}

// ─── Helpers ────────────────────────────────────────────────────────

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: 'easeOut' as const },
};

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function timeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

function getMaterialIcon(type: string) {
  switch (type) {
    case 'link': return Globe;
    case 'file': return FileText;
    case 'video': return Video;
    case 'document': return File;
    default: return FileText;
  }
}

// ─── Skeletons ──────────────────────────────────────────────────────

function CardGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <Skeleton className="h-3 w-full" />
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      ))}
    </div>
  );
}

// ====================================================================
// MAIN COMPONENT
// ====================================================================

export function ClassroomView() {
  const tenant = useAppStore((s) => s.tenant);
  const primaryColor = tenant?.primaryColor || '#821329';

  // View state: list vs detail
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);

  // ─── List State ───
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Create classroom dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formName, setFormName] = useState('');
  const [formSection, setFormSection] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formTeacherName, setFormTeacherName] = useState('');
  const [formRoom, setFormRoom] = useState('');

  // Delete classroom dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Classroom | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ─── Detail State ───
  const [activeTab, setActiveTab] = useState('stream');

  // Stream (announcements)
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);

  // Assignments
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);

  // Materials
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);

  // Submissions dialog
  const [submissionsOpen, setSubmissionsOpen] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeScore, setGradeScore] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [savingGrade, setSavingGrade] = useState(false);

  // Announcement dialog
  const [announceOpen, setAnnounceOpen] = useState(false);
  const [announceSaving, setAnnounceSaving] = useState(false);
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceContent, setAnnounceContent] = useState('');
  const [announcePinned, setAnnouncePinned] = useState(false);

  // Assignment dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignTitle, setAssignTitle] = useState('');
  const [assignDesc, setAssignDesc] = useState('');
  const [assignInstructions, setAssignInstructions] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [assignDueTime, setAssignDueTime] = useState('');
  const [assignMaxScore, setAssignMaxScore] = useState('100');

  // Material dialog
  const [materialOpen, setMaterialOpen] = useState(false);
  const [materialSaving, setMaterialSaving] = useState(false);
  const [matTitle, setMatTitle] = useState('');
  const [matDescription, setMatDescription] = useState('');
  const [matType, setMatType] = useState('link');
  const [matUrl, setMatUrl] = useState('');

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ─── Fetch Classrooms ───
  const fetchClassrooms = useCallback(async () => {
    setListLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      const url = params.toString() ? `/api/classrooms?${params.toString()}` : '/api/classrooms';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setClassrooms(data.data ?? []);
      } else {
        toast.error('Failed to fetch classrooms');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setListLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchClassrooms();
  }, [fetchClassrooms]);

  // ─── Fetch Detail Data ───
  const fetchAnnouncements = useCallback(async (classroomId: string) => {
    setAnnouncementsLoading(true);
    try {
      const res = await fetch(`/api/classrooms/announcements?classroomId=${classroomId}`);
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.data ?? []);
      }
    } catch {
      // silent
    } finally {
      setAnnouncementsLoading(false);
    }
  }, []);

  const fetchAssignments = useCallback(async (classroomId: string) => {
    setAssignmentsLoading(true);
    try {
      const res = await fetch(`/api/classrooms/assignments?classroomId=${classroomId}`);
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.data ?? []);
      }
    } catch {
      // silent
    } finally {
      setAssignmentsLoading(false);
    }
  }, []);

  const fetchMaterials = useCallback(async (classroomId: string) => {
    setMaterialsLoading(true);
    try {
      const res = await fetch(`/api/classrooms/materials?classroomId=${classroomId}`);
      if (res.ok) {
        const data = await res.json();
        setMaterials(data.data ?? []);
      }
    } catch {
      // silent
    } finally {
      setMaterialsLoading(false);
    }
  }, []);

  const fetchSubmissions = useCallback(async (assignmentId: string) => {
    setSubmissionsLoading(true);
    try {
      const res = await fetch(`/api/classrooms/submissions?assignmentId=${assignmentId}`);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.data ?? []);
      }
    } catch {
      // silent
    } finally {
      setSubmissionsLoading(false);
    }
  }, []);

  // Open classroom detail
  function openClassroom(classroom: Classroom) {
    setSelectedClassroom(classroom);
    setActiveTab('stream');
    fetchAnnouncements(classroom.id);
    fetchAssignments(classroom.id);
    fetchMaterials(classroom.id);
  }

  // ─── Create Classroom ───
  async function handleCreateClassroom(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('Classroom name is required');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/classrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          section: formSection.trim(),
          subject: formSubject.trim(),
          teacherName: formTeacherName.trim(),
          room: formRoom.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to create classroom');
        return;
      }
      toast.success('Classroom created successfully!');
      setCreateOpen(false);
      resetCreateForm();
      fetchClassrooms();
    } catch {
      toast.error('Network error');
    } finally {
      setCreating(false);
    }
  }

  function resetCreateForm() {
    setFormName('');
    setFormSection('');
    setFormSubject('');
    setFormTeacherName('');
    setFormRoom('');
  }

  // ─── Delete Classroom ───
  async function handleDeleteClassroom() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/classrooms?id=${encodeURIComponent(deleteTarget.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to delete classroom');
        return;
      }
      toast.success('Classroom deleted');
      setDeleteOpen(false);
      setDeleteTarget(null);
      if (selectedClassroom?.id === deleteTarget.id) {
        setSelectedClassroom(null);
      }
      fetchClassrooms();
    } catch {
      toast.error('Network error');
    } finally {
      setDeleting(false);
    }
  }

  // ─── Pin/Unpin Announcement ───
  async function togglePin(announcement: Announcement) {
    try {
      const res = await fetch('/api/classrooms/announcements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: announcement.id, pinned: !announcement.pinned }),
      });
      if (res.ok) {
        setAnnouncements((prev) =>
          prev.map((a) => (a.id === announcement.id ? { ...a, pinned: !a.pinned } : a))
        );
        toast.success(announcement.pinned ? 'Unpinned' : 'Pinned');
      }
    } catch {
      toast.error('Failed to toggle pin');
    }
  }

  // ─── Create Announcement ───
  async function handleCreateAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    if (!announceTitle.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!selectedClassroom) return;
    setAnnounceSaving(true);
    try {
      const res = await fetch('/api/classrooms/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroomId: selectedClassroom.id,
          title: announceTitle.trim(),
          content: announceContent.trim(),
          pinned: announcePinned,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to post announcement');
        return;
      }
      toast.success('Announcement posted!');
      setAnnounceOpen(false);
      setAnnounceTitle('');
      setAnnounceContent('');
      setAnnouncePinned(false);
      fetchAnnouncements(selectedClassroom.id);
      fetchClassrooms();
    } catch {
      toast.error('Network error');
    } finally {
      setAnnounceSaving(false);
    }
  }

  // ─── Create Assignment ───
  async function handleCreateAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!assignTitle.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!selectedClassroom) return;
    setAssignSaving(true);
    try {
      const res = await fetch('/api/classrooms/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroomId: selectedClassroom.id,
          title: assignTitle.trim(),
          description: assignDesc.trim(),
          instructions: assignInstructions.trim(),
          dueDate: assignDueDate,
          dueTime: assignDueTime,
          maxScore: parseFloat(assignMaxScore) || 100,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to create assignment');
        return;
      }
      toast.success('Assignment created!');
      setAssignOpen(false);
      setAssignTitle('');
      setAssignDesc('');
      setAssignInstructions('');
      setAssignDueDate('');
      setAssignDueTime('');
      setAssignMaxScore('100');
      fetchAssignments(selectedClassroom.id);
      fetchClassrooms();
    } catch {
      toast.error('Network error');
    } finally {
      setAssignSaving(false);
    }
  }

  // ─── Open Submissions ───
  function openSubmissions(assignment: Assignment) {
    setSelectedAssignment(assignment);
    setSubmissionsOpen(true);
    setGradingId(null);
    setGradeScore('');
    setGradeFeedback('');
    fetchSubmissions(assignment.id);
  }

  // ─── Grade Submission ───
  function startGrading(submission: Submission) {
    setGradingId(submission.id);
    setGradeScore(submission.score > 0 ? String(submission.score) : '');
    setGradeFeedback(submission.feedback || '');
  }

  async function handleSubmitGrade(submission: Submission) {
    setSavingGrade(true);
    try {
      const res = await fetch('/api/classrooms/submissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: submission.id,
          score: parseFloat(gradeScore) || 0,
          feedback: gradeFeedback.trim(),
          status: 'graded',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to save grade');
        return;
      }
      toast.success('Grade saved!');
      setGradingId(null);
      setGradeScore('');
      setGradeFeedback('');
      fetchSubmissions(submission.assignmentId);
    } catch {
      toast.error('Network error');
    } finally {
      setSavingGrade(false);
    }
  }

  // ─── Create Material ───
  async function handleCreateMaterial(e: React.FormEvent) {
    e.preventDefault();
    if (!matTitle.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!selectedClassroom) return;
    setMaterialSaving(true);
    try {
      const res = await fetch('/api/classrooms/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroomId: selectedClassroom.id,
          title: matTitle.trim(),
          description: matDescription.trim(),
          type: matType,
          url: matUrl.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to add material');
        return;
      }
      toast.success('Material added!');
      setMaterialOpen(false);
      setMatTitle('');
      setMatDescription('');
      setMatType('link');
      setMatUrl('');
      fetchMaterials(selectedClassroom.id);
      fetchClassrooms();
    } catch {
      toast.error('Network error');
    } finally {
      setMaterialSaving(false);
    }
  }

  // ─── Delete Assignment ───
  async function handleDeleteAssignment(assignmentId: string) {
    try {
      const res = await fetch(`/api/classrooms/assignments?id=${encodeURIComponent(assignmentId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to delete');
        return;
      }
      toast.success('Assignment deleted');
      if (selectedClassroom) {
        fetchAssignments(selectedClassroom.id);
        fetchClassrooms();
      }
      if (selectedAssignment?.id === assignmentId) {
        setSubmissionsOpen(false);
      }
    } catch {
      toast.error('Network error');
    }
  }

  // ─── Delete Announcement ───
  async function handleDeleteAnnouncement(announcementId: string) {
    try {
      const res = await fetch(`/api/classrooms/announcements?id=${encodeURIComponent(announcementId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to delete');
        return;
      }
      toast.success('Announcement deleted');
      if (selectedClassroom) {
        fetchAnnouncements(selectedClassroom.id);
        fetchClassrooms();
      }
    } catch {
      toast.error('Network error');
    }
  }

  // ─── Delete Material ───
  async function handleDeleteMaterial(materialId: string) {
    try {
      const res = await fetch(`/api/classrooms/materials?id=${encodeURIComponent(materialId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to delete');
        return;
      }
      toast.success('Material deleted');
      if (selectedClassroom) {
        fetchMaterials(selectedClassroom.id);
        fetchClassrooms();
      }
    } catch {
      toast.error('Network error');
    }
  }

  // Filtered classrooms
  const filteredClassrooms = useMemo(() => {
    if (!searchQuery) return classrooms;
    return classrooms.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.section.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.teacherName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [classrooms, searchQuery]);

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <motion.div {...fadeIn} className="space-y-6">
      {/* ═══ LIST VIEW ═══ */}
      {!selectedClassroom && (
        <>
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex size-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <GraduationCap className="size-5" style={{ color: primaryColor }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Classroom</h1>
                <p className="text-sm text-muted-foreground">
                  Manage your virtual classrooms, assignments & materials
                </p>
              </div>
              {!listLoading && classrooms.length > 0 && (
                <Badge variant="secondary">{classrooms.length}</Badge>
              )}
            </div>
            <Button
              onClick={() => {
                resetCreateForm();
                setCreateOpen(true);
              }}
              className="gap-2"
              style={{ backgroundColor: primaryColor }}
            >
              <Plus className="size-4" />
              Create Classroom
            </Button>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search classrooms..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Loading */}
          {listLoading && <CardGridSkeleton />}

          {/* Empty State */}
          {!listLoading && classrooms.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
                <div className="flex size-16 items-center justify-center rounded-full bg-muted">
                  <GraduationCap className="size-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold">No classrooms yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Create your first classroom to get started
                  </p>
                </div>
                <Button
                  onClick={() => {
                    resetCreateForm();
                    setCreateOpen(true);
                  }}
                  className="gap-2"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Plus className="size-4" />
                  Create Classroom
                </Button>
              </CardContent>
            </Card>
          )}

          {/* No search results */}
          {!listLoading && classrooms.length > 0 && filteredClassrooms.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
                <Search className="size-10 text-muted-foreground" />
                <div className="text-center">
                  <h3 className="text-lg font-semibold">No results found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    No classrooms match &quot;{searchQuery}&quot;
                  </p>
                </div>
                <Button variant="outline" onClick={() => setSearchInput('')}>
                  Clear search
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Classroom Cards Grid */}
          {!listLoading && filteredClassrooms.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredClassrooms.map((classroom, index) => (
                <Card
                  key={classroom.id}
                  className="group overflow-hidden transition-shadow hover:shadow-md"
                >
                  {/* Cover strip */}
                  <div
                    className="h-2 w-full"
                    style={{ backgroundColor: getCoverColor(index) }}
                  />
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-base font-semibold">{classroom.name}</h3>
                          {classroom.section && (
                            <Badge variant="outline" className="shrink-0 text-xs">
                              {classroom.section}
                            </Badge>
                          )}
                        </div>
                        {classroom.subject && (
                          <p className="mt-0.5 text-sm text-muted-foreground">{classroom.subject}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            setDeleteTarget(classroom);
                            setDeleteOpen(true);
                          }}
                          title="Delete classroom"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>

                    {classroom.teacherName && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="size-3.5" />
                        <span>{classroom.teacherName}</span>
                      </div>
                    )}

                    {classroom.room && (
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <BookOpen className="size-3.5" />
                        <span>Room {classroom.room}</span>
                      </div>
                    )}

                    <Separator className="my-3" />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Megaphone className="size-3" />
                          {classroom._count.announcements}
                        </span>
                        <span className="flex items-center gap-1">
                          <ClipboardList className="size-3" />
                          {classroom._count.assignments}
                        </span>
                        <span className="flex items-center gap-1">
                          <FolderOpen className="size-3" />
                          {classroom._count.materials}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs"
                        onClick={() => openClassroom(classroom)}
                      >
                        Open <ChevronRight className="size-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══ DETAIL VIEW ═══ */}
      {selectedClassroom && (
        <>
          {/* Back Button */}
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => setSelectedClassroom(null)}
          >
            <ArrowLeft className="size-4" />
            Back to classrooms
          </Button>

          {/* Classroom Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className="flex size-12 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <GraduationCap className="size-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-xl font-bold">{selectedClassroom.name}</h1>
                      {selectedClassroom.section && (
                        <Badge variant="outline">{selectedClassroom.section}</Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {selectedClassroom.subject && (
                        <span className="flex items-center gap-1">
                          <BookOpen className="size-3.5" />
                          {selectedClassroom.subject}
                        </span>
                      )}
                      {selectedClassroom.teacherName && (
                        <span className="flex items-center gap-1">
                          <Users className="size-3.5" />
                          {selectedClassroom.teacherName}
                        </span>
                      )}
                      {selectedClassroom.room && (
                        <span className="flex items-center gap-1">
                          <BookOpen className="size-3.5" />
                          Room {selectedClassroom.room}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="w-full flex-wrap justify-start gap-1 bg-transparent p-0 h-auto">
              <TabsTrigger
                value="stream"
                className="gap-1.5"
                style={
                  activeTab === 'stream'
                    ? { backgroundColor: primaryColor, color: '#fff' }
                    : undefined
                }
              >
                <Megaphone className="size-4" /> Stream
              </TabsTrigger>
              <TabsTrigger
                value="assignments"
                className="gap-1.5"
                style={
                  activeTab === 'assignments'
                    ? { backgroundColor: primaryColor, color: '#fff' }
                    : undefined
                }
              >
                <ClipboardList className="size-4" /> Assignments
              </TabsTrigger>
              <TabsTrigger
                value="materials"
                className="gap-1.5"
                style={
                  activeTab === 'materials'
                    ? { backgroundColor: primaryColor, color: '#fff' }
                    : undefined
                }
              >
                <FolderOpen className="size-4" /> Materials
              </TabsTrigger>
            </TabsList>

            {/* ─── Stream Tab ─── */}
            <TabsContent value="stream">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Announcements</h2>
                  <Button
                    onClick={() => {
                      setAnnounceTitle('');
                      setAnnounceContent('');
                      setAnnouncePinned(false);
                      setAnnounceOpen(true);
                    }}
                    className="gap-2"
                    size="sm"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Plus className="size-4" /> Post Announcement
                  </Button>
                </div>

                {announcementsLoading ? (
                  <Card>
                    <ListSkeleton rows={3} />
                  </Card>
                ) : announcements.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
                      <Megaphone className="size-10 text-muted-foreground" />
                      <div className="text-center">
                        <h3 className="font-semibold">No announcements</h3>
                        <p className="text-sm text-muted-foreground">
                          Post your first announcement to this class
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {announcements.map((ann) => (
                      <Card key={ann.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                {ann.pinned && (
                                  <Pin className="size-4 shrink-0" style={{ color: primaryColor }} />
                                )}
                                <h3 className="font-semibold">{ann.title}</h3>
                              </div>
                              {ann.content && (
                                <p className="mt-1.5 text-sm text-muted-foreground whitespace-pre-wrap">
                                  {ann.content}
                                </p>
                              )}
                              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                                <span>{ann.createdByName || 'Admin'}</span>
                                <span>&middot;</span>
                                <span>{timeAgo(ann.createdAt)}</span>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                onClick={() => togglePin(ann)}
                                title={ann.pinned ? 'Unpin' : 'Pin'}
                              >
                                {ann.pinned ? (
                                  <PinOff className="size-4 text-muted-foreground" />
                                ) : (
                                  <Pin className="size-4 text-muted-foreground" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteAnnouncement(ann.id)}
                                title="Delete"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ─── Assignments Tab ─── */}
            <TabsContent value="assignments">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Assignments</h2>
                  <Button
                    onClick={() => {
                      setAssignTitle('');
                      setAssignDesc('');
                      setAssignInstructions('');
                      setAssignDueDate('');
                      setAssignDueTime('');
                      setAssignMaxScore('100');
                      setAssignOpen(true);
                    }}
                    className="gap-2"
                    size="sm"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Plus className="size-4" /> Create Assignment
                  </Button>
                </div>

                {assignmentsLoading ? (
                  <Card>
                    <ListSkeleton rows={3} />
                  </Card>
                ) : assignments.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
                      <ClipboardList className="size-10 text-muted-foreground" />
                      <div className="text-center">
                        <h3 className="font-semibold">No assignments</h3>
                        <p className="text-sm text-muted-foreground">
                          Create your first assignment for this class
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {assignments.map((assignment) => (
                      <Card key={assignment.id} className="transition-shadow hover:shadow-md">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold">{assignment.title}</h3>
                                <Badge
                                  className={
                                    assignment.status === 'active'
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                                      : assignment.status === 'closed'
                                        ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                                  }
                                >
                                  {assignment.status}
                                </Badge>
                              </div>
                              {assignment.description && (
                                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                  {assignment.description}
                                </p>
                              )}
                              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                {assignment.dueDate && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="size-3.5" />
                                    {formatDate(assignment.dueDate)}
                                    {assignment.dueTime && ` at ${assignment.dueTime}`}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <CheckCircle className="size-3.5" />
                                  Max: {assignment.maxScore}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="size-3.5" />
                                  {assignment._count.submissions} submission{assignment._count.submissions !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 text-xs"
                                onClick={() => openSubmissions(assignment)}
                              >
                                <MessageSquare className="size-3" />
                                {assignment._count.submissions > 0 ? 'View' : 'Submissions'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteAssignment(assignment.id)}
                                title="Delete"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ─── Materials Tab ─── */}
            <TabsContent value="materials">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Materials</h2>
                  <Button
                    onClick={() => {
                      setMatTitle('');
                      setMatDescription('');
                      setMatType('link');
                      setMatUrl('');
                      setMaterialOpen(true);
                    }}
                    className="gap-2"
                    size="sm"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Plus className="size-4" /> Add Material
                  </Button>
                </div>

                {materialsLoading ? (
                  <Card>
                    <ListSkeleton rows={3} />
                  </Card>
                ) : materials.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
                      <FolderOpen className="size-10 text-muted-foreground" />
                      <div className="text-center">
                        <h3 className="font-semibold">No materials</h3>
                        <p className="text-sm text-muted-foreground">
                          Add resources for your students
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {materials.map((mat) => {
                      const MatIcon = getMaterialIcon(mat.type);
                      return (
                        <Card key={mat.id} className="transition-shadow hover:shadow-md">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-3 min-w-0 flex-1">
                                <div
                                  className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                                  style={{ backgroundColor: `${primaryColor}15` }}
                                >
                                  <MatIcon className="size-5" style={{ color: primaryColor }} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <h3 className="truncate text-sm font-semibold">{mat.title}</h3>
                                  </div>
                                  <Badge variant="outline" className="mt-1 text-xs capitalize">
                                    {mat.type}
                                  </Badge>
                                  {mat.description && (
                                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                      {mat.description}
                                    </p>
                                  )}
                                  {mat.uploadedByName && (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      by {mat.uploadedByName}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex shrink-0 gap-1">
                                {mat.url && (
                                  <a
                                    href={mat.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
                                    title="Open link"
                                  >
                                    <ExternalLink className="size-4" />
                                  </a>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleDeleteMaterial(mat.id)}
                                  title="Delete"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* ═══ DIALOGS ═══ */}

      {/* Create Classroom Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Classroom</DialogTitle>
            <DialogDescription>
              Set up a new virtual classroom for your students
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateClassroom} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cr-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cr-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Mathematics 101"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cr-section">Section</Label>
                <Input
                  id="cr-section"
                  value={formSection}
                  onChange={(e) => setFormSection(e.target.value)}
                  placeholder="e.g. A, B"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cr-subject">Subject</Label>
                <Input
                  id="cr-subject"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  placeholder="e.g. Mathematics"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cr-teacher">Teacher Name</Label>
                <Input
                  id="cr-teacher"
                  value={formTeacherName}
                  onChange={(e) => setFormTeacherName(e.target.value)}
                  placeholder="e.g. Mr. Johnson"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cr-room">Room</Label>
                <Input
                  id="cr-room"
                  value={formRoom}
                  onChange={(e) => setFormRoom(e.target.value)}
                  placeholder="e.g. Room 12"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating} style={{ backgroundColor: primaryColor }}>
                {creating && <Loader2 className="mr-2 size-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Classroom Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Classroom</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold">{deleteTarget?.name}</span>?
              This will also delete all announcements, assignments, submissions, and materials in this
              classroom. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteClassroom}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Announcement Dialog */}
      <Dialog open={announceOpen} onOpenChange={setAnnounceOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Post Announcement</DialogTitle>
            <DialogDescription>
              Share an update with your students
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAnnouncement} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ann-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ann-title"
                value={announceTitle}
                onChange={(e) => setAnnounceTitle(e.target.value)}
                placeholder="Announcement title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ann-content">Content</Label>
              <Textarea
                id="ann-content"
                value={announceContent}
                onChange={(e) => setAnnounceContent(e.target.value)}
                placeholder="Write your announcement..."
                rows={4}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="ann-pinned"
                checked={announcePinned}
                onCheckedChange={(checked) => setAnnouncePinned(checked === true)}
              />
              <Label htmlFor="ann-pinned" className="cursor-pointer text-sm">
                Pin this announcement to the top
              </Label>
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAnnounceOpen(false)}
                disabled={announceSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={announceSaving}
                style={{ backgroundColor: primaryColor }}
              >
                {announceSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
                Post
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Assignment Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Assignment</DialogTitle>
            <DialogDescription>
              Assign work to your students with optional due date
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAssignment} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="as-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="as-title"
                value={assignTitle}
                onChange={(e) => setAssignTitle(e.target.value)}
                placeholder="Assignment title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="as-desc">Description</Label>
              <Textarea
                id="as-desc"
                value={assignDesc}
                onChange={(e) => setAssignDesc(e.target.value)}
                placeholder="Brief description of the assignment"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="as-instructions">Instructions</Label>
              <Textarea
                id="as-instructions"
                value={assignInstructions}
                onChange={(e) => setAssignInstructions(e.target.value)}
                placeholder="Detailed instructions for students"
                rows={3}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="as-date">Due Date</Label>
                <Input
                  id="as-date"
                  type="date"
                  value={assignDueDate}
                  onChange={(e) => setAssignDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="as-time">Due Time</Label>
                <Input
                  id="as-time"
                  type="time"
                  value={assignDueTime}
                  onChange={(e) => setAssignDueTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="as-score">Max Score</Label>
                <Input
                  id="as-score"
                  type="number"
                  min="0"
                  value={assignMaxScore}
                  onChange={(e) => setAssignMaxScore(e.target.value)}
                  placeholder="100"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAssignOpen(false)}
                disabled={assignSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={assignSaving}
                style={{ backgroundColor: primaryColor }}
              >
                {assignSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Submissions Dialog */}
      <Dialog open={submissionsOpen} onOpenChange={setSubmissionsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedAssignment?.title} — Submissions
            </DialogTitle>
            <DialogDescription>
              {selectedAssignment?._count.submissions ?? 0} submission
              {((selectedAssignment?._count.submissions ?? 0) !== 1) ? 's' : ''} &middot; Max score: {selectedAssignment?.maxScore}
            </DialogDescription>
          </DialogHeader>

          {submissionsLoading ? (
            <div className="space-y-3 p-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          ) : submissions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Users className="size-10 text-muted-foreground" />
              <p className="text-muted-foreground">No submissions yet</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[55vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead className="hidden sm:table-cell">Reg No</TableHead>
                    <TableHead className="hidden md:table-cell">Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.studentName || 'Unknown'}</TableCell>
                      <TableCell className="hidden sm:table-cell font-mono text-xs">
                        {sub.studentRegNo || '—'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {timeAgo(sub.submittedAt)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            sub.status === 'graded'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                              : sub.status === 'returned'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          }
                        >
                          {sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {gradingId === sub.id ? (
                          <div className="space-y-2 text-right">
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="0"
                                max={selectedAssignment?.maxScore ?? 100}
                                value={gradeScore}
                                onChange={(e) => setGradeScore(e.target.value)}
                                className="w-20 h-8 text-sm"
                                placeholder="Score"
                              />
                              <Button
                                size="sm"
                                className="h-8 gap-1 text-xs"
                                onClick={() => handleSubmitGrade(sub)}
                                disabled={savingGrade}
                                style={{ backgroundColor: primaryColor }}
                              >
                                {savingGrade ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <Save className="size-3" />
                                )}
                                Save
                              </Button>
                            </div>
                            <Textarea
                              value={gradeFeedback}
                              onChange={(e) => setGradeFeedback(e.target.value)}
                              placeholder="Feedback..."
                              className="text-xs"
                              rows={2}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            {sub.score > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {sub.score}/{selectedAssignment?.maxScore ?? 100}
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => startGrading(sub)}
                              title="Grade"
                            >
                              <Edit className="size-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Material Dialog */}
      <Dialog open={materialOpen} onOpenChange={setMaterialOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Material</DialogTitle>
            <DialogDescription>
              Share a resource with your students
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateMaterial} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mat-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="mat-title"
                value={matTitle}
                onChange={(e) => setMatTitle(e.target.value)}
                placeholder="Material title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mat-desc">Description</Label>
              <Textarea
                id="mat-desc"
                value={matDescription}
                onChange={(e) => setMatDescription(e.target.value)}
                placeholder="Brief description"
                rows={2}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mat-type">Type</Label>
                <Select value={matType} onValueChange={setMatType}>
                  <SelectTrigger id="mat-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="link">
                      <span className="flex items-center gap-2">
                        <Globe className="size-3.5" /> Link
                      </span>
                    </SelectItem>
                    <SelectItem value="file">
                      <span className="flex items-center gap-2">
                        <FileText className="size-3.5" /> File
                      </span>
                    </SelectItem>
                    <SelectItem value="video">
                      <span className="flex items-center gap-2">
                        <Video className="size-3.5" /> Video
                      </span>
                    </SelectItem>
                    <SelectItem value="document">
                      <span className="flex items-center gap-2">
                        <File className="size-3.5" /> Document
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mat-url">URL</Label>
                <Input
                  id="mat-url"
                  value={matUrl}
                  onChange={(e) => setMatUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMaterialOpen(false)}
                disabled={materialSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={materialSaving}
                style={{ backgroundColor: primaryColor }}
              >
                {materialSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
                Add Material
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
