'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Activity,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Sparkles,
  XCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  School,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────

interface ActivityLog {
  id: string
  action: string
  schoolName: string
  details: string
  timestamp: string
  type: 'registration' | 'approval' | 'rejection' | 'plan_change' | 'suspension' | 'system' | 'login' | 'payment'
}

// ── Animation Variants ────────────────────────────────────────

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

// ── Helpers ───────────────────────────────────────────────────

function RelativeTime({ timestamp }: { timestamp: string }) {
  const text = useMemo(() => {
    const then = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - then.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSecs < 60) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 30) return `${diffDays}d ago`
    return then.toISOString().slice(0, 10)
  }, [timestamp])

  return <span>{text}</span>
}

function getBadgeConfig(type: ActivityLog['type']) {
  switch (type) {
    case 'registration':
      return { label: 'Registration', className: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: UserPlus }
    case 'approval':
      return { label: 'Approved', className: 'bg-sky-100 text-sky-700 border-sky-200', icon: CheckCircle2 }
    case 'rejection':
      return { label: 'Rejected', className: 'bg-rose-100 text-rose-700 border-rose-200', icon: XCircle }
    case 'plan_change':
      return { label: 'Plan Change', className: 'bg-violet-100 text-violet-700 border-violet-200', icon: Sparkles }
    case 'suspension':
      return { label: 'Suspended', className: 'bg-amber-100 text-amber-700 border-amber-200', icon: Shield }
    case 'login':
      return { label: 'Login', className: 'bg-slate-100 text-slate-600 border-slate-200', icon: Shield }
    case 'payment':
      return { label: 'Payment', className: 'bg-teal-100 text-teal-700 border-teal-200', icon: CheckCircle2 }
    default:
      return { label: 'System', className: 'bg-slate-100 text-slate-600 border-slate-200', icon: Activity }
  }
}

const typeFilters: { value: ActivityLog['type'] | 'all'; label: string }[] = [
  { value: 'all', label: 'All Activity' },
  { value: 'registration', label: 'Registrations' },
  { value: 'approval', label: 'Approvals' },
  { value: 'rejection', label: 'Rejections' },
  { value: 'plan_change', label: 'Plan Changes' },
  { value: 'suspension', label: 'Suspensions' },
  { value: 'payment', label: 'Payments' },
]

// ── Main Component ────────────────────────────────────────────

export function DevActivityLog() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<ActivityLog['type'] | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const fetchLogs = async (isSilent = false) => {
    if (isSilent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)
    try {
      const res = await fetch('/api/dev/stats')
      if (!res.ok) throw new Error('Failed to fetch activity logs')
      const data = await res.json()
      const transformed: ActivityLog[] = (data.recentActivity || []).map(
        (log: { id: string; action: string; details: string; createdAt: string; tenant: { name: string } }) => ({
          id: log.id,
          action: log.action,
          schoolName: log.tenant?.name || 'System',
          details: log.details,
          timestamp: log.createdAt,
          type: log.action.includes('registered') ? 'registration' as const
            : log.action.includes('approved') ? 'approval' as const
            : log.action.includes('rejected') ? 'rejection' as const
            : log.action.includes('plan') ? 'plan_change' as const
            : log.action.includes('suspended') ? 'suspension' as const
            : log.action.includes('payment') ? 'payment' as const
            : log.action.includes('login') ? 'login' as const
            : 'system' as const,
        })
      )
      setLogs(transformed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity logs')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const filteredLogs = useMemo(() => {
    let result = logs
    if (typeFilter !== 'all') {
      result = result.filter((log) => log.type === typeFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (log) =>
          log.schoolName.toLowerCase().includes(q) ||
          log.details.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q)
      )
    }
    return result
  }, [logs, typeFilter, searchQuery])

  const summaryStats = useMemo(() => {
    return [
      { label: 'Total Events', count: logs.length, color: 'text-slate-700', bg: 'bg-slate-100' },
      { label: 'Registrations', count: logs.filter((l) => l.type === 'registration').length, color: 'text-emerald-700', bg: 'bg-emerald-100' },
      { label: 'Approvals', count: logs.filter((l) => l.type === 'approval').length, color: 'text-sky-700', bg: 'bg-sky-100' },
      { label: 'Rejections', count: logs.filter((l) => l.type === 'rejection').length, color: 'text-rose-700', bg: 'bg-rose-100' },
    ]
  }, [logs])

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={item} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Activity className="size-6 text-slate-400" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Activity Log
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            Complete audit trail of all platform events and actions
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchLogs(true)}
          disabled={refreshing}
          className="gap-2 w-fit"
        >
          <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
          Refresh
        </Button>
      </motion.div>

      {/* Summary Stats */}
      <motion.div variants={item} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summaryStats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-3 rounded-lg border bg-white p-3"
          >
            <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', stat.bg)}>
              <Activity className={cn('size-4', stat.color)} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{stat.count}</p>
              <p className="text-[10px] font-medium text-slate-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Filters and Search */}
      <motion.div variants={item} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {typeFilters.map((filter) => (
            <Button
              key={filter.value}
              variant={typeFilter === filter.value ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'h-7 text-[10px] px-2.5 shrink-0',
                typeFilter === filter.value
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'text-slate-500'
              )}
              onClick={() => setTypeFilter(filter.value)}
            >
              {filter.label}
              {filter.value !== 'all' && (
                <span className="ml-1 opacity-70">
                  ({logs.filter((l) => l.type === filter.value).length})
                </span>
              )}
            </Button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search logs..."
            className="h-8 w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
          />
        </div>
      </motion.div>

      {/* Activity Log Card */}
      <motion.div variants={item}>
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <School className="size-4 text-slate-400" />
                <CardTitle className="text-base">
                  {typeFilter === 'all' ? 'All Events' : `${typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)} Events`}
                </CardTitle>
                <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600">
                  {filteredLogs.length} events
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-0 px-6 py-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex items-center gap-3 py-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <AlertTriangle className="mb-2 size-8 text-amber-400" />
                <p className="text-sm font-medium text-slate-600">{error}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => fetchLogs()}>
                  Try Again
                </Button>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Activity className="mb-2 size-8 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">No activity found</p>
                <p className="text-xs text-slate-400 mt-1">
                  {searchQuery ? 'Try adjusting your search terms' : 'Activity will appear here as events happen'}
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-[500px]">
                <div className="divide-y">
                  {filteredLogs.map((log) => {
                    const badgeConfig = getBadgeConfig(log.type)
                    const BadgeIcon = badgeConfig.icon
                    return (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 px-6 py-3.5 transition-colors hover:bg-slate-50/50"
                      >
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
                          <BadgeIcon className="size-3.5 text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {log.schoolName}
                            </p>
                            <Badge
                              variant="outline"
                              className={cn('text-[10px] px-1.5 py-0', badgeConfig.className)}
                            >
                              {badgeConfig.label}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500 truncate">
                            {log.details}
                          </p>
                          <p className="mt-1 text-[10px] text-slate-400 sm:hidden">
                            {new Date(log.timestamp).toLocaleString('en-US', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] text-slate-400 whitespace-nowrap hidden sm:block">
                          <RelativeTime timestamp={log.timestamp} />
                        </span>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}