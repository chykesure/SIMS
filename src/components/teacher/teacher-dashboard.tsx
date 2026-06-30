'use client'

import React, { useState, useEffect } from 'react'
import { useAppStore } from '@/store/index'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  Users,
  BookOpen,
  ClipboardList,
  Megaphone,
  FileEdit,
  School,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TeacherData {
  teacher: {
    id: string
    fullname: string
    subject: string
    gender: string
    phone: string
    email: string
    active: string
    imageUrl: string
  }
  stats: {
    studentCount: number
    examScoreCount: number
    assignmentCount: number
    announcementCount: number
    pendingSubmissions: number
    subjectsTaught: number
  }
  subjects: string[]
}

export function TeacherDashboard() {
  const { user, tenant, navigate } = useAppStore()
  const [data, setData] = useState<TeacherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const primaryColor = tenant?.primaryColor || '#821329'

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/portal/teacher', {
        headers: { 'x-user-id': user?.id || '' },
      })
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      } else {
        setError(json.message || 'Failed to load dashboard')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <AlertCircle className="size-12 text-red-400" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={fetchDashboard}>Retry</Button>
      </div>
    )
  }

  if (!data) return null

  const { teacher, stats, subjects } = data

  const statCards = [
    {
      label: 'Total Students',
      value: stats.studentCount,
      icon: Users,
      color: 'bg-emerald-500/10 text-emerald-600',
    },
    {
      label: 'Subjects Taught',
      value: stats.subjectsTaught,
      icon: BookOpen,
      color: 'bg-amber-500/10 text-amber-600',
    },
    {
      label: 'Pending Submissions',
      value: stats.pendingSubmissions,
      icon: ClipboardList,
      color: stats.pendingSubmissions > 0 ? 'bg-red-500/10 text-red-600' : 'bg-emerald-500/10 text-emerald-600',
    },
    {
      label: 'Announcements',
      value: stats.announcementCount,
      icon: Megaphone,
      color: 'bg-sky-500/10 text-sky-600',
    },
  ]

  const quickActions = [
    { label: 'Score Entry', icon: FileEdit, page: 'teacher-scores' as const },
    { label: 'My Classes', icon: School, page: 'teacher-classes' as const },
    { label: 'Assignments', icon: ClipboardList, page: 'teacher-assignments' as const },
    { label: 'Announcements', icon: Megaphone, page: 'teacher-announcements' as const },
  ]

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Welcome banner */}
      <div
        className="rounded-xl p-6 text-white"
        style={{ backgroundColor: primaryColor }}
      >
        <h1 className="text-2xl font-bold">
          {getGreeting()}, {teacher.fullname}!
        </h1>
        <p className="mt-1 text-sm opacity-80">
          {teacher.subject
            ? `Teaching ${teacher.subject}`
            : 'Welcome to your teacher portal'}
          {' '}&middot;{' '}
          {teacher.active === 'Yes' ? (
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-300" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-300" />
              Inactive
            </span>
          )}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', card.color)}>
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold">{card.value}</p>
                    <p className="truncate text-xs text-muted-foreground">{card.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon
                return (
                  <Button
                    key={action.page}
                    variant="outline"
                    className="h-auto flex-col gap-2 py-4 text-left"
                    onClick={() => navigate(action.page)}
                  >
                    <Icon className="size-5 text-muted-foreground" />
                    <span className="text-xs font-medium">{action.label}</span>
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Subjects Overview */}
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              My Subjects
            </h3>
            {subjects.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {subjects.map((subject, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <BookOpen className="mr-1.5 size-3" />
                    {subject}
                  </span>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <BookOpen className="mb-2 size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No subjects assigned yet
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
              <FileEdit className="size-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-bold">{stats.examScoreCount}</p>
              <p className="text-xs text-muted-foreground">Scores Entered</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
              <ClipboardList className="size-4 text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-bold">{stats.assignmentCount}</p>
              <p className="text-xs text-muted-foreground">Assignments Created</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10">
              <Clock className="size-4 text-sky-600" />
            </div>
            <div>
              <p className="text-lg font-bold">
                {stats.pendingSubmissions > 0 ? (
                  <span className="text-red-600">{stats.pendingSubmissions} pending</span>
                ) : (
                  'All graded'
                )}
              </p>
              <p className="text-xs text-muted-foreground">Submission Status</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
