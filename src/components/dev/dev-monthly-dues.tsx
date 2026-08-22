// src/components/dev/dev-monthly-dues.tsx
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Receipt,
  RefreshCw,
  Eye,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Search,
  Download,
  TrendingUp,
  CalendarDays,
  Trash2,
  FileText,
  Image as ImageIcon,
  ShieldCheck,
  ArrowUpDown,
  Building2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────

interface DueRecord {
  id: string
  tenantId: string
  tenantName: string
  month: string
  amount: number
  status: string
  paidAt: string | null
  evidenceFileData: string | null
  evidenceFileName: string | null
  evidenceFileType: string | null
  evidenceFileSize: string | null
  reference: string | null
  note: string | null
  reviewedBy: string | null
  reviewNote: string | null
  reviewedAt: string | null
  createdAt: string
}

interface Stats {
  unpaid: number
  overdue: number
  paid: number
  pendingReview: number
  totalRevenue: number
  total: number
}

type SortField = 'tenantName' | 'month' | 'amount' | 'status' | 'createdAt'
type SortDir = 'asc' | 'desc'

// ── Helpers ────────────────────────────────────────────────

function formatMonth(m: string): string {
  const [y, mo] = m.split('-')
  const d = new Date(Number(y), Number(mo) - 1)
  return d.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
}

function formatMonthShort(m: string): string {
  const [y, mo] = m.split('-')
  const d = new Date(Number(y), Number(mo) - 1)
  return d.toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })
}

function fmt(n: number): string {
  return `\u20a6${n.toLocaleString()}`
}

function formatDate(d: string | null): string {
  if (!d) return '\u2014'
  return new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function isPendingReview(due: DueRecord): boolean {
  return due.status === 'paid' && !due.reviewedBy && !!due.evidenceFileData
}

// ── Main Component ─────────────────────────────────────────

export function DevMonthlyDues() {
  const [dues, setDues] = useState<DueRecord[]>([])
  const [stats, setStats] = useState<Stats>({ unpaid: 0, overdue: 0, paid: 0, pendingReview: 0, totalRevenue: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generateMonth, setGenerateMonth] = useState('')
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([])
  const [schoolSearch, setSchoolSearch] = useState('')
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([])
  const [showGenerate, setShowGenerate] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Modals
  const [previewEvidence, setPreviewEvidence] = useState<{ data: string; name: string; type: string } | null>(null)
  const [rejectDialog, setRejectDialog] = useState<{ dueId: string; schoolName: string; month: string } | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [deleteDialog, setDeleteDialog] = useState<{ dueId: string; schoolName: string; month: string; amount: number } | null>(null)

  const fetchDues = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/dev/monthly-dues?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setDues(data.dues || [])
      setStats(data.stats || { unpaid: 0, overdue: 0, paid: 0, pendingReview: 0, totalRevenue: 0, total: 0 })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load dues')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { fetchDues() }, [fetchDues])

  useEffect(() => {
    const now = new Date()
    setGenerateMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
    // Fetch approved schools for generate panel
    fetch('/api/dev/schools')
      .then(r => r.json())
      .then(data => {
        const list = (data.schools || [])
          .filter((s: { status: string }) => s.status === 'approved')
          .map((s: { id: string; name: string }) => ({ id: s.id, name: s.name }))
          .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name))
        setSchools(list)
        setSelectedSchoolIds(['all'])
      })
      .catch(() => {})
  }, [])

  const handleGenerate = async () => {
    if (!generateMonth) { toast.error('Select a month'); return }
    if (selectedSchoolIds.length === 0) { toast.error('Select at least one school'); return }
    setGenerating(true)
    try {
      if (selectedSchoolIds.includes('all')) {
        // Generate for all schools
        const res = await fetch('/api/dev/monthly-dues/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ month: generateMonth }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || 'Generation failed')
        toast.success(data.message || `Dues generated for all schools`)
      } else {
        // Generate for each selected school
        let totalGenerated = 0
        let totalSkipped = 0
        for (const tenantId of selectedSchoolIds) {
          try {
            const res = await fetch('/api/dev/monthly-dues/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ month: generateMonth, tenantId }),
            })
            const data = await res.json()
            totalGenerated += data.generated || 0
            totalSkipped += data.skipped || 0
          } catch { /* skip failed school */ }
        }
        toast.success(`Generated ${totalGenerated} dues, skipped ${totalSkipped}`)
      }
      setShowGenerate(false)
      setSelectedSchoolIds(['all'])
      await fetchDues()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setGenerating(false)
    }
  }

  const handleAction = async (dueId: string, action: 'approve' | 'reject' | 'delete', note?: string) => {
    setActionLoading(dueId)
    try {
      const res = await fetch('/api/dev/monthly-dues', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueId, action, reviewerName: 'Platform Admin', reviewNote: note || '' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Action failed')
      toast.success(data.message)
      await fetchDues()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActionLoading(null)
      setRejectDialog(null)
      setDeleteDialog(null)
      setRejectNote('')
    }
  }

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const filteredDues = dues.filter((d) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      d.tenantName.toLowerCase().includes(q) ||
      d.month.includes(q) ||
      (d.reference || '').toLowerCase().includes(q)
    )
  })

  const sortedDues = [...filteredDues].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    if (sortField === 'amount') return (a.amount - b.amount) * dir
    return String(a[sortField]).localeCompare(String(b[sortField])) * dir
  })

  const totalOutstanding = dues
    .filter(d => d.status === 'unpaid' || d.status === 'overdue')
    .reduce((s, d) => s + d.amount, 0)

  const statusFilters = [
    { key: 'all', label: 'All Records', count: stats.total },
    { key: 'unpaid', label: 'Unpaid', count: stats.unpaid },
    { key: 'overdue', label: 'Overdue', count: stats.overdue },
    { key: 'pending_review', label: 'Pending Review', count: stats.pendingReview },
    { key: 'paid', label: 'Verified', count: stats.paid },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

      {/* ─── Page Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Monthly Dues</h1>
          <p className="text-sm text-slate-500">Monitor, verify, and manage school maintenance payments across all tenants.</p>
        </div>
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <Button
            variant="outline" size="sm"
            onClick={() => setShowGenerate(!showGenerate)}
            className="h-8 text-xs"
          >
            <CalendarDays className="mr-1.5 size-3.5" />
            Generate Dues
          </Button>
          <Button variant="outline" size="sm" onClick={fetchDues} disabled={loading} className="h-8 text-xs">
            <RefreshCw className={cn('mr-1.5 size-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ─── Generate Dues Panel ─── */}
      <AnimatePresence>
        {showGenerate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="sm:w-48 space-y-2">
                    <Label className="text-sm text-slate-700 font-medium">Select Month</Label>
                    <Input
                      type="month"
                      value={generateMonth}
                      onChange={(e) => setGenerateMonth(e.target.value)}
                      className="bg-white border-slate-200 text-slate-900 h-10 focus:ring-amber-500/20 focus:border-amber-500/50"
                    />
                  </div>

                  {/* Visible school checkbox list */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-slate-700 font-medium">
                        Select Schools
                        {selectedSchoolIds.length > 0 && !selectedSchoolIds.includes('all') && (
                          <span className="ml-1.5 text-amber-600 text-xs font-normal">({selectedSchoolIds.length} selected)</span>
                        )}
                      </Label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedSchoolIds(schools.map(s => s.id))}
                          className="text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors"
                        >
                          Check All
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedSchoolIds([])}
                          className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Search box */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search schools..."
                        value={schoolSearch}
                        onChange={(e) => setSchoolSearch(e.target.value)}
                        className="w-full h-8 pl-8 pr-3 text-sm bg-white border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                      />
                    </div>

                    {/* Visible checkbox list */}
                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y divide-slate-100">
                      {/* All Schools option */}
                      <label
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors text-sm sticky top-0',
                          selectedSchoolIds.includes('all')
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-white text-slate-600 hover:bg-slate-50'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSchoolIds.includes('all')}
                          onChange={() => setSelectedSchoolIds(['all'])}
                          className="size-4 rounded border-slate-300 bg-white text-amber-600 focus:ring-amber-500/30"
                        />
                        <Building2 className="size-4 text-amber-600 shrink-0" />
                        <span className="font-medium">All Approved Schools</span>
                      </label>

                      {schools
                        .filter(s => !schoolSearch || s.name.toLowerCase().includes(schoolSearch.toLowerCase()))
                        .map(s => {
                          const isSelected = selectedSchoolIds.includes(s.id) && !selectedSchoolIds.includes('all')
                          return (
                            <label
                              key={s.id}
                              className={cn(
                                'flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors text-sm',
                                isSelected
                                  ? 'bg-amber-50 text-amber-800'
                                  : 'text-slate-600 hover:bg-slate-50'
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  if (selectedSchoolIds.includes('all')) {
                                    setSelectedSchoolIds([s.id])
                                  } else if (isSelected) {
                                    setSelectedSchoolIds(prev => prev.filter(id => id !== s.id))
                                  } else {
                                    setSelectedSchoolIds(prev => [...prev, s.id])
                                  }
                                }}
                                className="size-4 rounded border-slate-300 bg-white text-amber-600 focus:ring-amber-500/30"
                              />
                              <span className="truncate">{s.name}</span>
                            </label>
                          )
                        })
                      }

                      {schools.filter(s => !schoolSearch || s.name.toLowerCase().includes(schoolSearch.toLowerCase())).length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-3">No schools found</p>
                      )}
                    </div>
                  </div>

                  <div className="sm:w-44">
                    <Label className="text-sm text-slate-700 font-medium invisible">Action</Label>
                    <Button onClick={handleGenerate} disabled={generating} size="sm" className="w-full bg-amber-600 hover:bg-amber-700 text-white gap-2 h-10 px-5 shrink-0">
                      {generating ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                      {generating ? 'Generating...' : 'Generate'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Stats Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          label="Total Records"
          value={String(stats.total)}
          icon={Receipt}
          gradient="from-slate-500 to-slate-700"
          border="border-slate-100"
          bg="bg-white"
        />
        <StatCard
          label="Unpaid"
          value={String(stats.unpaid)}
          icon={Clock}
          gradient="from-amber-500 to-orange-500"
          border="border-amber-100"
          bg="bg-amber-50/40"
          valueColor="text-amber-700"
        />
        <StatCard
          label="Overdue"
          value={String(stats.overdue)}
          icon={AlertTriangle}
          gradient="from-rose-500 to-red-600"
          border="border-rose-100"
          bg="bg-rose-50/40"
          valueColor="text-rose-700"
        />
        <StatCard
          label="Pending Review"
          value={String(stats.pendingReview)}
          icon={Eye}
          gradient="from-sky-500 to-blue-600"
          border="border-sky-100"
          bg="bg-sky-50/40"
          valueColor="text-sky-700"
        />
        <StatCard
          label="Verified"
          value={String(stats.paid)}
          icon={ShieldCheck}
          gradient="from-emerald-500 to-teal-600"
          border="border-emerald-100"
          bg="bg-emerald-50/40"
          valueColor="text-emerald-700"
        />
        <StatCard
          label="Total Revenue"
          value={fmt(stats.totalRevenue)}
          icon={TrendingUp}
          gradient="from-emerald-500 to-teal-600"
          border="border-emerald-100"
          bg="bg-emerald-50/40"
          valueColor="text-emerald-700"
        />
      </div>

      {/* ─── Search + Filter Bar ─── */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search schools, months, references..."
            className="pl-9 h-9 text-sm bg-white border-slate-200"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {statusFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200',
                statusFilter === f.key
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
              )}
            >
              {f.label}
              <span className={cn(
                'ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1',
                statusFilter === f.key
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200/80 text-slate-500'
              )}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Dues Table ─── */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm bg-gradient-to-br from-amber-500 to-orange-500">
              <Receipt className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-bold text-slate-900 truncate">All Due Records</CardTitle>
              <CardDescription className="text-[11px] mt-0">Click a row to expand details</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-[1fr_140px_130px_150px_100px] gap-4 px-5 py-3 border-b border-slate-100 bg-slate-50/60">
            <SortHeader label="School" field="tenantName" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
            <SortHeader label="Month" field="month" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
            <SortHeader label="Amount" field="amount" sortField={sortField} sortDir={sortDir} onSort={toggleSort} alignRight />
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Actions</div>
          </div>

          {/* Table Body */}
          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="size-8 animate-spin mx-auto mb-3 text-slate-300" />
              <p className="text-sm text-slate-500">Loading dues...</p>
            </div>
          ) : filteredDues.length === 0 ? (
            <div className="py-16 text-center">
              <Receipt className="size-8 mx-auto mb-3 text-slate-200" />
              <p className="text-sm font-medium text-slate-500">No dues found</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {sortedDues.map((due, i) => {
                const pending = isPendingReview(due)
                const hasEvidence = !!due.evidenceFileData
                const isVerified = due.status === 'paid' && !!due.reviewedBy

                return (
                  <motion.div
                    key={due.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02, duration: 0.2 }}
                    className="group"
                  >
                    {/* Desktop Row */}
                    <div className="hidden md:grid grid-cols-[1fr_140px_130px_150px_100px] gap-4 px-5 py-3 items-center hover:bg-slate-50/60 transition-colors duration-150">
                      {/* School */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 shrink-0">
                            <Building2 className="size-3.5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{due.tenantName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {due.reference && (
                                <span className="text-[11px] text-slate-400 font-mono">Ref: {due.reference}</span>
                              )}
                              {due.reviewedAt && (
                                <span className="text-[11px] text-slate-400">Reviewed {formatDate(due.reviewedAt)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Month */}
                      <div>
                        <p className="text-sm text-slate-700 font-medium">{formatMonthShort(due.month)}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Created {formatDate(due.createdAt)}</p>
                      </div>

                      {/* Amount */}
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">{fmt(due.amount)}</p>
                      </div>

                      {/* Status */}
                      <div>
                        <DueStatusBadge status={due.status} reviewedBy={due.reviewedBy} />
                        {due.reviewNote && due.reviewedBy && (
                          <p className="text-[11px] text-slate-400 mt-1 truncate max-w-[180px]">{due.reviewNote}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-1">
                        {pending && (
                          <>
                            <button
                              onClick={() => handleAction(due.id, 'approve', 'Approved by Platform Admin')}
                              disabled={actionLoading === due.id}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-all disabled:opacity-50"
                              title="Approve"
                            >
                              {actionLoading === due.id ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                            </button>
                            <button
                              onClick={() => setRejectDialog({ dueId: due.id, schoolName: due.tenantName, month: formatMonth(due.month) })}
                              disabled={actionLoading === due.id}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-rose-600 hover:bg-rose-50 transition-all disabled:opacity-50"
                              title="Reject"
                            >
                              <XCircle className="size-4" />
                            </button>
                          </>
                        )}

                        {hasEvidence && (
                          <button
                            onClick={() => setPreviewEvidence({ data: due.evidenceFileData!, name: due.evidenceFileName || 'evidence', type: due.evidenceFileType || 'image/png' })}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-sky-600 hover:bg-sky-50 transition-all"
                            title="View Evidence"
                          >
                            {due.evidenceFileType === 'application/pdf' ? <FileText className="size-4" /> : <ImageIcon className="size-4" />}
                          </button>
                        )}

                        {isVerified && (
                          <span className="inline-flex items-center justify-center w-8 h-8 text-emerald-500" title="Verified">
                            <ShieldCheck className="size-4" />
                          </span>
                        )}

                        <button
                          onClick={() => setDeleteDialog({ dueId: due.id, schoolName: due.tenantName, month: formatMonth(due.month), amount: due.amount })}
                          disabled={actionLoading === due.id}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>

                    {/* Mobile Card */}
                    <div className="md:hidden px-4 py-3.5 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 shrink-0">
                            <Building2 className="size-4 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{due.tenantName}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{formatMonthShort(due.month)}</p>
                          </div>
                        </div>
                        <DueStatusBadge status={due.status} reviewedBy={due.reviewedBy} />
                      </div>
                      <div className="flex items-center justify-between pl-12">
                        <p className="text-sm font-bold text-slate-900">{fmt(due.amount)}</p>
                        <div className="flex items-center gap-1">
                          {pending && (
                            <>
                              <button
                                onClick={() => handleAction(due.id, 'approve', 'Approved by Platform Admin')}
                                disabled={actionLoading === due.id}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-emerald-600 hover:bg-emerald-50"
                              >
                                {actionLoading === due.id ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                              </button>
                              <button
                                onClick={() => setRejectDialog({ dueId: due.id, schoolName: due.tenantName, month: formatMonth(due.month) })}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-rose-600 hover:bg-rose-50"
                              >
                                <XCircle className="size-4" />
                              </button>
                            </>
                          )}
                          {hasEvidence && (
                            <button
                              onClick={() => setPreviewEvidence({ data: due.evidenceFileData!, name: due.evidenceFileName || 'evidence', type: due.evidenceFileType || 'image/png' })}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-sky-600 hover:bg-sky-50"
                            >
                              {due.evidenceFileType === 'application/pdf' ? <FileText className="size-4" /> : <ImageIcon className="size-4" />}
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteDialog({ dueId: due.id, schoolName: due.tenantName, month: formatMonth(due.month), amount: due.amount })}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}

          {/* Footer */}
          {!loading && filteredDues.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/40">
              <p className="text-xs text-slate-400">
                Showing <span className="font-semibold text-slate-600">{filteredDues.length}</span> of {stats.total} records
              </p>
              <p className="text-xs text-slate-400">
                Total Outstanding: <span className="font-bold text-rose-600">{fmt(totalOutstanding)}</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ Evidence Preview Modal ═══ */}
      <AnimatePresence>
        {previewEvidence && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
            onClick={() => setPreviewEvidence(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-4xl w-full rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'flex items-center justify-center w-9 h-9 rounded-lg',
                    previewEvidence.type === 'application/pdf' ? 'bg-rose-100' : 'bg-sky-100'
                  )}>
                    {previewEvidence.type === 'application/pdf' ? <FileText className="size-4 text-rose-600" /> : <ImageIcon className="size-4 text-sky-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Payment Evidence</p>
                    <p className="text-xs text-slate-400 mt-0.5">{previewEvidence.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewEvidence(null)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="p-4 bg-slate-50">
                {previewEvidence.type === 'application/pdf' ? (
                  <iframe
                    src={`data:application/pdf;base64,${previewEvidence.data.replace(/^data:application\/pdf;base64,/, '')}`}
                    className="w-full h-[70vh] rounded-xl border border-slate-200"
                    title="Payment evidence PDF"
                  />
                ) : (
                  <img src={previewEvidence.data} alt="Payment evidence" className="w-full rounded-xl" />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Reject Confirmation Modal ═══ */}
      <Dialog open={!!rejectDialog} onOpenChange={(open) => { if (!open) setRejectDialog(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-rose-100 shrink-0">
                <XCircle className="size-5 text-rose-600" />
              </div>
              <div>
                <DialogTitle className="text-slate-900">Reject Payment</DialogTitle>
                <DialogDescription className="text-slate-500 mt-0.5">
                  {rejectDialog?.schoolName} &mdash; {rejectDialog?.month}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="rounded-xl bg-rose-50 border border-rose-100 p-3">
              <p className="text-xs text-rose-600">The school will be notified and can re-upload new evidence after rejection.</p>
            </div>
            <div>
              <Label className="text-sm text-slate-700 font-medium">Reason for rejection</Label>
              <Input
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="e.g. Blurry screenshot, wrong amount shown..."
                className="mt-1.5 text-sm h-9"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setRejectDialog(null)} className="flex-1">Cancel</Button>
            <Button
              onClick={() => rejectDialog && handleAction(rejectDialog.dueId, 'reject', rejectNote || 'Rejected by admin')}
              className="flex-1 bg-rose-600 hover:bg-rose-700 gap-1.5"
              size="sm"
            >
              <XCircle className="size-3.5" />
              Reject Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Delete Confirmation Modal ═══ */}
      <Dialog open={!!deleteDialog} onOpenChange={(open) => { if (!open) setDeleteDialog(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-rose-100 shrink-0">
                <Trash2 className="size-5 text-rose-600" />
              </div>
              <div>
                <DialogTitle className="text-slate-900">Delete Due Record</DialogTitle>
                <DialogDescription className="text-slate-500 mt-0.5">
                  This action is permanent and cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 mt-2 space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">School</span>
              <span className="text-slate-900 font-medium">{deleteDialog?.schoolName}</span>
            </div>
            <div className="h-px bg-slate-200" />
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Month</span>
              <span className="text-slate-900 font-medium">{deleteDialog?.month}</span>
            </div>
            <div className="h-px bg-slate-200" />
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Amount</span>
              <span className="text-rose-600 font-bold">{deleteDialog ? fmt(deleteDialog.amount) : ''}</span>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteDialog(null)} className="flex-1">Cancel</Button>
            <Button
              onClick={() => deleteDialog && handleAction(deleteDialog.dueId, 'delete')}
              className="flex-1 bg-rose-600 hover:bg-rose-700 gap-1.5"
              size="sm"
            >
              <Trash2 className="size-3.5" />
              Delete Permanently
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </motion.div>
  )
}

// ── Sub-Components ─────────────────────────────────────────

function SortHeader({ label, field, sortField, sortDir, onSort, alignRight }: {
  label: string; field: SortField; sortField: SortField; sortDir: SortDir; onSort: (f: SortField) => void; alignRight?: boolean
}) {
  const active = sortField === field
  return (
    <button
      onClick={() => onSort(field)}
      className={cn(
        'flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors',
        alignRight && 'justify-end',
        active ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-700'
      )}
    >
      {label}
      <ArrowUpDown className={cn('size-3', active ? 'opacity-100' : 'opacity-30')} />
    </button>
  )
}

function StatCard({ label, value, icon: Icon, gradient, border, bg, valueColor }: {
  label: string; value: string; icon: React.ComponentType<{ className?: string }>; gradient: string; border: string; bg: string; valueColor?: string
}) {
  return (
    <div className={cn('rounded-xl border p-4 transition-all duration-200 hover:shadow-md', border, bg)}>
      <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br mb-3 shadow-sm', gradient)}>
        <Icon className="size-3.5 text-white" />
      </div>
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={cn('mt-1 text-lg font-extrabold tracking-tight', valueColor || 'text-slate-900')}>{value}</p>
    </div>
  )
}

function DueStatusBadge({ status, reviewedBy }: { status: string; reviewedBy: string | null }) {
  if (status === 'paid' && reviewedBy) {
    return (
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] gap-1 font-medium">
        <ShieldCheck className="size-3" />Verified
      </Badge>
    )
  }
  if (status === 'paid') {
    return (
      <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] gap-1 font-medium">
        <Eye className="size-3" />Pending Review
      </Badge>
    )
  }
  if (status === 'overdue') {
    return (
      <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] gap-1 font-medium">
        <AlertTriangle className="size-3" />Overdue
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] gap-1 font-medium">
      <Clock className="size-3" />Unpaid
    </Badge>
  )
}