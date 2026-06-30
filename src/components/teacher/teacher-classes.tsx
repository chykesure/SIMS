'use client'

import React, { useState, useEffect } from 'react'
import { useAppStore } from '@/store/index'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  School,
  Users,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ClassData {
  id: string
  title: string
  studentCount: number
}

interface StudentInfo {
  id: string
  fullname: string
  regNo: string
  gender: string
  class: string
}

export function TeacherClasses() {
  const { tenant } = useAppStore()
  const [classes, setClasses] = useState<ClassData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [expandedClass, setExpandedClass] = useState<string | null>(null)
  const [students, setStudents] = useState<StudentInfo[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)

  const primaryColor = tenant?.primaryColor || '#821329'

  useEffect(() => {
    fetchClasses()
  }, [])

  const fetchClasses = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/portal/teacher/classes')
      const json = await res.json()
      if (json.success) {
        setClasses(json.data)
      } else {
        setError(json.message || 'Failed to load classes')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchStudents = async (classTitle: string) => {
    if (expandedClass === classTitle) {
      setExpandedClass(null)
      setStudents([])
      return
    }
    try {
      setLoadingStudents(true)
      setExpandedClass(classTitle)
      const res = await fetch(`/api/students?class=${encodeURIComponent(classTitle)}`)
      const json = await res.json()
      if (Array.isArray(json)) {
        setStudents(json)
      } else if (json.success && Array.isArray(json.data)) {
        setStudents(json.data)
      } else {
        setStudents([])
      }
    } catch {
      setStudents([])
    } finally {
      setLoadingStudents(false)
    }
  }

  const filteredClasses = classes.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  )

  const totalStudents = classes.reduce((sum, c) => sum + c.studentCount, 0)

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
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
        <Button variant="outline" onClick={fetchClasses}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Classes</h1>
          <p className="text-sm text-muted-foreground">
            {classes.length} classes &middot; {totalStudents} students total
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search classes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2"
            style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Classes grid */}
      {filteredClasses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12">
          <School className="mb-3 size-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            {search ? 'No classes match your search' : 'No classes found'}
          </p>
          {search && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setSearch('')}
            >
              Clear search
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClasses.map((cls) => (
            <div key={cls.id}>
              <Card
                className="cursor-pointer transition-all hover:shadow-md"
                onClick={() => fetchStudents(cls.title)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-white text-sm font-bold"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <School className="size-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{cls.title}</h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="size-3" />
                          <span>
                            {cls.studentCount}{' '}
                            {cls.studentCount === 1 ? 'student' : 'students'}
                          </span>
                        </div>
                      </div>
                    </div>
                    {expandedClass === cls.title ? (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-4 text-muted-foreground" />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Expanded student list */}
              {expandedClass === cls.title && (
                <div className="mt-2 rounded-xl border bg-card">
                  <div className="border-b px-4 py-3">
                    <p className="text-sm font-medium">
                      Students in {cls.title}
                    </p>
                  </div>
                  {loadingStudents ? (
                    <div className="space-y-2 p-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : students.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-sm text-muted-foreground">
                        No students in this class
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto">
                      {students.map((student, idx) => (
                        <div
                          key={student.id}
                          className={cn(
                            'flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50',
                            idx !== students.length - 1 && 'border-b'
                          )}
                        >
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-medium">{student.fullname}</p>
                            <p className="text-xs text-muted-foreground">{student.regNo}</p>
                          </div>
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            {student.gender}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
