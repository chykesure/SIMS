//src/components/teacher/teacher-assignments.tsx
'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '@/store/index'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ClipboardList,
  Plus,
  Calendar,
  Clock,
  Users,
  AlertCircle,
  Trash2,
  Eye,
  CheckCircle,
  Loader2,
  ChevronLeft,
  X,
  Upload,
  FileText,
  Download,
  Paperclip,
  File,
  Image,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ClassroomData {
  id: string
  name: string
  subject: string
  _count: {
    announcements: number
    assignments: number
    materials: number
  }
}

interface AssignmentData {
  id: string
  classroomId: string
  title: string
  description: string
  instructions: string
  createdBy: string
  createdByName: string
  dueDate: string
  dueTime: string
  maxScore: number
  status: string
  attachmentUrl: string
  createdAt: string
  classroom: { id: string; name: string }
  _count: { submissions: number }
}

interface SubmissionData {
  id: string
  assignmentId: string
  studentId: string
  studentName: string
  studentRegNo: string
  content: string
  attachmentUrl: string
  score: number
  feedback: string
  gradedBy: string
  gradedByName: string
  status: string
  submittedAt: string
  gradedAt: string | null
}

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return Image
  return FileText
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

export function TeacherAssignments() {
  const { user, tenant } = useAppStore()
  const [assignments, setAssignments] = useState<AssignmentData[]>([])
  const [classrooms, setClassrooms] = useState<ClassroomData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createClassroomId, setCreateClassroomId] = useState('')
  const [createTitle, setCreateTitle] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [createInstructions, setCreateInstructions] = useState('')
  const [createDueDate, setCreateDueDate] = useState('')
  const [createDueTime, setCreateDueTime] = useState('')
  const [createMaxScore, setCreateMaxScore] = useState('100')
  const [creating, setCreating] = useState(false)

  // File upload state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadedFileUrl, setUploadedFileUrl] = useState('')
  const [uploading, setUploading] = useState(false)

  // Submissions view
  const [viewingAssignment, setViewingAssignment] = useState<AssignmentData | null>(null)
  const [submissions, setSubmissions] = useState<SubmissionData[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)
  const [gradingId, setGradingId] = useState<string | null>(null)
  const [gradeScore, setGradeScore] = useState('')
  const [gradeFeedback, setGradeFeedback] = useState('')
  const [savingGrade, setSavingGrade] = useState(false)

  const primaryColor = tenant?.primaryColor || '#821329'

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/portal/teacher/assignments', {
        headers: { 'x-user-id': user?.id || '' },
      })
      const json = await res.json()
      if (json.success) {
        setAssignments(json.data)
      } else {
        setError(json.message || 'Failed to load assignments')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchAssignments()
    fetch('/api/classrooms')
      .then((r) => r.json())
      .then((json) => {
        const data = json.success ? json.data : []
        setClassrooms(data)
      })
      .catch(() => {})
  }, [fetchAssignments])

  // ─── File Upload Handler ──────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'text/plain',
    ]
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|jpg|jpeg|png|gif|webp|txt)$/i)) {
      toast.error('Invalid file type', { description: 'Allowed: PDF, DOC, DOCX, JPG, PNG, GIF, TXT' })
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large', { description: 'Maximum file size is 10MB' })
      return
    }

    setUploadedFile(file)
    setUploadedFileUrl('')
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      if (json.success && json.url) {
        setUploadedFileUrl(json.url)
        toast.success('File uploaded', { description: file.name })
      } else {
        toast.error('Upload failed', { description: json.message || 'Could not upload file' })
        setUploadedFile(null)
      }
    } catch {
      toast.error('Upload failed', { description: 'Network error' })
      setUploadedFile(null)
    } finally {
      setUploading(false)
    }
  }

  const removeUploadedFile = () => {
    setUploadedFile(null)
    setUploadedFileUrl('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ─── Create Assignment ────────────────────────────────────
  const handleCreate = async () => {
    if (!createClassroomId || !createTitle.trim()) {
      toast.error('Please select a classroom and enter a title')
      return
    }
    try {
      setCreating(true)
      const res = await fetch('/api/portal/teacher/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify({
          classroomId: createClassroomId,
          title: createTitle.trim(),
          description: createDesc,
          instructions: createInstructions,
          dueDate: createDueDate,
          dueTime: createDueTime,
          maxScore: Number(createMaxScore) || 100,
          attachmentUrl: uploadedFileUrl,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Assignment created successfully')
        setCreateOpen(false)
        resetCreateForm()
        fetchAssignments()
      } else {
        toast.error(json.message || 'Failed to create assignment')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const resetCreateForm = () => {
    setCreateClassroomId('')
    setCreateTitle('')
    setCreateDesc('')
    setCreateInstructions('')
    setCreateDueDate('')
    setCreateDueTime('')
    setCreateMaxScore('100')
    setUploadedFile(null)
    setUploadedFileUrl('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this assignment and all submissions?')) return
    try {
      const res = await fetch(`/api/portal/teacher/assignments?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user?.id || '' },
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Assignment deleted')
        fetchAssignments()
        if (viewingAssignment?.id === id) setViewingAssignment(null)
      } else {
        toast.error(json.message || 'Failed to delete')
      }
    } catch {
      toast.error('Network error')
    }
  }

  const fetchSubmissions = async (assignment: AssignmentData) => {
    try {
      setLoadingSubmissions(true)
      setViewingAssignment(assignment)
      setGradingId(null)
      setGradeScore('')
      setGradeFeedback('')
      const res = await fetch(`/api/portal/teacher/assignments/${assignment.id}/submissions`, {
        headers: { 'x-user-id': user?.id || '' },
      })
      const json = await res.json()
      if (json.success) {
        setSubmissions(json.data)
      } else {
        setSubmissions([])
      }
    } catch {
      setSubmissions([])
    } finally {
      setLoadingSubmissions(false)
    }
  }

  const handleGrade = async (submissionId: string) => {
    if (!gradeScore) {
      toast.error('Please enter a score')
      return
    }
    try {
      setSavingGrade(true)
      const res = await fetch(`/api/portal/teacher/assignments/${viewingAssignment?.id}/submissions`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify({
          submissionId,
          score: Number(gradeScore),
          feedback: gradeFeedback,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Submission graded')
        setGradingId(null)
        setGradeScore('')
        setGradeFeedback('')
        if (viewingAssignment) fetchSubmissions(viewingAssignment)
        fetchAssignments()
      } else {
        toast.error(json.message || 'Failed to grade')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSavingGrade(false)
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'No date'
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'graded':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Graded</Badge>
      case 'submitted':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pending Review</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const isOverdue = (dueDate: string, dueTime: string) => {
    if (!dueDate) return false
    const due = new Date(`${dueDate}T${dueTime || '23:59'}`)
    return new Date() > due
  }

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <AlertCircle className="size-12 text-red-400" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={fetchAssignments}>Retry</Button>
      </div>
    )
  }

  // ─── Submissions Detail View ─────────────────────────────
  if (viewingAssignment) {
    const FileIcon = viewingAssignment.attachmentUrl ? getFileIcon(viewingAssignment.attachmentUrl) : FileText

    return (
      <div className="space-y-6 p-4 md:p-6">
        <Button variant="ghost" className="gap-2" onClick={() => setViewingAssignment(null)}>
          <ChevronLeft className="size-4" />
          Back to Assignments
        </Button>

        {/* Assignment Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-xl">{viewingAssignment.title}</CardTitle>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ClipboardList className="size-3.5" />
                    {viewingAssignment.classroom?.name}
                  </span>
                  {viewingAssignment.dueDate && (
                    <span className={cn("flex items-center gap-1", isOverdue(viewingAssignment.dueDate, viewingAssignment.dueTime) && "text-red-600 font-medium")}>
                      <Calendar className="size-3.5" />
                      {formatDate(viewingAssignment.dueDate)}
                      {viewingAssignment.dueTime && (
                        <>
                          <Clock className="ml-1 size-3" />
                          {viewingAssignment.dueTime}
                        </>
                      )}
                      {isOverdue(viewingAssignment.dueDate, viewingAssignment.dueTime) && "(Overdue)"}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="size-3.5" />
                    Max: {viewingAssignment.maxScore} pts
                  </span>
                </div>
              </div>
              <Badge
                className={cn(
                  'shrink-0',
                  isOverdue(viewingAssignment.dueDate, viewingAssignment.dueTime)
                    ? 'bg-red-100 text-red-700'
                    : 'bg-emerald-100 text-emerald-700'
                )}
              >
                {isOverdue(viewingAssignment.dueDate, viewingAssignment.dueTime) ? 'Overdue' : 'Active'}
              </Badge>
            </div>
          </CardHeader>
          {viewingAssignment.description && (
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground leading-relaxed">{viewingAssignment.description}</p>
            </CardContent>
          )}
          {viewingAssignment.instructions && (
            <CardContent className="pt-0">
              <div className="rounded-lg bg-slate-50 border p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Instructions</p>
                <p className="text-sm text-slate-700 whitespace-pre-line">{viewingAssignment.instructions}</p>
              </div>
            </CardContent>
          )}
          {viewingAssignment.attachmentUrl && (
            <CardContent className="pt-0">
              <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Attached File</p>
                <a
                  href={viewingAssignment.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-white border px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:shadow-md transition-shadow"
                >
                  <FileIcon className="size-5 text-blue-500" />
                  <span className="truncate max-w-[200px]">
                    {viewingAssignment.attachmentUrl.split('/').pop()?.split('?')[0] || 'Download file'}
                  </span>
                  <Download className="size-4 text-slate-400" />
                </a>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Submissions Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Submissions
              <Badge variant="secondary" className="font-normal">{submissions.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingSubmissions ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : submissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <ClipboardList className="mb-2 size-8 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">No submissions yet</p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Students can submit from their portal
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead className="hidden sm:table-cell">Reg No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Attachment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((sub) => {
                      const SubFileIcon = sub.attachmentUrl ? getFileIcon(sub.attachmentUrl) : FileText
                      return (
                        <TableRow key={sub.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{sub.studentName}</p>
                              {sub.content && (
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{sub.content}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                            {sub.studentRegNo}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDate(sub.submittedAt)}
                          </TableCell>
                          <TableCell>
                            {sub.attachmentUrl ? (
                              <a
                                href={sub.attachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                              >
                                <SubFileIcon className="size-3.5 text-blue-500" />
                                View
                              </a>
                            ) : sub.content ? (
                              <span className="text-xs text-muted-foreground">Text only</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(sub.status)}</TableCell>
                          <TableCell>
                            {sub.score > 0 ? (
                              <span className="font-bold text-emerald-600">
                                {sub.score}/{viewingAssignment.maxScore}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {gradingId === sub.id ? (
                              <div className="flex items-center gap-2 justify-end">
                                <Input
                                  type="number"
                                  min={0}
                                  max={viewingAssignment.maxScore}
                                  value={gradeScore}
                                  onChange={(e) => setGradeScore(e.target.value)}
                                  placeholder="Score"
                                  className="h-8 w-20 text-center text-sm"
                                />
                                <Button
                                  size="sm"
                                  disabled={savingGrade}
                                  onClick={() => handleGrade(sub.id)}
                                  className="h-8 gap-1 text-white"
                                  style={{ backgroundColor: primaryColor }}
                                >
                                  {savingGrade ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle className="size-3" />}
                                  Save
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8" onClick={() => setGradingId(null)}>
                                  <X className="size-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                onClick={() => {
                                  setGradingId(sub.id)
                                  setGradeScore(sub.score > 0 ? String(sub.score) : '')
                                  setGradeFeedback(sub.feedback || '')
                                }}
                              >
                                {sub.score > 0 ? 'Edit' : 'Grade'}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feedback + Grade detail panel */}
        {gradingId && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <Label className="text-sm font-medium">Feedback (optional)</Label>
                <Textarea
                  value={gradeFeedback}
                  onChange={(e) => setGradeFeedback(e.target.value)}
                  placeholder="Add detailed feedback for this student's submission..."
                  className="mt-1.5 min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // ─── Assignments List View ────────────────────────────────
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Assignments</h1>
          <p className="text-sm text-muted-foreground">
            {assignments.length} assignment{assignments.length !== 1 ? 's' : ''} created
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) resetCreateForm()
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2 text-white" style={{ backgroundColor: primaryColor }}>
              <Plus className="size-4" />
              New Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Assignment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {/* Classroom */}
              <div className="space-y-1.5">
                <Label>Classroom *</Label>
                <Select value={createClassroomId} onValueChange={setCreateClassroomId}>
                  <SelectTrigger><SelectValue placeholder="Select classroom" /></SelectTrigger>
                  <SelectContent>
                    {classrooms.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} placeholder="e.g. Chapter 5 Practice Problems" />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={createDesc} onChange={(e) => setCreateDesc(e.target.value)} placeholder="Brief description of the assignment..." className="min-h-[80px]" />
              </div>

              {/* Instructions */}
              <div className="space-y-1.5">
                <Label>Instructions</Label>
                <Textarea value={createInstructions} onChange={(e) => setCreateInstructions(e.target.value)} placeholder="Step-by-step instructions for students..." className="min-h-[80px]" />
              </div>

              {/* ─── File Upload Section ─── */}
              <div className="space-y-1.5">
                <Label>Attach File (PDF, DOC, Image)</Label>
                <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 text-center transition-colors hover:border-slate-300">
                  {uploadedFile ? (
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                        <FileText className="size-5 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium truncate">{uploadedFile.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(uploadedFile.size)}</p>
                      </div>
                      {uploading ? (
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      ) : (
                        <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={removeUploadedFile}>
                          <X className="size-4" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.txt"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        className="gap-2 text-slate-500 hover:text-slate-700"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        <Upload className="size-4" />
                        {uploading ? 'Uploading...' : 'Click to upload assignment file'}
                      </Button>
                      <p className="mt-1 text-xs text-muted-foreground">PDF, DOC, DOCX, JPG, PNG — Max 10MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Date / Time / Score */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Due Date</Label>
                  <Input type="date" value={createDueDate} onChange={(e) => setCreateDueDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Due Time</Label>
                  <Input type="time" value={createDueTime} onChange={(e) => setCreateDueTime(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Max Score</Label>
                  <Input type="number" min={1} value={createMaxScore} onChange={(e) => setCreateMaxScore(e.target.value)} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setCreateOpen(false); resetCreateForm() }}>Cancel</Button>
                <Button
                  onClick={handleCreate}
                  disabled={creating || uploading}
                  className="gap-2 text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  {creating && <Loader2 className="size-4 animate-spin" />}
                  {creating ? 'Creating...' : 'Create Assignment'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Empty state */}
      {assignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <ClipboardList className="mb-3 size-12 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">No assignments created yet</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Click &ldquo;New Assignment&rdquo; to create your first assignment
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {assignments.map((assignment) => {
            const overdue = isOverdue(assignment.dueDate, assignment.dueTime)
            const AttachIcon = assignment.attachmentUrl ? getFileIcon(assignment.attachmentUrl) : Paperclip
            return (
              <Card key={assignment.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-semibold">{assignment.title}</h3>
                        {assignment.attachmentUrl && (
                          <AttachIcon className="size-4 shrink-0 text-blue-500" />
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{assignment.classroom?.name}</p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'shrink-0',
                        overdue ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                      )}
                    >
                      {overdue ? 'Overdue' : 'Active'}
                    </Badge>
                  </div>

                  {assignment.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{assignment.description}</p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {assignment.dueDate && (
                      <span className={cn("flex items-center gap-1", overdue && "text-red-600")}>
                        <Calendar className="size-3" />
                        {formatDate(assignment.dueDate)}
                        {assignment.dueTime && <><Clock className="ml-0.5 size-3" />{assignment.dueTime}</>}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="size-3" />
                      {assignment._count?.submissions || 0} submitted
                    </span>
                    <span className="font-medium">/{assignment.maxScore} pts</span>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={() => fetchSubmissions(assignment)}
                    >
                      <Eye className="size-3.5" />
                      View ({assignment._count?.submissions || 0})
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:bg-red-50 hover:text-red-600"
                      onClick={() => handleDelete(assignment.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}