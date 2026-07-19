'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useAppStore } from '@/store/index'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  FileEdit,
  Save,
  Loader2,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface SessionData {
  id: string
  sessionOne: string
  sessionTwo: string
  active: string
}

interface ClassData {
  id: string
  title: string
}

interface SubjectData {
  id: string
  name: string
}

interface StudentInfo {
  id: string
  fullname: string
  regNo: string
  gender: string
  class: string
}

interface ScoreRow {
  fullname: string
  studentId: string
  firstCa: number
  secondCa: number
  thirdCa: number
  exam: number
  total: number
  [key: string]: string | number
}

interface AssessmentConfig {
  caCount: number
  ca1Label: string
  ca1Max: number
  ca2Label: string
  ca2Max: number
  ca3Label: string
  ca3Max: number
  examLabel: string
  examMax: number
}

const DEFAULT_ASSESSMENT: AssessmentConfig = {
  caCount: 2,
  ca1Label: '1st CA',
  ca1Max: 20,
  ca2Label: '2nd CA',
  ca2Max: 20,
  ca3Label: '3rd CA',
  ca3Max: 10,
  examLabel: 'Exam',
  examMax: 60,
}

export function TeacherScores() {
  const { user, tenant } = useAppStore()
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [classes, setClasses] = useState<ClassData[]>([])
  const [subjects, setSubjects] = useState<SubjectData[]>([])
  const [students, setStudents] = useState<StudentInfo[]>([])
  const [scores, setScores] = useState<ScoreRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [assessment, setAssessment] = useState<AssessmentConfig>(DEFAULT_ASSESSMENT)

  // Filters
  const [selectedSession, setSelectedSession] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [searchStudent, setSearchStudent] = useState('')

  const primaryColor = tenant?.primaryColor || '#821329'

  const caColumns = useMemo(() => {
    const cols: { field: 'firstCa' | 'secondCa' | 'thirdCa'; label: string; max: number }[] = []
    const fields: ('firstCa' | 'secondCa' | 'thirdCa')[] = ['firstCa', 'secondCa', 'thirdCa']
    const labels: string[] = assessment.caCount === 1
      ? ['CA']
      : ['CA1', 'CA2', 'CA3']
    const maxes = [assessment.ca1Max, assessment.ca2Max, assessment.ca3Max]
    for (let i = 0; i < assessment.caCount; i++) {
      cols.push({ field: fields[i], label: labels[i], max: maxes[i] })
    }
    return cols
  }, [assessment])

  useEffect(() => {
    fetchDropdowns()
    fetchAssessmentSettings()
  }, [])

  const fetchAssessmentSettings = async () => {
    try {
      const res = await fetch('/api/settings?type=school-settings')
      if (res.ok) {
        const data = await res.json()
        if (data && data.caCount) {
          setAssessment({
            caCount: data.caCount,
            ca1Label: data.ca1Label || '1st CA',
            ca1Max: data.ca1Max || 20,
            ca2Label: data.ca2Label || '2nd CA',
            ca2Max: data.ca2Max || 20,
            ca3Label: data.ca3Label || '3rd CA',
            ca3Max: data.ca3Max || 10,
            examLabel: data.examLabel || 'Exam',
            examMax: data.examMax || 60,
          })
        }
      }
    } catch {
      // use defaults
    }
  }

  const fetchDropdowns = async () => {
    try {
      setLoading(true)
      const [sessionsRes, classesRes, subjectsRes] = await Promise.all([
        fetch('/api/sessions'),
        fetch('/api/classes'),
        fetch('/api/subjects'),
      ])
      const [sessionsJson, classesJson, subjectsJson] = await Promise.all([
        sessionsRes.json(),
        classesRes.json(),
        subjectsRes.json(),
      ])
      const sessionsData = Array.isArray(sessionsJson) ? sessionsJson : (sessionsJson.success ? sessionsJson.data : [])
      const classesData = Array.isArray(classesJson) ? classesJson : (classesJson.success ? classesJson.data : [])
      const subjectsData = Array.isArray(subjectsJson) ? subjectsJson : (subjectsJson.success ? subjectsJson.data : [])
      setSessions(sessionsData)
      setClasses(classesData)
      setSubjects(subjectsData)
    } catch {
      toast.error('Failed to load dropdown data')
    } finally {
      setLoading(false)
    }
  }

  const activeSession = useMemo(() => {
    return sessions.find((s) => s.active === 'Yes')
  }, [sessions])

  const sessionDisplay = useMemo(() => {
    if (!selectedSession) return ''
    const s = sessions.find((s) => s.id === selectedSession)
    return s ? `${s.sessionOne}/${s.sessionTwo}` : ''
  }, [selectedSession, sessions])

  useEffect(() => {
    if (activeSession && !selectedSession) {
      setSelectedSession(activeSession.id)
    }
  }, [activeSession])

  useEffect(() => {
    if (!selectedSession) return
    setSelectedTerm('First Term')
  }, [selectedSession])

  const makeEmptyScore = (s: StudentInfo): ScoreRow => ({
    fullname: s.fullname,
    studentId: s.id,
    firstCa: 0,
    secondCa: 0,
    thirdCa: 0,
    exam: 0,
    total: 0,
  })

  // Single consolidated effect: prevents race condition where two separate
  // useEffects would flash 0-values on first parameter selection.
  const fetchSeqRef = useRef(0)
  useEffect(() => {
    if (!selectedClass) {
      setStudents([])
      setScores([])
      return
    }
    const classTitle = classes.find((c) => c.id === selectedClass)?.title || ''
    const seq = ++fetchSeqRef.current

    ;(async () => {
      try {
        setLoadingStudents(true)
        const res = await fetch(`/api/students?class=${encodeURIComponent(classTitle)}`)
        const json = await res.json()
        const studentData = Array.isArray(json) ? json : (json.success ? json.data : [])

        if (seq !== fetchSeqRef.current) return // stale request — bail out
        setStudents(studentData)

        if (selectedSubject && sessionDisplay && selectedTerm) {
          const subjectName = subjects.find((s) => s.id === selectedSubject)?.name || ''
          const params = new URLSearchParams({
            session: sessionDisplay,
            term: selectedTerm,
            class: classTitle,
            subject: subjectName,
          })
          const scoreRes = await fetch(`/api/portal/teacher/scores?${params}`)
          const scoreJson = await scoreRes.json()

          if (seq !== fetchSeqRef.current) return // stale — bail out
          const existingScores = scoreJson.success ? scoreJson.data : []
          const caFields: ('firstCa' | 'secondCa' | 'thirdCa')[] = ['firstCa', 'secondCa', 'thirdCa']

          setScores(
            studentData.map((s) => {
              const existing = existingScores.find(
                (sc: Record<string, unknown>) => sc.fullname === s.fullname
              )
              const row: ScoreRow = {
                fullname: s.fullname,
                studentId: s.id,
                firstCa: 0,
                secondCa: 0,
                thirdCa: 0,
                exam: existing ? Number(existing.exam) : 0,
                total: 0,
              }
              for (let i = 0; i < assessment.caCount; i++) {
                if (existing) {
                  row[caFields[i]] = Number(existing[caFields[i]])
                }
              }
              row.total = caFields.slice(0, assessment.caCount).reduce((sum, f) => sum + row[f], 0) + row.exam
              return row
            })
          )
        } else {
          if (seq !== fetchSeqRef.current) return
          setScores(studentData.map(makeEmptyScore))
        }
      } catch {
        if (seq !== fetchSeqRef.current) return
        toast.error('Failed to load students')
        setStudents([])
        setScores([])
      } finally {
        if (seq !== fetchSeqRef.current) return
        setLoadingStudents(false)
      }
    })()
  }, [selectedClass, selectedSubject, selectedTerm, selectedSession, assessment, sessionDisplay, classes, subjects])

  // Only sum the CA fields that are currently visible based on caCount.
  // This prevents ghost values in hidden CA fields from inflating the total.
  const computeTotal = (row: ScoreRow, changedField?: string, newVal?: number) => {
    const f = changedField
    const v = newVal ?? 0
    const caFields: ('firstCa' | 'secondCa' | 'thirdCa')[] = ['firstCa', 'secondCa', 'thirdCa']
    let sum = 0
    for (let i = 0; i < assessment.caCount; i++) {
      const field = caFields[i]
      sum += (f === field ? v : row[field])
    }
    sum += (f === 'exam' ? v : row.exam)
    return sum
  }

  const handleScoreChange = (
    index: number,
    field: 'firstCa' | 'secondCa' | 'thirdCa' | 'exam',
    value: string,
    max: number
  ) => {
    const numVal = Math.max(0, Math.min(max, Number(value) || 0))
    setScores((prev) => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        [field]: numVal,
        total: computeTotal(updated[index], field, numVal),
      }
      return updated
    })
  }

  const handleSave = async () => {
    if (!sessionDisplay || !selectedTerm || !selectedClass || !selectedSubject) {
      toast.error('Please select all filters before saving')
      return
    }
    const classTitle = classes.find((c) => c.id === selectedClass)?.title || ''
    const subjectName = subjects.find((s) => s.id === selectedSubject)?.name || ''

    if (scores.length === 0) {
      toast.error('No students to save scores for')
      return
    }

    // Zero out hidden CA fields and recompute total before saving.
    const caFields: ('firstCa' | 'secondCa' | 'thirdCa')[] = ['firstCa', 'secondCa', 'thirdCa']
    const cleanScores = scores.map((s) => {
      const row = { ...s }
      for (let i = assessment.caCount; i < 3; i++) {
        row[caFields[i]] = 0
      }
      row.total = caFields.slice(0, assessment.caCount).reduce((sum, f) => sum + row[f], 0) + row.exam
      return row
    })

    try {
      setSaving(true)
      const res = await fetch('/api/portal/teacher/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify({
          session: sessionDisplay,
          term: selectedTerm,
          class: classTitle,
          subject: subjectName,
          scores: cleanScores,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message || `Scores saved successfully (${json.data.created} new, ${json.data.updated} updated)`)
        try {
          await fetch(`/api/results/compute?${new URLSearchParams({ session: sessionDisplay, class: classTitle, term: selectedTerm })}`)
        } catch { /* non-critical */ }
      } else {
        toast.error(json.message || 'Failed to save scores')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const filteredScores = useMemo(() => {
    if (!searchStudent) return scores.map((s, i) => ({ ...s, _index: i }))
    return scores
      .map((s, i) => ({ ...s, _index: i }))
      .filter((s) => s.fullname.toLowerCase().includes(searchStudent.toLowerCase()))
  }, [scores, searchStudent])

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Score Entry</h1>
          <p className="text-sm text-muted-foreground">
            Enter and manage exam scores for your students
          </p>
        </div>
        {scores.length > 0 && (
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 text-white"
            style={{ backgroundColor: primaryColor }}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {saving ? 'Saving...' : 'Save All Scores'}
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Session</Label>
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger>
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.sessionOne}/{s.sessionTwo}
                      {s.active === 'Yes' && ' (Active)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Term</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger>
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="First Term">First Term</SelectItem>
                  <SelectItem value="Second Term">Second Term</SelectItem>
                  <SelectItem value="Third Term">Third Term</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score table */}
      {selectedClass && selectedSubject ? (
        loadingStudents ? (
          <Card>
            <CardContent className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12">
            <FileEdit className="mb-3 size-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">
              No students found in this class
            </p>
          </div>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">
                  {classes.find((c) => c.id === selectedClass)?.title} &mdash;{' '}
                  {subjects.find((s) => s.id === selectedSubject)?.name}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({filteredScores.length} students)
                  </span>
                </CardTitle>
                <div className="relative w-full sm:w-48">
                  <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search student..."
                    value={searchStudent}
                    onChange={(e) => setSearchStudent(e.target.value)}
                    className="h-8 w-full rounded-md border bg-background pl-8 pr-3 text-xs outline-none focus:ring-2"
                    style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 text-center">#</TableHead>
                      <TableHead className="min-w-[180px]">Student Name</TableHead>
                      {caColumns.map((col) => (
                        <TableHead key={col.field} className="w-24 text-center">
                          {col.label}
                          <span className="block text-[10px] font-normal text-muted-foreground">
                            max {col.max}
                          </span>
                        </TableHead>
                      ))}
                      <TableHead className="w-24 text-center">
                        {assessment.examLabel}
                        <span className="block text-[10px] font-normal text-muted-foreground">
                          max {assessment.examMax}
                        </span>
                      </TableHead>
                      <TableHead className="w-24 text-center font-bold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredScores.map((row, idx) => (
                      <TableRow key={row.studentId}>
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {row.fullname}
                        </TableCell>
                        {caColumns.map((col) => (
                          <TableCell key={col.field} className="p-1">
                            <Input
                              type="number"
                              min={0}
                              max={col.max}
                              value={row[col.field] || ''}
                              onChange={(e) =>
                                handleScoreChange(row._index!, col.field, e.target.value, col.max)
                              }
                              onBlur={(e) => {
                                const v = Number(e.target.value) || 0
                                if (v > col.max) {
                                  handleScoreChange(row._index!, col.field, String(col.max), col.max)
                                }
                              }}
                              placeholder="0"
                              className="h-8 w-20 text-center text-sm"
                            />
                          </TableCell>
                        ))}
                        <TableCell className="p-1">
                          <Input
                            type="number"
                            min={0}
                            max={assessment.examMax}
                            value={row.exam || ''}
                            onChange={(e) =>
                              handleScoreChange(row._index!, 'exam', e.target.value, assessment.examMax)
                            }
                            onBlur={(e) => {
                              const v = Number(e.target.value) || 0
                              if (v > assessment.examMax) {
                                handleScoreChange(row._index!, 'exam', String(assessment.examMax), assessment.examMax)
                              }
                            }}
                            placeholder="0"
                            className="h-8 w-20 text-center text-sm"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={cn(
                              'inline-flex h-8 w-20 items-center justify-center rounded-md text-sm font-bold',
                              row.total > 0
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'text-muted-foreground'
                            )}
                          >
                            {row.total || 0}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <FileEdit className="mb-3 size-12 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">
            Select a class and subject to enter scores
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Choose from the dropdowns above to get started
          </p>
        </div>
      )}
    </div>
  )
}