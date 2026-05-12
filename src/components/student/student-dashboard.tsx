'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/index'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BookOpen,
  Award,
  ClipboardList,
  Wallet,
  Megaphone,
  TrendingUp,
  Clock,
  ArrowRight,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface StudentData {
  id: string
  regNo: string
  fullname: string
  gender: string
  class: string
  classRef: string
  basic: string
  department: string
  parentNo: string
  imageUrl: string
  dateOfBirth: string
}

interface Stats {
  examScoresCount: number
  totalFees: number
  totalPayments: number
  outstandingFees: number
  pendingAssignments: number
  totalSubjects: number
  latestSession: string
  latestTerm: string
}

interface Announcement {
  id: string
  title: string
  content: string
  pinned: boolean
  createdByName: string
  createdAt: string
}

interface DashboardData {
  student: StudentData
  stats: Stats
  latestScores: Array<{ subject: string; total: number }>
  recentAnnouncements: Announcement[]
}

export function StudentDashboard() {
  const { tenant, user, navigate } = useAppStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const primaryColor = tenant?.primaryColor || '#821329'

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/portal/student', {
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
  }, [user?.id])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
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
            <Button onClick={fetchDashboard} variant="outline" size="sm">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Welcome Banner */}
      {loading ? (
        <Skeleton className="h-32 w-full rounded-xl" />
      ) : (
        <div
          className="relative overflow-hidden rounded-xl p-6 md:p-8 text-white"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-4 right-20 h-24 w-24 rounded-full bg-white/5" />
          <div className="relative">
            <p className="text-sm font-medium text-white/80">{getGreeting()},</p>
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">
              {data?.student?.fullname || 'Student'}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                <GraduationCap className="mr-1 h-3 w-3" />
                {data?.student?.class || '—'}
              </Badge>
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                {data?.student?.regNo || '—'}
              </Badge>
              {data?.stats?.latestSession && (
                <Badge variant="secondary" className="bg-white/20 text-white border-0">
                  <Clock className="mr-1 h-3 w-3" />
                  {data.stats.latestSession} {data.stats.latestTerm}
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          loading={loading}
          icon={BookOpen}
          label="Total Subjects"
          value={data?.stats?.totalSubjects?.toString() || '0'}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
        />
        <StatsCard
          loading={loading}
          icon={TrendingUp}
          label="Exam Records"
          value={data?.stats?.examScoresCount?.toString() || '0'}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatsCard
          loading={loading}
          icon={ClipboardList}
          label="Assignments"
          value={data?.stats?.pendingAssignments?.toString() || '0'}
          subtitle="pending"
          color="text-amber-600"
          bgColor="bg-amber-50"
        />
        <StatsCard
          loading={loading}
          icon={Wallet}
          label="Fees Outstanding"
          value={data?.stats?.outstandingFees != null ? `₦${data.stats.outstandingFees.toLocaleString()}` : '₦0'}
          color={data?.stats?.outstandingFees && data.stats.outstandingFees > 0 ? 'text-red-600' : 'text-emerald-600'}
          bgColor={data?.stats?.outstandingFees && data.stats.outstandingFees > 0 ? 'bg-red-50' : 'bg-emerald-50'}
        />
      </div>

      {/* Quick Links + Announcements */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Links */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <QuickLink
              icon={Award}
              label="View My Results"
              onClick={() => navigate('student-results')}
              primaryColor={primaryColor}
            />
            <QuickLink
              icon={ClipboardList}
              label="My Assignments"
              onClick={() => navigate('student-assignments')}
              primaryColor={primaryColor}
              badge={data?.stats?.pendingAssignments && data.stats.pendingAssignments > 0 ? data.stats.pendingAssignments.toString() : undefined}
            />
            <QuickLink
              icon={Wallet}
              label="My Fees"
              onClick={() => navigate('student-fees')}
              primaryColor={primaryColor}
            />
            <QuickLink
              icon={Megaphone}
              label="Announcements"
              onClick={() => navigate('student-announcements')}
              primaryColor={primaryColor}
            />
          </CardContent>
        </Card>

        {/* Recent Announcements */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Announcements</CardTitle>
              {data?.recentAnnouncements && data.recentAnnouncements.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => navigate('student-announcements')}
                >
                  View All <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-9 w-9 rounded-lg" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : data?.recentAnnouncements && data.recentAnnouncements.length > 0 ? (
              <div className="space-y-3">
                {data.recentAnnouncements.slice(0, 4).map((ann) => (
                  <div
                    key={ann.id}
                    className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Megaphone className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{ann.title}</p>
                        {ann.pinned && (
                          <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0">
                            Pinned
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {ann.content}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {ann.createdByName} &middot; {formatDate(ann.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Megaphone className="h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">No announcements yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Latest Scores Preview */}
      {data?.latestScores && data.latestScores.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Latest Scores</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => navigate('student-results')}
              >
                View All <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {data.latestScores.slice(0, 8).map((score, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{score.subject}</p>
                    <p className="text-xs text-muted-foreground">Score</p>
                  </div>
                  <Badge
                    variant={score.total >= 50 ? 'default' : 'destructive'}
                    className={score.total >= 50 ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}
                  >
                    {score.total}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StatsCard({
  loading,
  icon: Icon,
  label,
  value,
  subtitle,
  color,
  bgColor,
}: {
  loading: boolean
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  subtitle?: string
  color: string
  bgColor: string
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-16" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', bgColor)}>
          <Icon className={cn('h-5 w-5', color)} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={cn('text-lg font-bold', color)}>{value}</p>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function QuickLink({
  icon: Icon,
  label,
  onClick,
  primaryColor,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  primaryColor: string
  badge?: string
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
        style={{ backgroundColor: primaryColor }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
      </div>
      {badge && (
        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
          {badge}
        </Badge>
      )}
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </button>
  )
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
