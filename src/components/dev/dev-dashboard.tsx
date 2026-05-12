'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useAppStore } from '@/store/index'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  School,
  Clock,
  CheckCircle2,
  Users,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  UserPlus,
  Shield,
  AlertTriangle,
  Sparkles,
  Activity,
  Wallet,
  Receipt,
  Package,
  TrendingUp,
  ChevronRight,
  Eye,
  Zap,
  BarChart3,
  Database,
  Server,
  HardDrive,
  Globe,
  Loader2,
  XCircle,
  Banknote,
  BoxesIcon,
  Calculator,
  Ticket,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

// ── Data Interfaces ──────────────────────────────────────────────

interface Stats {
  totalSchools: number
  pending: number
  approved: number
  rejected: number
  suspended: number
  totalStudents: number
  totalTeachers: number
  totalUsers: number
  freePlan: number
  basicPlan: number
  intermediatePlan: number
  premiumPlan: number
  growthPlan: number
  totalPayments: number
  totalVouchers: number
  totalInventoryItems: number
  totalBudgets: number
  recentActivity: ActivityItem[]
}

interface FinancialStats {
  totalFeesCollected: number
  totalExpenses: number
  totalIncome: number
}

interface SchoolData {
  id: string
  name: string
  slug: string
  email: string | null
  state: string | null
  status: string
  plan: string
  primaryColor: string | null
  createdAt: string
  users: number
  students: number
  teachers: number
  classes: number
  subjects: number
  examScores: number
  activityLogs: number
  payments: number
  vouchers: number
  inventoryItems: number
  budgets: number
}

interface PendingSchool {
  id: string
  name: string
  email: string | null
  state: string | null
  createdAt: string
  primaryColor: string | null
}

interface ActivityItem {
  id: string
  action: string
  schoolName: string
  details: string
  timestamp: string
  type: 'registration' | 'approval' | 'rejection' | 'plan_change' | 'suspension' | 'system'
}

// ── Animation Variants ───────────────────────────────────────────

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

// ── Helper Components ────────────────────────────────────────────

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

function getActionBadgeConfig(type: ActivityItem['type']) {
  switch (type) {
    case 'registration':
      return { label: 'Registered', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' }
    case 'approval':
      return { label: 'Approved', className: 'bg-sky-50 text-sky-700 border border-sky-200' }
    case 'rejection':
      return { label: 'Rejected', className: 'bg-rose-50 text-rose-700 border border-rose-200' }
    case 'plan_change':
      return { label: 'Plan Changed', className: 'bg-violet-50 text-violet-700 border border-violet-200' }
    case 'suspension':
      return { label: 'Suspended', className: 'bg-amber-50 text-amber-700 border border-amber-200' }
    case 'system':
      return { label: 'System', className: 'bg-slate-50 text-slate-600 border border-slate-200' }
    default:
      return { label: type, className: 'bg-slate-50 text-slate-600 border border-slate-200' }
  }
}

function getActionIcon(type: ActivityItem['type']) {
  switch (type) {
    case 'registration': return UserPlus
    case 'approval': return CheckCircle2
    case 'rejection': return AlertTriangle
    case 'plan_change': return Sparkles
    case 'suspension': return Shield
    default: return Activity
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'approved':
      return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Active</Badge>
    case 'pending':
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Pending</Badge>
    case 'rejected':
      return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">Rejected</Badge>
    case 'suspended':
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[10px]">Suspended</Badge>
    default:
      return <Badge variant="outline" className="text-[10px]">{status}</Badge>
  }
}

function getPlanBadge(plan: string) {
  switch (plan) {
    case 'free':
      return <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px]">Free</Badge>
    case 'basic':
      return <Badge variant="outline" className="bg-sky-100 text-sky-700 border-sky-200 text-[10px]">Basic</Badge>
    case 'intermediate':
      return <Badge variant="outline" className="bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px]">Intermediate</Badge>
    case 'premium':
      return <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">Premium</Badge>
    case 'growth':
      return <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">Growth</Badge>
    default:
      return <Badge variant="outline" className="text-[10px]">{plan}</Badge>
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Section Header ───────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, description, iconBg, action }: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  iconBg: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm', iconBg)}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <CardTitle className="text-sm font-bold text-slate-900 truncate">{title}</CardTitle>
          {description && <CardDescription className="text-[11px] mt-0 truncate">{description}</CardDescription>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

// ── Main Dashboard Component ─────────────────────────────────────

export function DevDashboard() {
  const navigate = useAppStore((s) => s.navigate)
  const viewSchoolDetail = useAppStore((s) => s.viewSchoolDetail)
  const [stats, setStats] = useState<Stats | null>(null)
  const [financialStats, setFinancialStats] = useState<FinancialStats | null>(null)
  const [pendingSchools, setPendingSchools] = useState<PendingSchool[]>([])
  const [allSchools, setAllSchools] = useState<SchoolData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set())
  const [rejectingIds, setRejectingIds] = useState<Set<string>>(new Set())

  useEffect(() => { fetchStats() }, [])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/dev/stats')
      if (!res.ok) throw new Error('Failed to fetch stats')
      const data = await res.json()
      const transformedActivity = (data.recentActivity || []).map((log: { id: string; action: string; details: string; createdAt: string; tenant: { name: string } }) => ({
        id: log.id,
        action: log.action,
        schoolName: log.tenant?.name || 'Unknown',
        details: log.details,
        timestamp: log.createdAt,
        type: log.action.includes('registered') ? 'registration' as const
          : log.action.includes('approved') ? 'approval' as const
          : log.action.includes('rejected') ? 'rejection' as const
          : log.action.includes('plan') ? 'plan_change' as const
          : log.action.includes('suspended') ? 'suspension' as const
          : 'system' as const,
      }))
      setStats({ ...data.stats, recentActivity: transformedActivity })
      if (data.financialStats) setFinancialStats(data.financialStats)
      const schools: SchoolData[] = data.schools || []
      setAllSchools(schools)
      setPendingSchools(schools.filter((s: SchoolData) => s.status === 'pending'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = useCallback(async (schoolId: string) => {
    setApprovingIds((prev) => new Set(prev).add(schoolId))
    try {
      const res = await fetch('/api/dev/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', schoolId, status: 'approved' }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message || 'Approval failed')
      toast.success('School approved successfully')
      setPendingSchools((prev) => prev.filter((s) => s.id !== schoolId))
      setAllSchools((prev) => prev.map((s) => s.id === schoolId ? { ...s, status: 'approved' } : s))
      setStats((prev) => prev ? { ...prev, pending: Math.max(0, prev.pending - 1), approved: prev.approved + 1 } : prev)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve school')
    } finally {
      setApprovingIds((prev) => { const next = new Set(prev); next.delete(schoolId); return next })
    }
  }, [])

  const handleReject = useCallback(async (schoolId: string) => {
    setRejectingIds((prev) => new Set(prev).add(schoolId))
    try {
      const res = await fetch('/api/dev/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', schoolId, status: 'rejected', rejectionReason: 'Rejected from dashboard' }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message || 'Rejection failed')
      toast.success('School rejected')
      setPendingSchools((prev) => prev.filter((s) => s.id !== schoolId))
      setAllSchools((prev) => prev.map((s) => s.id === schoolId ? { ...s, status: 'rejected' } : s))
      setStats((prev) => prev ? { ...prev, pending: Math.max(0, prev.pending - 1), rejected: prev.rejected + 1 } : prev)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject school')
    } finally {
      setRejectingIds((prev) => { const next = new Set(prev); next.delete(schoolId); return next })
    }
  }, [])

  // ── Derived Data ─────────────────────────────────────────────

  const recentSchools = useMemo(() => {
    return allSchools
      .filter((s) => s.status === 'approved' || s.status === 'pending')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6)
  }, [allSchools])

  const topSchools = useMemo(() => {
    return [...allSchools]
      .filter((s) => s.status === 'approved')
      .map((s) => ({ ...s, activityScore: s.students + s.teachers + s.examScores }))
      .sort((a, b) => b.activityScore - a.activityScore)
      .slice(0, 5)
  }, [allSchools])

  const maxActivityScore = useMemo(() => topSchools.length > 0 ? topSchools[0].activityScore : 1, [topSchools])

  const moduleUsage = useMemo(() => {
    const approvedSchools = allSchools.filter((s) => s.status === 'approved')
    return {
      finance: approvedSchools.filter((s) => s.payments > 0).length,
      inventory: approvedSchools.filter((s) => s.inventoryItems > 0).length,
      budgets: approvedSchools.filter((s) => s.budgets > 0).length,
      vouchers: approvedSchools.filter((s) => s.vouchers > 0).length,
    }
  }, [allSchools])

  const systemHealth = useMemo(() => {
    const totalRecords = (stats?.totalStudents ?? 0) + (stats?.totalTeachers ?? 0) + (allSchools.reduce((sum, s) => sum + s.examScores, 0)) + (stats?.totalPayments ?? 0)
    return { totalRecords }
  }, [stats, allSchools])

  // ── Stat Card Config ──────────────────────────────────────────

  const statCards = [
    { title: 'Total Schools', value: stats?.totalSchools ?? 0, icon: School, iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600', change: '+3 this month', positive: true },
    { title: 'Pending Approval', value: stats?.pending ?? 0, icon: Clock, iconBg: 'bg-gradient-to-br from-amber-500 to-orange-500', change: 'Needs review', positive: null },
    { title: 'Active Schools', value: stats?.approved ?? 0, icon: CheckCircle2, iconBg: 'bg-gradient-to-br from-sky-500 to-blue-600', change: '+2 this week', positive: true },
    { title: 'Total Students', value: stats?.totalStudents ?? 0, icon: Users, iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600', change: '+120 this month', positive: true },
  ]

  // ── Render ────────────────────────────────────────────────────

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">

      {/* ═══════════ HEADER ═══════════ */}
      <motion.div variants={item}>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Platform Overview</h1>
            <p className="text-sm text-slate-500">Monitor all schools, finances and platform activity</p>
          </div>
          <div className="flex items-center gap-2 mt-2 sm:mt-0 flex-wrap">
            <Badge variant="outline" className="text-[11px] border-slate-200 text-slate-500 gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </Badge>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate('dev-schools')}>
              <Eye className="mr-1.5 size-3.5" /> View All Schools
            </Button>
            <Button size="sm" className="h-8 bg-emerald-600 text-xs hover:bg-emerald-700" onClick={() => navigate('dev-plans')}>
              <CreditCard className="mr-1.5 size-3.5" /> Manage Plans
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ═══════════ PENDING ALERT ═══════════ */}
      {!loading && pendingSchools.length > 0 && (
        <motion.div variants={item}>
          <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 shadow-sm">
                  <AlertTriangle className="size-5 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-amber-800">
                    {pendingSchools.length} School{pendingSchools.length > 1 ? 's' : ''} Pending Approval
                  </p>
                  <p className="text-xs text-amber-600 truncate">{pendingSchools.map(s => s.name).join(', ')}</p>
                </div>
              </div>
              <Button size="sm" className="h-8 bg-amber-600 text-xs hover:bg-amber-700 shrink-0" onClick={() => navigate('dev-schools')}>
                <CheckCircle2 className="mr-1.5 size-3.5" /> Review Now <ChevronRight className="ml-1 size-3.5" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══════════ QUICK APPROVE ═══════════ */}
      {!loading && pendingSchools.length > 0 && (
        <motion.div variants={item}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <SectionHeader icon={Zap} title="Quick Approve" description="Take instant action on pending registrations" iconBg="bg-gradient-to-br from-amber-500 to-orange-500" />
            </CardHeader>
            <CardContent className="space-y-2.5">
              {pendingSchools.map((school) => (
                <div key={school.id} className="flex flex-col gap-3 rounded-xl border border-amber-100 bg-amber-50/40 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
                      <School className="size-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{school.name}</p>
                      <p className="text-xs text-slate-500 truncate">{school.email || 'No email'}{school.state ? ` · ${school.state}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" className="h-7 bg-emerald-600 text-xs hover:bg-emerald-700 px-3" disabled={approvingIds.has(school.id) || rejectingIds.has(school.id)} onClick={() => handleApprove(school.id)}>
                      {approvingIds.has(school.id) ? <Loader2 className="mr-1.5 size-3 animate-spin" /> : <CheckCircle2 className="mr-1.5 size-3" />}
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 px-3" disabled={approvingIds.has(school.id) || rejectingIds.has(school.id)} onClick={() => handleReject(school.id)}>
                      {rejectingIds.has(school.id) ? <Loader2 className="mr-1.5 size-3 animate-spin" /> : <XCircle className="mr-1.5 size-3" />}
                      Reject
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-500 hover:text-slate-700 px-2" onClick={() => viewSchoolDetail(school.id)}>
                      <Eye className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ═══════════ QUICK ACTIONS ═══════════ */}
      <motion.div variants={item}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Manage Schools', sub: `${stats?.totalSchools ?? 0} total`, icon: School, bg: 'bg-gradient-to-br from-emerald-500 to-teal-600', hoverBorder: 'hover:border-emerald-300', page: 'dev-schools' as const },
            { label: 'Plans', sub: `${stats?.premiumPlan ?? 0} premium`, icon: CreditCard, bg: 'bg-gradient-to-br from-sky-500 to-blue-600', hoverBorder: 'hover:border-sky-300', page: 'dev-plans' as const },
            { label: 'Quick Review', sub: `${pendingSchools.length} pending`, icon: Zap, bg: 'bg-gradient-to-br from-amber-500 to-orange-500', hoverBorder: 'hover:border-amber-300', disabled: pendingSchools.length === 0, onClick: () => viewSchoolDetail(pendingSchools[0]?.id || '') },
            { label: 'Analytics', sub: `${stats?.totalStudents ?? 0} students`, icon: BarChart3, bg: 'bg-gradient-to-br from-violet-500 to-purple-600', hoverBorder: 'hover:border-violet-300', disabled: (stats?.approved ?? 0) === 0, onClick: () => viewSchoolDetail((stats?.approved && stats.approved > 0) ? '__latest__' : '') },
          ].map((action) => {
            const ActionIcon = action.icon
            return (
              <button
                key={action.label}
                onClick={action.onClick || (() => navigate(action.page))}
                disabled={action.disabled}
                className={cn(
                  'flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm transition-all hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed',
                  action.hoverBorder
                )}
              >
                <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm', action.bg)}>
                  <ActionIcon className="size-4 text-white" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{action.label}</p>
                  <p className="text-[10px] text-slate-400 truncate">{action.sub}</p>
                </div>
              </button>
            )
          })}
        </div>
      </motion.div>

      {/* ═══════════ KEY METRICS ═══════════ */}
      <motion.div variants={item} className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title} className="group overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300">
              <CardContent className="p-5">
                {loading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-3.5 w-28" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between">
                      <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl shadow-sm', card.iconBg)}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      {card.positive !== null && (
                        <div className={cn(
                          'flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                          card.positive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        )}>
                          {card.positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                          {card.change}
                        </div>
                      )}
                    </div>
                    <div className="mt-3">
                      <p className="text-2xl font-extrabold tracking-tight text-slate-900">{card.value.toLocaleString()}</p>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">{card.title}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )
        })}
      </motion.div>

      {/* ═══════════ FINANCIAL OVERVIEW ═══════════ */}
      <motion.div variants={item}>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <SectionHeader icon={TrendingUp} title="Platform Financial Overview" description="Aggregated financial data across all schools" iconBg="bg-gradient-to-br from-emerald-500 to-teal-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Fees Collected', value: formatCurrency(financialStats?.totalFeesCollected ?? 0), sub: `${stats?.totalPayments ?? 0} payments recorded`, icon: Wallet, gradient: 'from-emerald-500 to-teal-600', border: 'border-emerald-200/60', bg: 'bg-emerald-50/40', valueColor: 'text-emerald-700' },
                  { label: 'Total Income', value: formatCurrency(financialStats?.totalIncome ?? 0), sub: 'All schools combined', icon: TrendingUp, gradient: 'from-sky-500 to-blue-600', border: 'border-sky-200/60', bg: 'bg-sky-50/40', valueColor: 'text-sky-700' },
                  { label: 'Total Expenses', value: formatCurrency(financialStats?.totalExpenses ?? 0), sub: 'All schools combined', icon: ArrowDownRight, gradient: 'from-rose-500 to-red-600', border: 'border-rose-200/60', bg: 'bg-rose-50/40', valueColor: 'text-rose-700' },
                  { label: 'Vouchers & Assets', value: String(stats?.totalVouchers ?? 0), sub: `${stats?.totalInventoryItems ?? 0} inventory · ${stats?.totalBudgets ?? 0} budgets`, icon: Receipt, gradient: 'from-violet-500 to-purple-600', border: 'border-violet-200/60', bg: 'bg-violet-50/40', valueColor: 'text-violet-700' },
                ].map((fin) => {
                  const FinIcon = fin.icon
                  return (
                    <div key={fin.label} className={cn('rounded-xl border p-4', fin.border, fin.bg)}>
                      <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br mb-3 shadow-sm', fin.gradient)}>
                        <FinIcon className="size-3.5 text-white" />
                      </div>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{fin.label}</p>
                      <p className={cn('mt-1 text-lg font-extrabold tracking-tight', fin.valueColor)}>{fin.value}</p>
                      <p className="mt-1 text-[11px] text-slate-400 truncate">{fin.sub}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══════════ PLAN DISTRIBUTION + RECENT ACTIVITY ═══════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">

        {/* Plan Distribution */}
        <motion.div variants={item} className="xl:col-span-1 min-w-0">
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="pb-3">
              <SectionHeader icon={CreditCard} title="Plan Distribution" description="Schools by subscription tier" iconBg="bg-gradient-to-br from-emerald-500 to-teal-600" />
            </CardHeader>
            <CardContent className="space-y-2.5">
              {loading ? (
                <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
              ) : (
                <>
                  {[
                    { name: 'Free', count: stats?.freePlan ?? 0, icon: '🆓', color: 'text-slate-600', bar: 'bg-slate-400' },
                    { name: 'Basic', count: stats?.basicPlan ?? 0, icon: '⭐', color: 'text-sky-600', bar: 'bg-sky-500' },
                    { name: 'Intermediate', count: stats?.intermediatePlan ?? 0, icon: '🚀', color: 'text-indigo-600', bar: 'bg-indigo-500' },
                    { name: 'Premium', count: stats?.premiumPlan ?? 0, icon: '💎', color: 'text-amber-600', bar: 'bg-gradient-to-r from-amber-400 to-amber-500' },
                    { name: 'Growth', count: stats?.growthPlan ?? 0, icon: '🌟', color: 'text-emerald-600', bar: 'bg-emerald-500' },
                  ].map((plan) => {
                    const total = (stats?.freePlan ?? 0) + (stats?.basicPlan ?? 0) + (stats?.intermediatePlan ?? 0) + (stats?.premiumPlan ?? 0) + (stats?.growthPlan ?? 0)
                    const pct = total > 0 ? Math.round((plan.count / total) * 100) : 0
                    return (
                      <div key={plan.name} className="group flex items-center gap-3 rounded-xl bg-slate-50/60 px-3.5 py-3 transition-all hover:bg-white hover:shadow-sm">
                        <span className="text-lg shrink-0">{plan.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className={cn('text-xs font-bold', plan.color)}>{plan.name}</p>
                            <p className="text-xs font-bold text-slate-700">{plan.count} <span className="font-normal text-slate-400">schools</span></p>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-200/60 overflow-hidden">
                            <div className={cn('h-full rounded-full transition-all duration-700', plan.bar)} style={{ width: `${pct}%`, minWidth: plan.count > 0 ? '6px' : '0' }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div className="mt-2 flex items-center justify-between rounded-lg bg-slate-900 px-3.5 py-2.5">
                    <span className="text-[11px] font-semibold text-slate-400">Revenue Schools</span>
                    <span className="text-sm font-extrabold text-white">{(stats?.basicPlan ?? 0) + (stats?.intermediatePlan ?? 0) + (stats?.premiumPlan ?? 0) + (stats?.growthPlan ?? 0)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={item} className="xl:col-span-2 min-w-0">
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="pb-3">
              <SectionHeader
                icon={Activity}
                title="Recent Activity"
                description="Latest events across all schools"
                iconBg="bg-gradient-to-br from-slate-700 to-slate-900"
                action={stats?.recentActivity && stats.recentActivity.length > 0 ? (
                  <Badge variant="secondary" className="text-[10px] font-medium">{stats.recentActivity.length} events</Badge>
                ) : undefined}
              />
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-0 px-6 py-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3 py-3">
                      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                      <div className="flex-1 min-w-0 space-y-1"><Skeleton className="h-3.5 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
                      <Skeleton className="h-3 w-14 shrink-0" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertTriangle className="mb-2 size-8 text-amber-400" />
                  <p className="text-sm font-medium text-slate-600">{error}</p>
                </div>
              ) : stats?.recentActivity && stats.recentActivity.length > 0 ? (
                <ScrollArea className="max-h-[400px]">
                  <div className="divide-y divide-slate-50">
                    {stats.recentActivity.map((activity) => {
                      const badgeConfig = getActionBadgeConfig(activity.type)
                      const ActionIcon = getActionIcon(activity.type)
                      return (
                        <div key={activity.id} className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-slate-50/60">
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
                            <ActionIcon className="size-3.5 text-slate-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-slate-800 truncate">{activity.schoolName}</p>
                              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 shrink-0', badgeConfig.className)}>{badgeConfig.label}</Badge>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500 truncate">{activity.details}</p>
                          </div>
                          <span className="shrink-0 text-[11px] text-slate-400 whitespace-nowrap"><RelativeTime timestamp={activity.timestamp} /></span>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Activity className="mb-2 size-8 text-slate-200" />
                  <p className="text-sm font-medium text-slate-500">No recent activity</p>
                  <p className="text-xs text-slate-400">Activity will appear here as schools register</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ═══════════ SYSTEM HEALTH + MODULE USAGE ═══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

        {/* System Health */}
        <motion.div variants={item} className="min-w-0">
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="pb-3">
              <SectionHeader icon={Server} title="System Health" description="Platform infrastructure status" iconBg="bg-gradient-to-br from-slate-700 to-slate-900" action={
                !loading && <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">All Systems Go</Badge>
              } />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid grid-cols-2 gap-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Database', value: 'Connected', icon: Database, statusColor: 'text-emerald-600', dotPulse: true },
                    { label: 'Server', value: 'Active', icon: Server, statusColor: 'text-emerald-600', dotPulse: true },
                    { label: 'Data Records', value: systemHealth.totalRecords.toLocaleString(), icon: HardDrive, statusColor: 'text-slate-700', dotPulse: false },
                    { label: 'API Endpoints', value: '38', icon: Globe, statusColor: 'text-slate-700', dotPulse: false },
                  ].map((check) => {
                    const CheckIcon = check.icon
                    return (
                      <div key={check.label} className="flex items-center gap-3 rounded-xl bg-slate-50/60 p-3 transition-colors hover:bg-white">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-100">
                          <CheckIcon className={cn('size-4', check.statusColor)} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            {check.dotPulse && <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />}
                            <p className="text-[11px] font-medium text-slate-400 truncate">{check.label}</p>
                          </div>
                          <p className={cn('text-sm font-bold truncate', check.statusColor)}>{check.value}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Module Usage */}
        <motion.div variants={item} className="min-w-0">
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="pb-3">
              <SectionHeader icon={Package} title="Module Usage" description="Schools actively using each module" iconBg="bg-gradient-to-br from-violet-500 to-purple-600" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid grid-cols-2 gap-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Finance', value: moduleUsage.finance, icon: Banknote, gradient: 'from-emerald-500 to-teal-600', border: 'border-emerald-200/60', bg: 'bg-emerald-50/40', color: 'text-emerald-700' },
                    { label: 'Inventory', value: moduleUsage.inventory, icon: BoxesIcon, gradient: 'from-sky-500 to-blue-600', border: 'border-sky-200/60', bg: 'bg-sky-50/40', color: 'text-sky-700' },
                    { label: 'Budgets', value: moduleUsage.budgets, icon: Calculator, gradient: 'from-violet-500 to-purple-600', border: 'border-violet-200/60', bg: 'bg-violet-50/40', color: 'text-violet-700' },
                    { label: 'Vouchers', value: moduleUsage.vouchers, icon: Ticket, gradient: 'from-amber-500 to-orange-500', border: 'border-amber-200/60', bg: 'bg-amber-50/40', color: 'text-amber-700' },
                  ].map((mod) => {
                    const ModIcon = mod.icon
                    return (
                      <div key={mod.label} className={cn('rounded-xl border p-3.5', mod.border, mod.bg)}>
                        <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br mb-2 shadow-sm', mod.gradient)}>
                          <ModIcon className="size-3.5 text-white" />
                        </div>
                        <p className={cn('text-xl font-extrabold', mod.color)}>{mod.value}</p>
                        <p className="text-[11px] text-slate-400">of {stats?.approved ?? 0} schools</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ═══════════ RECENT SCHOOLS TABLE ═══════════ */}
      <motion.div variants={item}>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <SectionHeader
              icon={School}
              title="Recent Schools"
              description="Latest registered and approved schools"
              iconBg="bg-gradient-to-br from-emerald-500 to-teal-600"
              action={
                <Button variant="outline" size="sm" className="h-7 text-xs shrink-0" onClick={() => navigate('dev-schools')}>
                  View All <ChevronRight className="ml-1 size-3.5" />
                </Button>
              }
            />
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="px-6 py-4 space-y-3">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}</div>
            ) : recentSchools.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
                      <TableHead className="text-xs font-semibold text-slate-500 pl-5">School Name</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500">Plan</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500">Students</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500">State</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 pr-5">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentSchools.map((school) => (
                      <TableRow key={school.id} className="cursor-pointer hover:bg-emerald-50/20 transition-colors" onClick={() => viewSchoolDetail(school.id)}>
                        <TableCell className="pl-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-sm" style={{ backgroundColor: school.primaryColor || '#10b981' }}>
                              {school.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-slate-800 truncate max-w-[180px]">{school.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(school.status)}</TableCell>
                        <TableCell>{getPlanBadge(school.plan)}</TableCell>
                        <TableCell className="text-sm text-slate-600">{school.students}</TableCell>
                        <TableCell className="text-sm text-slate-500">{school.state || '—'}</TableCell>
                        <TableCell className="pr-5 text-xs text-slate-400 whitespace-nowrap">{formatDate(school.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <School className="mb-2 size-8 text-slate-200" />
                <p className="text-sm font-medium text-slate-500">No schools yet</p>
                <p className="text-xs text-slate-400">Schools will appear here after registration</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══════════ TOP SCHOOLS BY ACTIVITY ═══════════ */}
      <motion.div variants={item}>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <SectionHeader icon={BarChart3} title="Top Schools by Activity" description="Most active by combined students, teachers & exam records" iconBg="bg-gradient-to-br from-amber-500 to-orange-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
            ) : topSchools.length > 0 ? (
              <div className="space-y-2.5">
                {topSchools.map((school, index) => {
                  const percentage = maxActivityScore > 0 ? Math.round((school.activityScore / maxActivityScore) * 100) : 0
                  const rankColors = ['bg-amber-100 text-amber-700 ring-amber-200', 'bg-slate-100 text-slate-600 ring-slate-200', 'bg-orange-100 text-orange-700 ring-orange-200', 'bg-slate-50 text-slate-500 ring-slate-100', 'bg-slate-50 text-slate-500 ring-slate-100']
                  return (
                    <div key={school.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 transition-all hover:shadow-md cursor-pointer" onClick={() => viewSchoolDetail(school.id)}>
                      <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1', rankColors[index] || rankColors[4])}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <p className="text-sm font-semibold text-slate-800 truncate">{school.name}</p>
                          <span className="text-[10px] text-slate-400 hidden sm:inline">{school.students} students · {school.teachers} teachers · {school.examScores} scores</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500" style={{ width: `${percentage}%` }} />
                          </div>
                          <span className="text-xs font-bold text-slate-500 shrink-0 w-12 text-right">{percentage}%</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="mb-2 size-8 text-slate-200" />
                <p className="text-sm font-medium text-slate-500">No active schools</p>
                <p className="text-xs text-slate-400">Activity data will appear once schools are approved</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

    </motion.div>
  )
}
