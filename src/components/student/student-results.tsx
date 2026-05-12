'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/index'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
  Award,
  Trophy,
  TrendingUp,
  Users,
  AlertCircle,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Score {
  id: string
  subject: string
  firstCa: number
  secondCa: number
  thirdCa: number
  exam: number
  total: number
  grade: string
  position: number | null
  subjectTotalStudents: number | null
}

interface StudentRecord {
  attendance: number
  subjectsPassed: number
  subjectsFailed: number
  percentage: number
}

interface FilterOption {
  session: string
  term: string
}

interface ResultsData {
  student: { fullname: string; class: string; regNo: string }
  session: string
  term: string
  scores: Score[]
  totalScore: number
  average: number
  subjectsTaken: number
  classPosition: number | null
  overallPosition: number | null
  totalStudents: number
  studentRecord: StudentRecord | null
  availableFilters: FilterOption[]
}

export function StudentResults() {
  const { tenant, user } = useAppStore()
  const [data, setData] = useState<ResultsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSession, setSelectedSession] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('')

  const primaryColor = tenant?.primaryColor || '#821329'

  const fetchResults = useCallback(async (session?: string, term?: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (session) params.set('session', session)
      if (term) params.set('term', term)
      const res = await fetch(`/api/portal/student/results?${params.toString()}`, {
        headers: { 'x-user-id': user?.id || '' },
      })
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      } else {
        setError(json.message || 'Failed to load results')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchResults()
  }, [fetchResults])

  useEffect(() => {
    if (data?.session && !selectedSession) {
      setSelectedSession(data.session)
      if (data.term) setSelectedTerm(data.term)
    }
  }, [data, selectedSession])

  const handleSessionChange = (value: string) => {
    setSelectedSession(value)
  }

  const handleTermChange = (value: string) => {
    setSelectedTerm(value)
  }

  const handleApplyFilter = () => {
    fetchResults(selectedSession, selectedTerm)
  }

  // Get unique sessions and terms for filter dropdowns
  const uniqueSessions = data?.availableFilters
    ? [...new Set(data.availableFilters.map(f => f.session))]
    : []
  const uniqueTerms = data?.availableFilters
    ? [...new Set(data.availableFilters.map(f => f.term))]
    : []

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-emerald-100 text-emerald-700'
      case 'B': return 'bg-emerald-100 text-emerald-700'
      case 'C': return 'bg-amber-100 text-amber-700'
      case 'D': return 'bg-amber-100 text-amber-700'
      case 'E': return 'bg-red-100 text-red-700'
      case 'F': return 'bg-red-100 text-red-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const getPositionSuffix = (pos: number) => {
    if (pos === 1) return 'st'
    if (pos === 2) return 'nd'
    if (pos === 3) return 'rd'
    return 'th'
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
            <Button onClick={() => fetchResults(selectedSession, selectedTerm)} variant="outline" size="sm">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">My Results</h1>
        <p className="text-sm text-muted-foreground">
          View your academic performance across sessions and terms
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Session</label>
              <Select value={selectedSession} onValueChange={handleSessionChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueSessions.length > 0 ? (
                    uniqueSessions.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value={data?.session || ''} disabled>
                      {data?.session || 'No sessions available'}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Term</label>
              <Select value={selectedTerm} onValueChange={handleTermChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueTerms.length > 0 ? (
                    uniqueTerms.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value={data?.term || ''} disabled>
                      {data?.term || 'No terms available'}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleApplyFilter} disabled={loading}>
              Apply Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {!loading && data && data.scores.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Average Score</p>
                <p className="text-lg font-bold text-emerald-600">{data.average}%</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50">
                <BookOpen className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Subjects Taken</p>
                <p className="text-lg font-bold text-amber-600">{data.subjectsTaken}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                <Trophy className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Class Position</p>
                <p className="text-lg font-bold text-blue-600">
                  {data.classPosition ? `${data.classPosition}${getPositionSuffix(data.classPosition)} of ${data.totalStudents}` : 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <Award className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Score</p>
                <p className="text-lg font-bold text-slate-600">{data.totalScore}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {data?.session && data?.term
                ? `${data.session} — ${data.term}`
                : 'Exam Results'}
            </CardTitle>
            {data && data.scores.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {data.student.fullname} &middot; {data.student.class}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : data && data.scores.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">#</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead className="text-center">CA1</TableHead>
                      <TableHead className="text-center">CA2</TableHead>
                      <TableHead className="text-center">CA3</TableHead>
                      <TableHead className="text-center">Exam</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">Grade</TableHead>
                      <TableHead className="text-center">Position</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.scores.map((score, index) => (
                      <TableRow key={score.id}>
                        <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="font-medium">{score.subject}</TableCell>
                        <TableCell className="text-center">{score.firstCa}</TableCell>
                        <TableCell className="text-center">{score.secondCa}</TableCell>
                        <TableCell className="text-center">{score.thirdCa}</TableCell>
                        <TableCell className="text-center">{score.exam}</TableCell>
                        <TableCell className="text-center font-bold">{score.total}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className={cn('text-xs', getGradeColor(score.grade))}>
                            {score.grade}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {score.position ? `${score.position}/${score.subjectTotalStudents}` : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {data.scores.map((score, index) => (
                  <div key={score.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium">{score.subject}</span>
                      </div>
                      <Badge variant="secondary" className={cn('text-xs', getGradeColor(score.grade))}>
                        {score.grade}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <p className="text-[10px] text-muted-foreground">CA1</p>
                        <p className="text-sm font-medium">{score.firstCa}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">CA2</p>
                        <p className="text-sm font-medium">{score.secondCa}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Exam</p>
                        <p className="text-sm font-medium">{score.exam}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Total</p>
                        <p className="text-sm font-bold">{score.total}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Student Record Info */}
              {data.studentRecord && (
                <div className="mt-4 rounded-lg border bg-muted/30 p-4">
                  <h4 className="text-sm font-medium mb-2">Additional Information</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Attendance</p>
                      <p className="text-sm font-medium">{data.studentRecord.attendance}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Subjects Passed</p>
                      <p className="text-sm font-medium text-emerald-600">{data.studentRecord.subjectsPassed}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Subjects Failed</p>
                      <p className="text-sm font-medium text-red-600">{data.studentRecord.subjectsFailed}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Percentage</p>
                      <p className="text-sm font-medium">{data.studentRecord.percentage}%</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">No results found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Results for this session/term are not yet available
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
