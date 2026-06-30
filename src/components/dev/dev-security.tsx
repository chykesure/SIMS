'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
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
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  Ban,
  Lock,
  Unlock,
  Activity,
  Eye,
  Clock,
  User,
  Globe,
  RefreshCw,
  ShieldOff,
  Mail,
  Zap,
  TrendingUp,
  CircleDot,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

// ── Data Interfaces ──────────────────────────────────────────────

interface SecurityStats {
  totalEvents: number
  criticalCount: number
  warningCount: number
  infoCount: number
  loginFailures24h: number
  rateLimitedCount24h: number
  bruteForceCount24h: number
  currentlyLockedIps: number
}

interface SecurityEvent {
  id: string
  tenantId?: string | null
  eventType: string
  severity: string
  ipAddress: string | null
  userAgent?: string | null
  email: string | null
  details: string | null
  metadata?: unknown
  createdAt: string
}

interface LockedIp {
  key: string
  failures: number
  lockoutMinutes: number
}

interface SuspiciousEmail {
  email: string
  failureCount: number
}

interface EventDistribution {
  eventType: string
  count: number
}

interface SeverityDistribution {
  severity: string
  count: number
}

interface SecurityData {
  stats: SecurityStats
  events: SecurityEvent[]
  currentlyLockedIps: LockedIp[]
  topSuspiciousEmails: SuspiciousEmail[]
  eventsByType: EventDistribution[]
  eventsBySeverity: SeverityDistribution[]
  recentCritical: SecurityEvent[]
  hourlyBreakdown: EventDistribution[]
}

// ── Animation Variants ───────────────────────────────────────────

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

// ── Helper Functions ─────────────────────────────────────────────

function getSeverityColor(severity: string) {
  switch (severity) {
    case 'critical':
      return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' }
    case 'warning':
      return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' }
    case 'info':
    default:
      return { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' }
  }
}

function getSeverityBadge(severity: string) {
  const colors = getSeverityColor(severity)
  return (
    <Badge
      variant="outline"
      className={cn('text-[10px] px-1.5 py-0 uppercase font-bold tracking-wider', colors.bg, colors.text, colors.border)}
    >
      {severity}
    </Badge>
  )
}

function getEventTypeLabel(eventType: string) {
  const labels: Record<string, string> = {
    login_failed: 'Login Failed',
    login_success: 'Login Success',
    login_success_after_failures: 'Login After Failures',
    rate_limited: 'Rate Limited',
    brute_force_detected: 'Brute Force',
    account_locked: 'Account Locked',
    ip_blocked: 'IP Blocked',
    suspicious_email: 'Suspicious Email',
  }
  return labels[eventType] || eventType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function getEventTypeIcon(eventType: string) {
  switch (eventType) {
    case 'login_failed':
    case 'brute_force_detected':
      return ShieldAlert
    case 'login_success':
    case 'login_success_after_failures':
      return ShieldCheck
    case 'rate_limited':
      return Ban
    case 'account_locked':
      return Lock
    case 'ip_blocked':
      return Ban
    default:
      return Activity
  }
}

function formatTimeAgo(timestamp: string) {
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
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function calculateSecurityScore(stats: SecurityStats): number {
  let score = 0
  if (stats.criticalCount === 0) score += 50
  if (stats.warningCount === 0) score += 25
  if (stats.currentlyLockedIps === 0) score += 15
  if (stats.bruteForceCount24h === 0) score += 10
  return score
}

function getScoreConfig(score: number) {
  if (score >= 90) return { label: 'Secure', color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200', stroke: '#059669', progress: '#10b981' }
  if (score >= 70) return { label: 'Needs Attention', color: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-200', stroke: '#d97706', progress: '#f59e0b' }
  if (score >= 50) return { label: 'At Risk', color: 'text-orange-600', bg: 'bg-orange-50', ring: 'ring-orange-200', stroke: '#ea580c', progress: '#f97316' }
  return { label: 'Critical', color: 'text-red-600', bg: 'bg-red-50', ring: 'ring-red-200', stroke: '#dc2626', progress: '#ef4444' }
}

function getBarColor(eventType: string) {
  switch (eventType) {
    case 'login_failed': return 'bg-red-500'
    case 'brute_force_detected': return 'bg-red-600'
    case 'login_success': return 'bg-emerald-500'
    case 'login_success_after_failures': return 'bg-amber-500'
    case 'rate_limited': return 'bg-orange-500'
    case 'account_locked': return 'bg-rose-500'
    case 'ip_blocked': return 'bg-red-700'
    default: return 'bg-slate-400'
  }
}

// ── Security Score Gauge ─────────────────────────────────────────

function SecurityScoreGauge({ score }: { score: number }) {
  const config = getScoreConfig(score)
  const circumference = 2 * Math.PI * 54
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center">
        <svg width="140" height="140" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="8"
            className="dark:stroke-slate-700"
          />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke={config.stroke}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 60 60)"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className={cn('text-3xl font-bold', config.color)}>{score}</span>
          <span className="text-[10px] font-medium text-slate-400">/ 100</span>
        </div>
      </div>
      <Badge
        variant="outline"
        className={cn(
          'mt-3 text-xs font-bold px-3 py-0.5',
          config.bg,
          config.color,
          config.ring
        )}
      >
        {config.label}
      </Badge>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────

export function DevSecurity() {
  const [data, setData] = useState<SecurityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all')
  const [unlockingIps, setUnlockingIps] = useState<Set<string>>(new Set())
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastFetchRef = useRef<number>(0)

  const fetchData = useCallback(async (isSilent = false) => {
    if (isSilent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)
    try {
      const res = await fetch('/api/dev/security')
      if (!res.ok) throw new Error('Failed to fetch security data')
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
        lastFetchRef.current = Date.now()
      } else {
        throw new Error(json.message || 'Invalid response')
      }
    } catch (err) {
      if (!isSilent) {
        setError(err instanceof Error ? err.message : 'Failed to load security data')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchData(true)
      }, 30000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [autoRefresh, fetchData])

  const handleRefresh = () => {
    fetchData(true)
  }

  const handleUnlockIp = useCallback((ip: string) => {
    setUnlockingIps((prev) => new Set(prev).add(ip))
    setTimeout(() => {
      setUnlockingIps((prev) => {
        const next = new Set(prev)
        next.delete(ip)
        return next
      })
      toast.success(`IP ${ip} has been unlocked`)
    }, 1000)
  }, [])

  const filteredEvents = useMemo(() => {
    if (!data?.events) return []
    if (severityFilter === 'all') return data.events
    return data.events.filter((e) => e.severity === severityFilter)
  }, [data?.events, severityFilter])

  const securityScore = useMemo(() => {
    if (!data?.stats) return 0
    return calculateSecurityScore(data.stats)
  }, [data?.stats])

  const maxEventTypeCount = useMemo(() => {
    if (!data?.eventsByType || data.eventsByType.length === 0) return 1
    return Math.max(...data.eventsByType.map((e) => e.count))
  }, [data?.eventsByType])

  // ── Loading Skeleton ─────────────────────────────────────────

  if (loading && !data) {
    return (
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-52 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Skeleton className="h-96 rounded-xl" />
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </motion.div>
    )
  }

  if (error && !data) {
    return (
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ShieldAlert className="mb-3 size-12 text-red-400" />
            <p className="text-sm font-semibold text-red-700">Failed to Load Security Data</p>
            <p className="mt-1 text-xs text-red-500">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 border-red-200 text-red-600 hover:bg-red-100"
              onClick={() => fetchData()}
            >
              <RefreshCw className="mr-1.5 size-3.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  if (!data) return null

  const stats = data.stats

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* ═══ A. Header Section ═══ */}
      <motion.div variants={item}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 ring-1 ring-emerald-200">
              <ShieldCheck className="size-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Security Monitoring Center
              </h1>
              <p className="text-sm text-slate-500">
                Real-time threat detection and security audit
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5">
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
                className="data-[state=checked]:bg-emerald-600"
              />
              <label
                htmlFor="auto-refresh"
                className="text-xs font-medium text-slate-600 cursor-pointer"
              >
                Auto-refresh
              </label>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn('mr-1.5 size-3.5', refreshing && 'animate-spin')} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ═══ B. Security Score Card ═══ */}
      <motion.div variants={item}>
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col items-center">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Security Score
                </p>
                <SecurityScoreGauge score={securityScore} />
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
                <ScoreFactorItem
                  label="No Critical Events (24h)"
                  points={50}
                  earned={stats.criticalCount === 0}
                  icon={ShieldAlert}
                />
                <ScoreFactorItem
                  label="No Warnings"
                  points={25}
                  earned={stats.warningCount === 0}
                  icon={AlertCircle}
                />
                <ScoreFactorItem
                  label="No Rate-Limited IPs"
                  points={15}
                  earned={stats.currentlyLockedIps === 0}
                  icon={Ban}
                />
                <ScoreFactorItem
                  label="No Brute Force Attempts"
                  points={10}
                  earned={stats.bruteForceCount24h === 0}
                  icon={ShieldOff}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══ C. Stat Cards Row ═══ */}
      <motion.div
        variants={item}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <Card className="gap-0 overflow-hidden py-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg ring-1 bg-red-50 ring-red-100">
                <AlertTriangle className="size-5 text-red-600" />
              </div>
              {stats.criticalCount > 0 && (
                <div className="flex items-center gap-0.5 text-xs font-medium text-red-600">
                  <TrendingUp className="size-3.5" />
                  Active
                </div>
              )}
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-slate-900">
                {stats.criticalCount.toLocaleString()}
              </p>
              <p className="mt-0.5 text-xs font-medium text-slate-500">Critical Alerts</p>
            </div>
          </CardContent>
        </Card>

        <Card className="gap-0 overflow-hidden py-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg ring-1 bg-amber-50 ring-amber-100">
                <AlertCircle className="size-5 text-amber-600" />
              </div>
              {stats.warningCount > 0 && (
                <div className="flex items-center gap-0.5 text-xs font-medium text-amber-600">
                  <TrendingUp className="size-3.5" />
                  Review
                </div>
              )}
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-slate-900">
                {stats.warningCount.toLocaleString()}
              </p>
              <p className="mt-0.5 text-xs font-medium text-slate-500">Warnings</p>
            </div>
          </CardContent>
        </Card>

        <Card className="gap-0 overflow-hidden py-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg ring-1 bg-rose-50 ring-rose-100">
                <ShieldAlert className="size-5 text-rose-600" />
              </div>
              {stats.loginFailures24h > 0 && (
                <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-600 border-rose-200">
                  24h
                </Badge>
              )}
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-slate-900">
                {stats.loginFailures24h.toLocaleString()}
              </p>
              <p className="mt-0.5 text-xs font-medium text-slate-500">Failed Logins (24h)</p>
            </div>
          </CardContent>
        </Card>

        <Card className="gap-0 overflow-hidden py-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg ring-1 bg-orange-50 ring-orange-100">
                <Ban className="size-5 text-orange-600" />
              </div>
              {stats.currentlyLockedIps > 0 && (
                <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-600 border-orange-200">
                  Locked
                </Badge>
              )}
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-slate-900">
                {stats.currentlyLockedIps.toLocaleString()}
              </p>
              <p className="mt-0.5 text-xs font-medium text-slate-500">Rate-Limited IPs</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══ D + G. Live Threat Feed + Event Distribution ═══ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Live Threat Feed */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Activity className="size-4 text-slate-400" />
                    <CardTitle className="text-base">Live Threat Feed</CardTitle>
                    {autoRefresh && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live
                      </span>
                    )}
                  </div>
                  <CardDescription className="mt-1">Real-time security events sorted by recency</CardDescription>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {(['all', 'critical', 'warning', 'info'] as const).map((filter) => (
                    <Button
                      key={filter}
                      variant={severityFilter === filter ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        'h-7 text-[10px] px-2.5 capitalize',
                        severityFilter === filter
                          ? filter === 'critical'
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : filter === 'warning'
                              ? 'bg-amber-500 hover:bg-amber-600 text-white'
                              : filter === 'info'
                                ? 'bg-slate-600 hover:bg-slate-700 text-white'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'text-slate-500'
                      )}
                      onClick={() => setSeverityFilter(filter)}
                    >
                      {filter}
                      {filter !== 'all' && (
                        <span className="ml-1 opacity-70">
                          ({filter === 'critical'
                            ? stats.criticalCount
                            : filter === 'warning'
                              ? stats.warningCount
                              : stats.infoCount})
                        </span>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredEvents.length > 0 ? (
                <ScrollArea className="max-h-96">
                  <div className="divide-y">
                    {filteredEvents.map((event) => {
                      const EventIcon = getEventTypeIcon(event.eventType)
                      const severityColors = getSeverityColor(event.severity)
                      return (
                        <div
                          key={event.id}
                          className={cn(
                            'flex items-start gap-3 px-6 py-3 transition-colors hover:bg-slate-50/50',
                            event.severity === 'critical' && 'bg-red-50/30'
                          )}
                        >
                          <div className={cn(
                            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                            severityColors.bg
                          )}>
                            <EventIcon className={cn('size-3.5', severityColors.text)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-slate-800 truncate">
                                {getEventTypeLabel(event.eventType)}
                              </p>
                              {getSeverityBadge(event.severity)}
                            </div>
                            <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                              {event.email && (
                                <span className="flex items-center gap-1 truncate">
                                  <Mail className="size-3 shrink-0" />
                                  {event.email}
                                </span>
                              )}
                              {event.ipAddress && (
                                <span className="flex items-center gap-1">
                                  <Globe className="size-3 shrink-0" />
                                  {event.ipAddress}
                                </span>
                              )}
                            </div>
                            {event.details && (
                              <p className="mt-0.5 text-xs text-slate-400 truncate">{event.details}</p>
                            )}
                          </div>
                          <span className="shrink-0 text-[11px] text-slate-400 whitespace-nowrap flex items-center gap-1">
                            <Clock className="size-3" />
                            {formatTimeAgo(event.createdAt)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <ShieldCheck className="mb-2 size-10 text-emerald-300" />
                  <p className="text-sm font-medium text-slate-500">No threats detected</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {severityFilter !== 'all'
                      ? `No ${severityFilter} events found`
                      : 'All clear — your platform is secure'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Event Distribution Chart */}
        <motion.div variants={item} className="lg:col-span-1">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-slate-400" />
                <CardTitle className="text-base">Event Distribution</CardTitle>
              </div>
              <CardDescription>Breakdown by event type</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.eventsByType && data.eventsByType.length > 0 ? (
                data.eventsByType.map((evt) => (
                  <div key={evt.eventType} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-slate-600 truncate">
                        {getEventTypeLabel(evt.eventType)}
                      </p>
                      <p className="text-xs font-bold text-slate-800">{evt.count}</p>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-700 ease-out',
                          getBarColor(evt.eventType)
                        )}
                        style={{
                          width: `${Math.max((evt.count / maxEventTypeCount) * 100, 2)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Activity className="mb-2 size-8 text-slate-300" />
                  <p className="text-xs text-slate-400">No event data yet</p>
                </div>
              )}

              {data.eventsBySeverity && data.eventsBySeverity.length > 0 && (
                <>
                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      By Severity
                    </p>
                    {data.eventsBySeverity.map((sev) => {
                      const colors = getSeverityColor(sev.severity)
                      return (
                        <div key={sev.severity} className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-2">
                            <span className={cn('size-2 rounded-full', colors.dot)} />
                            <span className="text-xs capitalize text-slate-600">{sev.severity}</span>
                          </div>
                          <span className="text-xs font-bold text-slate-700">{sev.count}</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ═══ E + F. Locked IPs + Suspicious Emails ═══ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Locked IPs Panel */}
        <motion.div variants={item}>
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Lock className="size-4 text-slate-400 shrink-0" />
                <CardTitle className="text-base">Locked IPs</CardTitle>
                {data.currentlyLockedIps.length > 0 && (
                  <Badge variant="outline" className="ml-auto text-[10px] bg-orange-50 text-orange-600 border-orange-200 shrink-0">
                    {data.currentlyLockedIps.length} active
                  </Badge>
                )}
              </div>
              <CardDescription className="mt-1.5">
                Currently rate-limited IP addresses
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {data.currentlyLockedIps.length > 0 ? (
                <ScrollArea className="max-h-72">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">IP Address / Key</TableHead>
                        <TableHead className="text-xs text-center">Failures</TableHead>
                        <TableHead className="text-xs text-center">Expires In</TableHead>
                        <TableHead className="text-xs text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.currentlyLockedIps.map((ip) => (
                        <TableRow key={ip.key}>
                          <TableCell className="text-xs font-mono text-slate-700">
                            {ip.key}
                          </TableCell>
                          <TableCell className="text-xs text-center">
                            <Badge variant="outline" className="text-[10px] bg-red-50 text-red-600 border-red-200">
                              {ip.failures}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-center text-slate-600">
                            {ip.lockoutMinutes > 0 ? `${ip.lockoutMinutes}m` : '< 1m'}
                          </TableCell>
                          <TableCell className="text-xs text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[10px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2"
                              disabled={unlockingIps.has(ip.key)}
                              onClick={() => handleUnlockIp(ip.key)}
                            >
                              {unlockingIps.has(ip.key) ? (
                                <RefreshCw className="size-3 animate-spin" />
                              ) : (
                                <Unlock className="size-3 mr-1" />
                              )}
                              Unlock
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Unlock className="mb-2 size-8 text-emerald-300" />
                  <p className="text-sm font-medium text-slate-500">No Locked IPs</p>
                  <p className="mt-1 text-xs text-slate-400">All IP addresses are currently unrestricted</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Suspicious Emails Panel */}
        <motion.div variants={item}>
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-slate-400 shrink-0" />
                <CardTitle className="text-base">Suspicious Emails</CardTitle>
                {data.topSuspiciousEmails.length > 0 && (
                  <Badge variant="outline" className="ml-auto text-[10px] bg-rose-50 text-rose-600 border-rose-200 shrink-0">
                    {data.topSuspiciousEmails.length} flagged
                  </Badge>
                )}
              </div>
              <CardDescription className="mt-1.5">
                Top emails with failed login attempts (24h)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {data.topSuspiciousEmails.length > 0 ? (
                <ScrollArea className="max-h-72">
                  <div className="divide-y">
                    {data.topSuspiciousEmails.map((item, index) => (
                      <div
                        key={item.email}
                        className="flex items-center gap-3 py-3"
                      >
                        <div className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                          index === 0 ? 'bg-red-100 text-red-700' :
                          index === 1 ? 'bg-orange-100 text-orange-700' :
                          index === 2 ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-500'
                        )}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-700 truncate">
                            {item.email}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {item.failureCount} failed attempt{item.failureCount !== 1 ? 's' : ''} in last 24h
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] shrink-0',
                            item.failureCount >= 10
                              ? 'bg-red-50 text-red-600 border-red-200'
                              : item.failureCount >= 5
                                ? 'bg-amber-50 text-amber-600 border-amber-200'
                                : 'bg-slate-50 text-slate-500 border-slate-200'
                          )}
                        >
                          {item.failureCount}x
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <ShieldCheck className="mb-2 size-8 text-emerald-300" />
                  <p className="text-sm font-medium text-slate-500">No Suspicious Emails</p>
                  <p className="mt-1 text-xs text-slate-400">No emails flagged for unusual activity</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ═══ H. Recent Critical Events ═══ */}
      {data.recentCritical && data.recentCritical.length > 0 && (
        <motion.div variants={item}>
          <Card className="border-red-200 bg-red-50/30 overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-red-100">
                  <AlertTriangle className="size-3.5 text-red-600" />
                </div>
                <CardTitle className="text-base text-red-800">Recent Critical Events</CardTitle>
                <Badge variant="outline" className="text-[10px] bg-red-100 text-red-700 border-red-200 ml-auto">
                  {data.recentCritical.length} in last 24h
                </Badge>
              </div>
              <CardDescription className="mt-1 text-red-600/70">
                Critical security events requiring immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-72">
                <div className="divide-y divide-red-100">
                  {data.recentCritical.map((event) => {
                    const EventIcon = getEventTypeIcon(event.eventType)
                    return (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 px-6 py-3 transition-colors hover:bg-red-50/50"
                      >
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
                          <EventIcon className="size-3.5 text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-red-900">
                              {getEventTypeLabel(event.eventType)}
                            </p>
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-red-600/70 flex-wrap">
                            {event.email && (
                              <span className="flex items-center gap-1 truncate">
                                <Mail className="size-3 shrink-0" />
                                {event.email}
                              </span>
                            )}
                            {event.ipAddress && (
                              <span className="flex items-center gap-1">
                                <Globe className="size-3 shrink-0" />
                                {event.ipAddress}
                              </span>
                            )}
                          </div>
                          {event.details && (
                            <p className="mt-0.5 text-xs text-red-500/70 truncate">{event.details}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-[11px] text-red-400 whitespace-nowrap flex items-center gap-1">
                          <Clock className="size-3" />
                          {formatTimestamp(event.createdAt)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ═══ 24h Breakdown ═══ */}
      <motion.div variants={item}>
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CircleDot className="size-4 text-slate-400" />
              <CardTitle className="text-base">24-Hour Activity Breakdown</CardTitle>
            </div>
            <CardDescription>Security events in the last 24 hours by type</CardDescription>
          </CardHeader>
          <CardContent>
            {data.hourlyBreakdown && data.hourlyBreakdown.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.hourlyBreakdown.map((hItem) => (
                  <div
                    key={hItem.eventType}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-3 transition-colors hover:shadow-sm',
                      hItem.eventType === 'brute_force_detected' || hItem.eventType === 'ip_blocked'
                        ? 'border-red-100 bg-red-50/30'
                        : hItem.eventType === 'login_failed' || hItem.eventType === 'account_locked'
                          ? 'border-amber-100 bg-amber-50/30'
                          : 'border-slate-100 bg-white'
                    )}
                  >
                    <div className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                      hItem.eventType === 'brute_force_detected' || hItem.eventType === 'ip_blocked'
                        ? 'bg-red-100 ring-1 ring-red-200'
                        : hItem.eventType === 'login_failed' || hItem.eventType === 'account_locked'
                          ? 'bg-amber-100 ring-1 ring-amber-200'
                          : 'bg-slate-50 ring-1 ring-slate-200'
                    )}>
                      {(() => {
                        const Icon = getEventTypeIcon(hItem.eventType)
                        return <Icon className={cn(
                          'size-4',
                          hItem.eventType === 'brute_force_detected' || hItem.eventType === 'ip_blocked'
                            ? 'text-red-600'
                            : hItem.eventType === 'login_failed' || hItem.eventType === 'account_locked'
                              ? 'text-amber-600'
                              : 'text-slate-500'
                        )} />
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">
                        {getEventTypeLabel(hItem.eventType)}
                      </p>
                      <p className="text-lg font-bold text-slate-900">{hItem.count}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ShieldCheck className="mb-2 size-8 text-emerald-300" />
                <p className="text-sm font-medium text-slate-500">No events in the last 24 hours</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══ Footer info ═══ */}
      <motion.div variants={item}>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <Eye className="size-3" />
            <span>Total events tracked: <strong className="text-slate-600">{stats.totalEvents.toLocaleString()}</strong></span>
          </div>
          <span>
            Last updated: {lastFetchRef.current > 0 ? formatTimeAgo(new Date(lastFetchRef.current).toISOString()) : '—'}
            {autoRefresh && <span className="ml-1 text-emerald-500">(auto-refreshing every 30s)</span>}
          </span>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Sub-Components ───────────────────────────────────────────────

function ScoreFactorItem({
  label,
  points,
  earned,
  icon: Icon,
}: {
  label: string
  points: number
  earned: boolean
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className={cn(
        'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors',
        earned
          ? 'bg-emerald-100 text-emerald-600'
          : 'bg-red-100 text-red-400'
      )}>
        {earned ? (
          <ShieldCheck className="size-3.5" />
        ) : (
          <Icon className="size-3.5" />
        )}
      </div>
      <div>
        <p className="text-[11px] font-medium text-slate-600 leading-tight">{label}</p>
        <p className={cn(
          'text-xs font-bold',
          earned ? 'text-emerald-600' : 'text-red-400'
        )}>
          {earned ? `+${points}` : `0 / ${points}`}
        </p>
      </div>
    </div>
  )
}