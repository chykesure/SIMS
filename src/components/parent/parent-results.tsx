'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/index'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { Award, AlertCircle, BookOpen, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExamScoreData {
  id: string
  subject: string
  firstCa: number
  secondCa: number
  thirdCa: number
  exam: number
  total: number
  grade: string
  gradeColor: string
  session: string
  term: string
  class: string
}

interface FilterOption {
  session: string
  term: string
}

interface ResultsData {
  student: { id: string; fullname: string; class: string; regNo: string }
  examScores: ExamScoreData[]
  studentRecords: Array<{
    id: string
    session: string
    term: string
    class: string
    totalScore: number
    average: number
    percentage: number
    subjectsTaken: number
    subjectsPassed: number
    subjectsFailed: number
    classPosition: number
    overallPosition: number
    totalStudents: number
  }>
  classPositions: Array<{
    session: string
    term: string
    class: string
    classRef: string
    position: number
    totalStudents: number
    overallPosition: number
  }>
  latestRecord: Record<string, unknown> | null
  latestPosition: Record<string, unknown> | null
  availableFilters: FilterOption[]
  activeSession: string | null
  activeTerm: string | null
}

interface ChildOption {
  id: string
  fullname: string
  class: string
}

export function ParentResults() {
  const { user, tenant, selectedChildId, setSelectedChildId } = useAppStore()
  const primaryColor = tenant?.primaryColor || '#821329'

  const [children, setChildren] = useState<ChildOption[]>([])
  const [data, setData] = useState<ResultsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [session, setSession] = useState('')
  const [term, setTerm] = useState('')

  // Fetch parent children list
  const fetchChildren = useCallback(async () => {
    try {
      const res = await fetch('/api/portal/parent', {
        headers: { 'x-user-id': user?.id || '' },
      })
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data?.children) {
          setChildren(json.data.children.map((c: ChildOption) => ({
            id: c.id,
            fullname: c.fullname,
            class: c.class,
          })))
          if (json.data.children.length > 0 && !selectedChildId) {
            setSelectedChildId(json.data.children[0].id)
          }
        }
      }
    } catch {
      // silent
    }
  }, [user?.id, selectedChildId, setSelectedChildId])

  useEffect(() => {
    fetchChildren()
  }, [fetchChildren])

  // Fetch results
  const fetchResults = useCallback(async () => {
    if (!selectedChildId) return
    try {
      setLoading(true)
      setError('')
      const params = new URLSearchParams({ studentId: selectedChildId })
      if (session) params.set('session', session)
      if (term) params.set('term', term)

      const res = await fetch(`/api/portal/parent/results?${params}`)
      if (!res.ok) throw new Error('Failed to load results')
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      } else {
        throw new Error(json.message || 'Failed to load results')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [selectedChildId, session, term])

  useEffect(() => {
    fetchResults()
  }, [fetchResults])

  const availableFilters = data?.availableFilters || []
  const hasMultipleChildren = children.length > 1

  function getOrdinal(n: number): string {
    if (n === 0) return '—'
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
  }

  function getGradeBadgeColor(grade: string): string {
    switch (grade) {
      case 'A': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'B': return 'bg-emerald-50 text-emerald-600 border-emerald-200'
      case 'C': return 'bg-amber-50 text-amber-600 border-amber-200'
      case 'D': return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'E': return 'bg-red-50 text-red-500 border-red-200'
      case 'F': return 'bg-red-100 text-red-700 border-red-200'
      default: return 'bg-slate-50 text-slate-600 border-slate-200'
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Academic Results</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View {data?.student?.fullname || 'student'}&apos;s exam scores and academic records
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            {/* Child selector */}
            {hasMultipleChildren && (
              <div className="w-full sm:w-48">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Student
                </label>
                <Select
                  value={selectedChildId || ''}
                  onValueChange={(val) => {
                    setSelectedChildId(val)
                    setSession('')
                    setTerm('')
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {children.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.fullname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Session filter */}
            <div className="w-full sm:w-48">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Session
              </label>
              <Select
                value={session}
                onValueChange={(val) => {
                  setSession(val === '__all__' ? '' : val)
                  setTerm('')
                }}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Sessions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Sessions</SelectItem>
                  {availableFilters.map((f, i) => (
                    <SelectItem key={`${f.session}-${i}`} value={f.session}>
                      {f.session}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Term filter */}
            <div className="w-full sm:w-40">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Term
              </label>
              <Select
                value={term}
                onValueChange={(val) => setTerm(val === '__all__' ? '' : val)}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Terms</SelectItem>
                  {[...new Set(availableFilters.map((f) => f.term))].map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="size-12 text-red-400 mb-4" />
          <p className="text-lg font-medium text-foreground">{error}</p>
        </div>
      )}

      {/* Results content */}
      {data && !loading && !error && (
        <>
          {/* Class position summary cards */}
          {data.classPositions.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.classPositions.map((pos, i) => (
                <Card key={`${pos.session}-${pos.term}-${pos.class}-${i}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                        <Award className="size-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {pos.class} — {pos.session} {pos.term}
                        </p>
                        <p className="text-lg font-bold text-foreground">
                          {getOrdinal(pos.position)}
                          <span className="text-xs font-normal text-muted-foreground ml-1">
                            of {pos.totalStudents} students
                          </span>
                        </p>
                        {pos.overallPosition > 0 && (
                          <p className="text-[11px] text-muted-foreground">
                            Overall: {getOrdinal(pos.overallPosition)}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Student record summary */}
          {data.studentRecords.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                    <TrendingUp className="size-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Average</p>
                    <p className="text-sm font-bold text-foreground">
                      {data.studentRecords[0].average.toFixed(1)}%
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                    <BookOpen className="size-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Subjects</p>
                    <p className="text-sm font-bold text-foreground">
                      {data.studentRecords[0].subjectsTaken} taken, {data.studentRecords[0].subjectsPassed} passed
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                    <Award className="size-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Class Position</p>
                    <p className="text-sm font-bold text-foreground">
                      {getOrdinal(data.studentRecords[0].classPosition)} of {data.studentRecords[0].totalStudents}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                    <AlertCircle className="size-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Failed</p>
                    <p className="text-sm font-bold text-foreground">
                      {data.studentRecords[0].subjectsFailed} subjects
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Exam scores table */}
          {data.examScores.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BookOpen className="size-4" />
                  Subject Scores
                  {data.examScores[0]?.session && data.examScores[0]?.term && (
                    <Badge variant="outline" className="text-xs font-normal ml-2">
                      {data.examScores[0].session} — {data.examScores[0].term}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">S/N</TableHead>
                        <TableHead className="text-xs">Subject</TableHead>
                        <TableHead className="text-xs text-center">1st CA</TableHead>
                        <TableHead className="text-xs text-center">2nd CA</TableHead>
                        <TableHead className="text-xs text-center">3rd CA</TableHead>
                        <TableHead className="text-xs text-center">Exam</TableHead>
                        <TableHead className="text-xs text-center">Total</TableHead>
                        <TableHead className="text-xs text-center">Grade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.examScores.map((score, idx) => (
                        <TableRow key={score.id}>
                          <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="text-sm font-medium">{score.subject}</TableCell>
                          <TableCell className="text-xs text-center">{score.firstCa}</TableCell>
                          <TableCell className="text-xs text-center">{score.secondCa}</TableCell>
                          <TableCell className="text-xs text-center">{score.thirdCa}</TableCell>
                          <TableCell className="text-xs text-center">{score.exam}</TableCell>
                          <TableCell className="text-sm text-center font-semibold">{score.total}</TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={cn('text-xs font-bold', getGradeBadgeColor(score.grade))}
                            >
                              {score.grade}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            !loading && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <BookOpen className="size-12 text-slate-300 mb-4" />
                  <p className="text-lg font-medium text-foreground">No Results Found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    No exam scores are available for this selection
                  </p>
                </CardContent>
              </Card>
            )
          )}
        </>
      )}
    </div>
  )
}
