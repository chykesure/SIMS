'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/index'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  GraduationCap,
  Award,
  TrendingUp,
  Wallet,
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChildData {
  id: string
  regNo: string
  fullname: string
  gender: string
  class: string
  classRef: string
  basic: string
  department: string
  imageUrl: string
  latestAverage: number
  latestPosition: number
  latestOverallPosition: number
  latestTotalStudents: number
  latestSession: string
  latestTerm: string
  totalFees: number
  totalPaid: number
  feesOutstanding: number
  feesDue: { name: string; balance: number }[]
}

interface ParentData {
  parent: {
    id: string
    fullname: string
    email: string
    phone: string
    address: string
    occupation: string
    imageUrl: string
  }
  children: ChildData[]
}

export function ParentDashboard() {
  const { user, tenant, selectedChildId, setSelectedChildId, navigate } = useAppStore()
  const primaryColor = tenant?.primaryColor || '#821329'
  const [data, setData] = useState<ParentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const res = await fetch('/api/portal/parent', {
        headers: { 'x-user-id': user?.id || '' },
      })
      if (!res.ok) throw new Error('Failed to load dashboard data')
      const json = await res.json()
      if (json.success) {
        setData(json.data)
        // Auto-select first child if none selected
        if (json.data.children?.length > 0 && !selectedChildId) {
          setSelectedChildId(json.data.children[0].id)
        }
      } else {
        throw new Error(json.message || 'Failed to load data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [user?.id, selectedChildId, setSelectedChildId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const selectedChild = data?.children?.find((c) => c.id === selectedChildId)
  const children = data?.children || []

  function getOrdinal(n: number): string {
    if (n === 0) return '—'
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
  }

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="size-12 text-red-400 mb-4" />
        <p className="text-lg font-medium text-foreground">{error}</p>
        <p className="text-sm text-muted-foreground mt-1">Please try again later</p>
      </div>
    )
  }

  if (!data || children.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Users className="size-12 text-slate-300 mb-4" />
        <p className="text-lg font-medium text-foreground">No Children Found</p>
        <p className="text-sm text-muted-foreground mt-1">
          No students are linked to your account yet. Please contact the school.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Welcome banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome, {data.parent.fullname}!
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here&apos;s an overview of your {children.length === 1 ? 'child' : "children's"} progress
          </p>
        </div>
        {data.parent.occupation && (
          <Badge variant="outline" className="w-fit text-xs">
            {data.parent.occupation}
          </Badge>
        )}
      </div>

      {/* Multiple children selector cards */}
      {children.length > 1 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Your Children
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => (
              <Card
                key={child.id}
                className={cn(
                  'cursor-pointer transition-all duration-200 hover:shadow-md border-2',
                  selectedChildId === child.id
                    ? 'border-current shadow-sm'
                    : 'border-transparent hover:border-slate-200'
                )}
                style={
                  selectedChildId === child.id
                    ? { borderColor: primaryColor }
                    : undefined
                }
                onClick={() => setSelectedChildId(child.id)}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <Avatar className="size-10">
                    <AvatarImage src={child.imageUrl} alt={child.fullname} />
                    <AvatarFallback className="text-xs font-medium" style={{ backgroundColor: primaryColor, color: '#fff' }}>
                      {child.fullname.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {child.fullname}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {child.class}
                      {child.department ? ` — ${child.department}` : ''}
                    </p>
                  </div>
                  {selectedChildId === child.id && (
                    <CheckCircle className="size-5 shrink-0" style={{ color: primaryColor }} />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Selected child stats */}
      {selectedChild && (
        <>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Avatar className="size-8">
                <AvatarImage src={selectedChild.imageUrl} alt={selectedChild.fullname} />
                <AvatarFallback className="text-xs font-medium" style={{ backgroundColor: primaryColor, color: '#fff' }}>
                  {selectedChild.fullname.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {selectedChild.fullname}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {selectedChild.regNo} &middot; {selectedChild.class}
                  {selectedChild.latestSession && selectedChild.latestTerm
                    ? ` — ${selectedChild.latestSession} ${selectedChild.latestTerm}`
                    : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Class Card */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                    <GraduationCap className="size-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Class</p>
                    <p className="text-sm font-semibold text-foreground">{selectedChild.class}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Average Score Card */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                    <TrendingUp className="size-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Average Score</p>
                    <p className="text-sm font-semibold text-foreground">
                      {selectedChild.latestAverage > 0 ? selectedChild.latestAverage.toFixed(1) : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Position Card */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                    <Award className="size-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Position</p>
                    <p className="text-sm font-semibold text-foreground">
                      {selectedChild.latestPosition > 0
                        ? `${getOrdinal(selectedChild.latestPosition)} of ${selectedChild.latestTotalStudents}`
                        : 'N/A'}
                    </p>
                    {selectedChild.latestOverallPosition > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        Overall: {getOrdinal(selectedChild.latestOverallPosition)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fees Due Card */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    selectedChild.feesOutstanding > 0 ? 'bg-red-50' : 'bg-emerald-50'
                  )}>
                    <Wallet className={cn(
                      'size-5',
                      selectedChild.feesOutstanding > 0 ? 'text-red-600' : 'text-emerald-600'
                    )} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fees Outstanding</p>
                    <p className={cn(
                      'text-sm font-semibold',
                      selectedChild.feesOutstanding > 0 ? 'text-red-600' : 'text-emerald-600'
                    )}>
                      {selectedChild.totalFees > 0
                        ? `₦${selectedChild.feesOutstanding.toLocaleString()}`
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick info cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Fee breakdown */}
            {selectedChild.feesDue.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <AlertCircle className="size-4 text-red-500" />
                    Outstanding Fees
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {selectedChild.feesDue.map((fee, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{fee.name}</span>
                      <Badge variant="destructive" className="text-xs">
                        ₦{fee.balance.toLocaleString()}
                      </Badge>
                    </div>
                  ))}
                  <div className="pt-2 border-t flex items-center justify-between text-sm font-semibold">
                    <span>Total Due</span>
                    <span className="text-red-600">₦{selectedChild.feesOutstanding.toLocaleString()}</span>
                  </div>
                  <button
                    onClick={() => navigate('parent-fees')}
                    className="w-full mt-2 text-xs text-center py-1.5 rounded-md hover:bg-slate-100 text-muted-foreground transition-colors"
                    style={{ color: primaryColor }}
                  >
                    View Fee Details →
                  </button>
                </CardContent>
              </Card>
            )}

            {/* Academic summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="size-4 text-blue-500" />
                  Latest Academic Record
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedChild.latestSession ? (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Session</span>
                      <span className="font-medium">{selectedChild.latestSession}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Term</span>
                      <span className="font-medium">{selectedChild.latestTerm}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Average</span>
                      <span className="font-medium">
                        {selectedChild.latestAverage > 0
                          ? `${selectedChild.latestAverage.toFixed(1)}%`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Position</span>
                      <span className="font-medium">
                        {selectedChild.latestPosition > 0
                          ? `${getOrdinal(selectedChild.latestPosition)} of ${selectedChild.latestTotalStudents}`
                          : 'N/A'}
                      </span>
                    </div>
                    <button
                      onClick={() => navigate('parent-results')}
                      className="w-full mt-2 text-xs text-center py-1.5 rounded-md hover:bg-slate-100 text-muted-foreground transition-colors"
                      style={{ color: primaryColor }}
                    >
                      View Full Results →
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No academic records available yet
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* All children overview when only 1 child (show a quick summary instead of selector) */}
      {children.length === 1 && selectedChild && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Student Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Registration No.</p>
                <p className="font-medium">{selectedChild.regNo}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gender</p>
                <p className="font-medium">{selectedChild.gender || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Department</p>
                <p className="font-medium">{selectedChild.department || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fees Paid</p>
                <p className="font-medium text-emerald-600">
                  {selectedChild.totalFees > 0
                    ? `₦${selectedChild.totalPaid.toLocaleString()} / ₦${selectedChild.totalFees.toLocaleString()}`
                    : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
