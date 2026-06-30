'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/index'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  Clock,
  Calendar,
  FileText,
  Send,
  Loader2,
  BookOpen,
  Filter,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AssignmentSubmission {
  id: string
  content: string
  score: number
  feedback: string
  status: string
  submittedAt: string
  gradedAt: string | null
}

interface Assignment {
  id: string
  title: string
  description: string
  instructions: string
  dueDate: string
  dueTime: string
  maxScore: number
  status: string
  classroomName: string
  classroomSubject: string
  classroomSection: string
  createdByName: string
  createdAt: string
  totalSubmissions: number
  submission: AssignmentSubmission | null
  submitted: boolean
  overdue: boolean
}

export function StudentAssignments() {
  const { tenant, user } = useAppStore()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted' | 'overdue'>('all')
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [submitContent, setSubmitContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)

  const primaryColor = tenant?.primaryColor || '#821329'

  const fetchAssignments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/portal/student/assignments', {
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
  }, [fetchAssignments])

  const filteredAssignments = assignments.filter(a => {
    if (filter === 'pending') return !a.submitted && !a.overdue && a.status === 'active'
    if (filter === 'submitted') return a.submitted
    if (filter === 'overdue') return a.overdue
    return true
  })

  const openDetail = (assignment: Assignment) => {
    setSelectedAssignment(assignment)
    setSubmitContent(assignment.submission?.content || '')
    setDetailOpen(true)
  }

  const handleSubmit = async () => {
    if (!selectedAssignment) return

    if (!submitContent.trim()) {
      toast.error('Please enter your submission content')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/portal/student/assignments/${selectedAssignment.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify({ content: submitContent.trim() }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message || 'Assignment submitted successfully!')
        setDetailOpen(false)
        fetchAssignments()
      } else {
        toast.error(json.message || 'Failed to submit assignment')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (assignment: Assignment) => {
    if (assignment.submitted) {
      const isGraded = assignment.submission?.score && assignment.submission.score > 0
      if (isGraded) {
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs">Graded: {assignment.submission!.score}/{assignment.maxScore}</Badge>
      }
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs">Submitted</Badge>
    }
    if (assignment.overdue) {
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs">Overdue</Badge>
    }
    return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs">Pending</Badge>
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={fetchAssignments} variant="outline" size="sm">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Stats
  const totalPending = assignments.filter(a => !a.submitted && !a.overdue && a.status === 'active').length
  const totalSubmitted = assignments.filter(a => a.submitted).length
  const totalOverdue = assignments.filter(a => a.overdue).length

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">My Assignments</h1>
        <p className="text-sm text-muted-foreground">
          View and submit your assignments
        </p>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-lg font-bold text-amber-600">{totalPending}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Submitted</p>
                <p className="text-lg font-bold text-emerald-600">{totalSubmitted}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Overdue</p>
                <p className="text-lg font-bold text-red-600">{totalOverdue}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {(['all', 'pending', 'submitted', 'overdue'] as const).map(f => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            className="text-xs capitalize"
            onClick={() => setFilter(f)}
            style={filter === f ? { backgroundColor: primaryColor } : undefined}
          >
            {f === 'all' ? 'All' : f}
            <Badge variant="secondary" className="ml-1.5 bg-white/20 text-white px-1.5 py-0 text-[10px]">
              {f === 'all' ? assignments.length : filteredAssignments.length}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Assignment List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredAssignments.length > 0 ? (
        <div className="space-y-4">
          {filteredAssignments.map(assignment => (
            <Card
              key={assignment.id}
              className={cn(
                'cursor-pointer transition-colors hover:shadow-md',
                assignment.overdue && !assignment.submitted && 'border-red-200'
              )}
              onClick={() => openDetail(assignment)}
            >
              <CardContent className="p-4 md:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold truncate">{assignment.title}</h3>
                      {getStatusBadge(assignment)}
                    </div>
                    {assignment.classroomSubject && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {assignment.classroomSubject}
                        {assignment.classroomName && ` — ${assignment.classroomName}`}
                      </p>
                    )}
                    {assignment.description && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {assignment.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                      {assignment.dueDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due: {formatDate(assignment.dueDate)}
                          {assignment.dueTime && ` ${assignment.dueTime}`}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Max Score: {assignment.maxScore}
                      </span>
                    </div>
                  </div>
                  {assignment.submitted && assignment.submission?.feedback && (
                    <div className="shrink-0 text-xs bg-emerald-50 text-emerald-700 rounded-lg p-2 max-w-[200px]">
                      <p className="font-medium">Feedback:</p>
                      <p className="mt-0.5 line-clamp-2">{assignment.submission.feedback}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">
              {filter === 'all' ? 'No assignments yet' : `No ${filter} assignments`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {filter === 'all'
                ? 'Assignments posted by your teachers will appear here'
                : `You have no ${filter} assignments at this time`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Detail / Submit Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedAssignment?.title}</DialogTitle>
            <DialogDescription>
              {selectedAssignment?.classroomSubject}
              {selectedAssignment?.classroomName && ` — ${selectedAssignment.classroomName}`}
            </DialogDescription>
          </DialogHeader>

          {selectedAssignment && (
            <div className="space-y-4">
              {/* Status & Due */}
              <div className="flex flex-wrap items-center gap-2">
                {getStatusBadge(selectedAssignment)}
                {selectedAssignment.dueDate && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Due: {formatDate(selectedAssignment.dueDate)}
                    {selectedAssignment.dueTime && ` ${selectedAssignment.dueTime}`}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  Max Score: {selectedAssignment.maxScore}
                </span>
              </div>

              <Separator />

              {/* Description */}
              {selectedAssignment.description && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedAssignment.description}
                  </p>
                </div>
              )}

              {/* Instructions */}
              {selectedAssignment.instructions && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Instructions</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedAssignment.instructions}
                  </p>
                </div>
              )}

              {/* Submission Status */}
              {selectedAssignment.submitted && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-sm font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Submitted on {formatDate(selectedAssignment.submission!.submittedAt)}
                  </p>
                  {selectedAssignment.submission!.score > 0 && (
                    <p className="mt-1 text-sm text-emerald-600 font-medium">
                      Score: {selectedAssignment.submission!.score}/{selectedAssignment.maxScore}
                    </p>
                  )}
                  {selectedAssignment.submission!.feedback && (
                    <div className="mt-2 rounded-lg bg-white p-2 border">
                      <p className="text-xs font-medium text-muted-foreground">Teacher's Feedback:</p>
                      <p className="text-sm mt-0.5">{selectedAssignment.submission!.feedback}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Submit Form (only if not closed) */}
              {selectedAssignment.status !== 'archived' && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      {selectedAssignment.submitted ? 'Update Your Submission' : 'Submit Your Work'}
                    </h4>
                    <Textarea
                      placeholder="Type your answer here..."
                      className="min-h-[120px]"
                      value={submitContent}
                      onChange={(e) => setSubmitContent(e.target.value)}
                    />
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDetailOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting || !submitContent.trim()}
                      style={{ backgroundColor: primaryColor }}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          {selectedAssignment.submitted ? 'Update Submission' : 'Submit'}
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
