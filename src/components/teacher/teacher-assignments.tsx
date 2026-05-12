'use client'

import React, { useState, useEffect, useCallback } from 'react'
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
    // Fetch classrooms for the create dialog
    fetch('/api/classrooms')
      .then((r) => r.json())
      .then((json) => {
        const data = json.success ? json.data : []
        setClassrooms(data)
      })
      .catch(() => {})
  }, [fetchAssignments])

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
        if (viewingAssignment?.id === id) {
          setViewingAssignment(null)
        }
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
        // Refresh submissions
        if (viewingAssignment) {
          fetchSubmissions(viewingAssignment)
        }
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
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pending</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
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

  // Submissions detail view
  if (viewingAssignment) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        {/* Back button */}
        <Button
          variant="ghost"
          className="gap-2"
          onClick={() => setViewingAssignment(null)}
        >
          <ChevronLeft className="size-4" />
          Back to Assignments
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{viewingAssignment.title}</CardTitle>
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <ClipboardList className="size-3.5" />
                {viewingAssignment.classroom?.name}
              </span>
              {viewingAssignment.dueDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  {formatDate(viewingAssignment.dueDate)}
                  {viewingAssignment.dueTime && (
                    <Clock className="ml-1 size-3" />
                  )}
                  {viewingAssignment.dueTime}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="size-3.5" />
                Max Score: {viewingAssignment.maxScore}
              </span>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Submissions ({submissions.length})
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
                <p className="text-sm text-muted-foreground">
                  No submissions yet
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead className="hidden sm:table-cell">Reg No</TableHead>
                    <TableHead>Date Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium text-sm">
                        {sub.studentName}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                        {sub.studentRegNo}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(sub.submittedAt)}
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
                              {savingGrade ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <CheckCircle className="size-3" />
                              )}
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8"
                              onClick={() => setGradingId(null)}
                            >
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
                            {sub.score > 0 ? 'Edit Grade' : 'Grade'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Feedback textarea for grading */}
        {gradingId && (
          <Card>
            <CardContent className="p-4">
              <Label className="text-sm font-medium">Feedback (optional)</Label>
              <Textarea
                value={gradeFeedback}
                onChange={(e) => setGradeFeedback(e.target.value)}
                placeholder="Add feedback for this submission..."
                className="mt-2 min-h-[80px]"
              />
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // Assignments list view
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

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button
              className="gap-2 text-white"
              style={{ backgroundColor: primaryColor }}
            >
              <Plus className="size-4" />
              New Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Assignment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Classroom *</Label>
                <Select value={createClassroomId} onValueChange={setCreateClassroomId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select classroom" />
                  </SelectTrigger>
                  <SelectContent>
                    {classrooms.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="Assignment title"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  placeholder="Brief description of the assignment..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Instructions</Label>
                <Textarea
                  value={createInstructions}
                  onChange={(e) => setCreateInstructions(e.target.value)}
                  placeholder="Step-by-step instructions..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={createDueDate}
                    onChange={(e) => setCreateDueDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Due Time</Label>
                  <Input
                    type="time"
                    value={createDueTime}
                    onChange={(e) => setCreateDueTime(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Max Score</Label>
                  <Input
                    type="number"
                    min={1}
                    value={createMaxScore}
                    onChange={(e) => setCreateMaxScore(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={creating}
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

      {/* Assignments list */}
      {assignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <ClipboardList className="mb-3 size-12 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">
            No assignments created yet
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Click &ldquo;New Assignment&rdquo; to create your first assignment
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {assignments.map((assignment) => (
            <Card key={assignment.id} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">{assignment.title}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {assignment.classroom?.name}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'shrink-0',
                      assignment.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {assignment.status}
                  </Badge>
                </div>

                {assignment.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {assignment.description}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {assignment.dueDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      {formatDate(assignment.dueDate)}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="size-3" />
                    {assignment._count?.submissions || 0} submissions
                  </span>
                  <span>/{assignment.maxScore} pts</span>
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
          ))}
        </div>
      )}
    </div>
  )
}
