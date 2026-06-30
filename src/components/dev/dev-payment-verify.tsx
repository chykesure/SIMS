'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  RefreshCw,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Image as ImageIcon,
  Building2,
  Mail,
  MapPin,
  CreditCard,
  ArrowUpRight,
  CalendarDays,
  MessageSquare,
  ShieldCheck,
  ShieldX,
  Banknote,
  Receipt,
  AlertCircle,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TenantData {
  id: string
  name: string
  slug: string
  logo: string | null
  email: string | null
  phone: string | null
  state: string | null
  status: string
  plan: string
}

interface PaymentEvidence {
  id: string
  tenantId: string
  tenantName: string
  tenantEmail: string
  type: 'new_subscription' | 'renewal' | 'upgrade'
  targetPlan: 'free' | 'basic' | 'premium'
  amountUSD: number | null
  amountNGN: number | null
  fileName: string | null
  fileSize: number | null
  fileType: string | null
  fileData: string | null
  reference: string | null
  note: string | null
  status: 'pending' | 'verified' | 'rejected'
  reviewedBy: string | null
  reviewNote: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
  tenant?: TenantData
}

interface PaymentCounts {
  total: number
  pending: number
  verified: number
  rejected: number
}

type FilterTab = 'all' | 'pending' | 'verified' | 'rejected'

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

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

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, damping: 25, stiffness: 300 },
  },
  exit: { opacity: 0, scale: 0.95, y: 20 },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number | null, currency: 'USD' | 'NGN'): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImageType(mimeType: string | null): boolean {
  if (!mimeType) return false
  return mimeType.startsWith('image/')
}

function isPdfType(mimeType: string | null): boolean {
  if (!mimeType) return false
  return mimeType === 'application/pdf'
}

function getPlanBadge(plan: string): { label: string; className: string } {
  switch (plan) {
    case 'premium':
      return {
        label: 'Premium',
        className: 'bg-amber-100 text-amber-700 border-amber-200',
      }
    case 'basic':
      return {
        label: 'Basic',
        className: 'bg-sky-100 text-sky-700 border-sky-200',
      }
    case 'free':
    default:
      return {
        label: 'Free',
        className: 'bg-slate-100 text-slate-600 border-slate-200',
      }
  }
}

function getTypeBadge(type: string): { label: string; className: string } {
  switch (type) {
    case 'new_subscription':
      return {
        label: 'New Subscription',
        className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      }
    case 'renewal':
      return {
        label: 'Renewal',
        className: 'bg-sky-100 text-sky-700 border-sky-200',
      }
    case 'upgrade':
      return {
        label: 'Upgrade',
        className: 'bg-violet-100 text-violet-700 border-violet-200',
      }
    default:
      return {
        label: type,
        className: 'bg-slate-100 text-slate-600 border-slate-200',
      }
  }
}

function getStatusBadge(status: string): { label: string; className: string; icon: React.ElementType } {
  switch (status) {
    case 'pending':
      return {
        label: 'Pending',
        className: 'bg-amber-100 text-amber-700 border-amber-200',
        icon: Clock,
      }
    case 'verified':
      return {
        label: 'Verified',
        className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        icon: CheckCircle2,
      }
    case 'rejected':
      return {
        label: 'Rejected',
        className: 'bg-rose-100 text-rose-700 border-rose-200',
        icon: XCircle,
      }
    default:
      return {
        label: status,
        className: 'bg-slate-100 text-slate-600 border-slate-200',
        icon: AlertCircle,
      }
  }
}

function getMimeTypeFromFileName(fileName: string | null): string | null {
  if (!fileName) return null
  const ext = fileName.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'png': return 'image/png'
    case 'jpg':
    case 'jpeg': return 'image/jpeg'
    case 'gif': return 'image/gif'
    case 'webp': return 'image/webp'
    case 'svg': return 'image/svg+xml'
    case 'pdf': return 'application/pdf'
    default: return null
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FileThumbnail({
  evidence,
  onClick,
  className,
}: {
  evidence: PaymentEvidence
  onClick?: () => void
  className?: string
}) {
  const mimeType = evidence.fileType || getMimeTypeFromFileName(evidence.fileName)
  const isImage = isImageType(mimeType)
  const isPdf = isPdfType(mimeType)

  if (isImage && evidence.fileData) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-50',
          className
        )}
      >
        <img
          src={evidence.fileData}
          alt={evidence.fileName || 'Payment evidence'}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <Eye className="size-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </button>
    )
  }

  if (isPdf) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-rose-50 text-rose-500 transition-colors hover:bg-rose-100',
          className
        )}
      >
        <FileText className="size-6" />
        <span className="mt-1 text-[10px] font-medium">PDF</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 transition-colors hover:bg-slate-100',
        className
      )}
    >
      <FileText className="size-6" />
      <span className="mt-1 text-[10px] font-medium">File</span>
    </button>
  )
}

function DetailModal({
  evidence,
  onClose,
  onVerify,
  onReject,
  isSubmitting,
}: {
  evidence: PaymentEvidence
  onClose: () => void
  onVerify: (reviewNote: string) => void
  onReject: (reviewNote: string) => void
  isSubmitting: boolean
}) {
  const [verifyNote, setVerifyNote] = useState('')
  const [rejectNote, setRejectNote] = useState('')
  const [activeAction, setActiveAction] = useState<'verify' | 'reject' | null>(null)
  const statusBadge = getStatusBadge(evidence.status)
  const planBadge = getPlanBadge(evidence.targetPlan)
  const typeBadge = getTypeBadge(evidence.type)
  const mimeType = evidence.fileType || getMimeTypeFromFileName(evidence.fileName)
  const isImage = isImageType(mimeType)
  const isPdf = isPdfType(mimeType)
  const StatusIcon = statusBadge.icon
  const tenant = evidence.tenant

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 sm:p-6"
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl my-4 sm:my-8"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <Receipt className="size-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-900">Payment Evidence</h2>
            <Badge variant="outline" className={cn('text-xs', statusBadge.className)}>
              <StatusIcon className="size-3 mr-1" />
              {statusBadge.label}
            </Badge>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* File Preview */}
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
            {isImage && evidence.fileData ? (
              <div className="flex items-center justify-center p-2">
                <img
                  src={evidence.fileData}
                  alt={evidence.fileName || 'Payment evidence'}
                  className="max-h-[500px] w-auto rounded-lg object-contain"
                />
              </div>
            ) : isPdf ? (
              <div className="flex flex-col items-center justify-center py-16 text-rose-400">
                <FileText className="size-16 mb-3" />
                <p className="text-sm font-medium text-rose-500">PDF Document</p>
                <p className="text-xs text-slate-400 mt-1">
                  {evidence.fileName || 'document.pdf'} &middot; {formatFileSize(evidence.fileSize)}
                </p>
              </div>
            ) : evidence.fileData ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <FileText className="size-16 mb-3" />
                <p className="text-sm font-medium text-slate-500">{evidence.fileName || 'File'}</p>
                <p className="text-xs text-slate-400 mt-1">{formatFileSize(evidence.fileSize)}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <AlertCircle className="size-16 mb-3" />
                <p className="text-sm font-medium text-slate-500">No file attached</p>
              </div>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* School / Tenant Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <Building2 className="size-4 text-slate-400" />
                School Information
              </h3>
              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-400 w-16 shrink-0">School</span>
                  <span className="text-sm font-medium text-slate-800 truncate">
                    {tenant?.name || evidence.tenantName}
                  </span>
                </div>
                {tenant?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="size-3 text-slate-400 ml-[4.25rem]" />
                    <span className="text-xs text-slate-600 truncate">{tenant.email}</span>
                  </div>
                )}
                {tenant?.state && (
                  <div className="flex items-center gap-2">
                    <MapPin className="size-3 text-slate-400 ml-[4.25rem]" />
                    <span className="text-xs text-slate-600">{tenant.state}</span>
                  </div>
                )}
                {tenant?.plan && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-400 w-16 shrink-0">Plan</span>
                    <Badge variant="outline" className={cn('text-[11px]', getPlanBadge(tenant.plan).className)}>
                      {getPlanBadge(tenant.plan).label}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Details */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <CreditCard className="size-4 text-slate-400" />
                Payment Details
              </h3>
              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-400 w-16 shrink-0">Type</span>
                  <Badge variant="outline" className={cn('text-[11px]', typeBadge.className)}>
                    {typeBadge.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-400 w-16 shrink-0">Target</span>
                  <Badge variant="outline" className={cn('text-[11px]', planBadge.className)}>
                    {planBadge.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-400 w-16 shrink-0">USD</span>
                  <span className="text-sm font-medium text-slate-800">
                    {formatCurrency(evidence.amountUSD, 'USD')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-400 w-16 shrink-0">NGN</span>
                  <span className="text-sm font-medium text-slate-800">
                    {formatCurrency(evidence.amountNGN, 'NGN')}
                  </span>
                </div>
                {evidence.reference && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-400 w-16 shrink-0">Ref</span>
                    <span className="text-xs text-slate-600 font-mono truncate">{evidence.reference}</span>
                  </div>
                )}
                {evidence.note && (
                  <div className="flex items-start gap-2">
                    <MessageSquare className="size-3 text-slate-400 mt-0.5 ml-[4.25rem]" />
                    <span className="text-xs text-slate-600">{evidence.note}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1">
              <CalendarDays className="size-3.5" />
              Submitted: {formatDate(evidence.createdAt)}
            </div>
            {evidence.fileName && (
              <div className="flex items-center gap-1">
                <FileText className="size-3.5" />
                {evidence.fileName} ({formatFileSize(evidence.fileSize)})
              </div>
            )}
          </div>

          {/* Review info for non-pending */}
          {(evidence.status === 'verified' || evidence.status === 'rejected') && (
            <div
              className={cn(
                'rounded-lg border p-4',
                evidence.status === 'verified'
                  ? 'border-emerald-200 bg-emerald-50/50'
                  : 'border-rose-200 bg-rose-50/50'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                {evidence.status === 'verified' ? (
                  <ShieldCheck className="size-4 text-emerald-600" />
                ) : (
                  <ShieldX className="size-4 text-rose-600" />
                )}
                <span className="text-sm font-semibold text-slate-700">
                  {evidence.status === 'verified' ? 'Verified' : 'Rejected'} by {evidence.reviewedBy || 'Admin'}
                </span>
              </div>
              {evidence.reviewedAt && (
                <p className="text-xs text-slate-500 mb-1">{formatDate(evidence.reviewedAt)}</p>
              )}
              {evidence.reviewNote && (
                <p className="text-sm text-slate-600 bg-white/60 rounded-md px-3 py-2 mt-2 border">
                  {evidence.reviewNote}
                </p>
              )}
            </div>
          )}

          {/* Actions for pending */}
          {evidence.status === 'pending' && (
            <div className="space-y-3">
              {activeAction === null ? (
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => setActiveAction('verify')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                    disabled={isSubmitting}
                  >
                    <CheckCircle2 className="size-4" />
                    Verify Payment
                  </Button>
                  <Button
                    onClick={() => setActiveAction('reject')}
                    variant="outline"
                    className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 gap-2"
                    disabled={isSubmitting}
                  >
                    <XCircle className="size-4" />
                    Reject Evidence
                  </Button>
                </div>
              ) : (
                <div
                  className={cn(
                    'rounded-lg border p-4 space-y-3',
                    activeAction === 'verify'
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : 'border-rose-200 bg-rose-50/50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {activeAction === 'verify' ? (
                      <ShieldCheck className="size-4 text-emerald-600" />
                    ) : (
                      <ShieldX className="size-4 text-rose-600" />
                    )}
                    <span className="text-sm font-semibold text-slate-700">
                      {activeAction === 'verify' ? 'Verify this payment' : 'Reject this evidence'}
                    </span>
                  </div>
                  <Textarea
                    placeholder={
                      activeAction === 'verify'
                        ? 'Add a note for the school (optional)...'
                        : 'Reason for rejection (recommended)...'
                    }
                    value={activeAction === 'verify' ? verifyNote : rejectNote}
                    onChange={(e) =>
                      activeAction === 'verify'
                        ? setVerifyNote(e.target.value)
                        : setRejectNote(e.target.value)
                    }
                    className="bg-white/80 resize-none"
                    rows={3}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (activeAction === 'verify') {
                          onVerify(verifyNote)
                        } else {
                          onReject(rejectNote)
                        }
                      }}
                      disabled={isSubmitting}
                      className={cn(
                        activeAction === 'verify'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-rose-600 hover:bg-rose-700 text-white'
                      )}
                    >
                      {isSubmitting ? (
                        <RefreshCw className="size-4 animate-spin mr-1" />
                      ) : activeAction === 'verify' ? (
                        <CheckCircle2 className="size-4 mr-1" />
                      ) : (
                        <XCircle className="size-4 mr-1" />
                      )}
                      {isSubmitting
                        ? 'Processing...'
                        : activeAction === 'verify'
                          ? 'Confirm Verification'
                          : 'Confirm Rejection'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setActiveAction(null)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function DevPaymentVerify() {
  const [evidences, setEvidences] = useState<PaymentEvidence[]>([])
  const [counts, setCounts] = useState<PaymentCounts>({
    total: 0,
    pending: 0,
    verified: 0,
    rejected: 0,
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEvidence, setSelectedEvidence] = useState<PaymentEvidence | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dev/payment-evidence')
      if (!res.ok) throw new Error('Failed to fetch payment evidences')
      const data = await res.json()
      setEvidences(data.evidences || [])
      setCounts(data.counts || { total: 0, pending: 0, verified: 0, rejected: 0 })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load payment evidences')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredEvidences = useMemo(() => {
    let filtered = evidences

    if (activeTab !== 'all') {
      filtered = filtered.filter((e) => e.status === activeTab)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter((e) => {
        const searchFields = [
          e.tenantName,
          e.tenantEmail,
          e.reference,
          e.note,
          e.fileName,
          e.tenant?.name,
          e.tenant?.email,
          e.tenant?.state,
        ]
        return searchFields.some((field) => field?.toLowerCase().includes(q))
      })
    }

    return filtered
  }, [evidences, activeTab, searchQuery])

  const handleVerify = async (evidenceId: string, reviewNote: string) => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/dev/payment-evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', evidenceId, reviewNote }),
      })
      if (!res.ok) throw new Error('Failed to verify payment evidence')
      toast.success('Payment evidence verified successfully')
      setSelectedEvidence(null)
      await fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to verify payment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async (evidenceId: string, reviewNote: string) => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/dev/payment-evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', evidenceId, reviewNote }),
      })
      if (!res.ok) throw new Error('Failed to reject payment evidence')
      toast.success('Payment evidence rejected')
      setSelectedEvidence(null)
      await fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject payment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const quickVerify = async (evidenceId: string) => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/dev/payment-evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', evidenceId, reviewNote: '' }),
      })
      if (!res.ok) throw new Error('Failed to verify')
      toast.success('Payment evidence verified')
      await fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to verify')
    } finally {
      setIsSubmitting(false)
    }
  }

  const quickReject = async (evidenceId: string) => {
    const note = window.prompt('Reason for rejection (optional):')
    if (note === null) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/dev/payment-evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', evidenceId, reviewNote: note }),
      })
      if (!res.ok) throw new Error('Failed to reject')
      toast.success('Payment evidence rejected')
      await fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject')
    } finally {
      setIsSubmitting(false)
    }
  }

  const statCards = [
    {
      title: 'Total Evidences',
      value: counts.total,
      icon: Receipt,
      bgColor: 'bg-slate-50',
      iconColor: 'text-slate-600',
      ringColor: 'ring-slate-100',
    },
    {
      title: 'Pending Review',
      value: counts.pending,
      icon: Clock,
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
      ringColor: 'ring-amber-100',
    },
    {
      title: 'Verified',
      value: counts.verified,
      icon: CheckCircle2,
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      ringColor: 'ring-emerald-100',
    },
    {
      title: 'Rejected',
      value: counts.rejected,
      icon: XCircle,
      bgColor: 'bg-rose-50',
      iconColor: 'text-rose-600',
      ringColor: 'ring-rose-100',
    },
  ]

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.total },
    { key: 'pending', label: 'Pending', count: counts.pending },
    { key: 'verified', label: 'Verified', count: counts.verified },
    { key: 'rejected', label: 'Rejected', count: counts.rejected },
  ]

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
            <Banknote className="size-6 text-slate-400" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Payment Evidence Review
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            Review and verify payment evidences submitted by schools for subscriptions, renewals, and plan upgrades.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchData()}
          disabled={loading}
          className="gap-2 w-fit"
        >
          <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        variants={item}
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title} className="gap-0 overflow-hidden py-0">
              <CardContent className="p-4">
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-9 w-9 rounded-lg" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ) : (
                  <>
                    <div
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-lg ring-1',
                        card.bgColor,
                        card.ringColor
                      )}
                    >
                      <Icon className={cn('size-4.5', card.iconColor)} />
                    </div>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {card.value.toLocaleString()}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-slate-500">
                      {card.title}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )
        })}
      </motion.div>

      {/* Filters & Search */}
      <motion.div variants={item} className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'relative rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  activeTab === tab.key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    'ml-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                    activeTab === tab.key
                      ? tab.key === 'pending'
                        ? 'bg-amber-100 text-amber-700'
                        : tab.key === 'verified'
                          ? 'bg-emerald-100 text-emerald-700'
                          : tab.key === 'rejected'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-slate-100 text-slate-600'
                      : 'bg-slate-200/60 text-slate-400'
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by school, reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>
      </motion.div>

      {/* Evidence List */}
      <motion.div variants={item}>
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="divide-y divide-slate-100">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-start gap-4 p-4 sm:p-5">
                    <Skeleton className="h-20 w-20 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2.5">
                      <Skeleton className="h-5 w-40" />
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-20 rounded-full" />
                        <Skeleton className="h-5 w-24 rounded-full" />
                      </div>
                      <Skeleton className="h-4 w-60" />
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-20" />
                        <Skeleton className="h-8 w-20" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredEvidences.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4">
                  {searchQuery ? (
                    <Search className="size-7 text-slate-300" />
                  ) : (
                    <Receipt className="size-7 text-slate-300" />
                  )}
                </div>
                <p className="text-sm font-semibold text-slate-600">
                  {searchQuery
                    ? 'No matching payment evidences found'
                    : activeTab !== 'all'
                      ? `No ${activeTab} payment evidences`
                      : 'No payment evidences submitted yet'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {searchQuery
                    ? 'Try adjusting your search query'
                    : 'Payment evidences will appear here when schools submit them'}
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-[calc(100vh-420px)]">
                <div className="divide-y divide-slate-100">
                  <AnimatePresence mode="popLayout">
                    {filteredEvidences.map((evidence) => {
                      const statusBadge = getStatusBadge(evidence.status)
                      const planBadge = getPlanBadge(evidence.targetPlan)
                      const typeBadge = getTypeBadge(evidence.type)
                      const StatusIcon = statusBadge.icon
                      const tenant = evidence.tenant

                      return (
                        <motion.div
                          key={evidence.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-start gap-4 p-4 sm:p-5 transition-colors hover:bg-slate-50/70"
                        >
                          <FileThumbnail
                            evidence={evidence}
                            onClick={() => setSelectedEvidence(evidence)}
                            className="h-20 w-20 shrink-0"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-semibold text-slate-900 truncate">
                                {tenant?.name || evidence.tenantName}
                              </h3>
                              <Badge
                                variant="outline"
                                className={cn('text-[10px] px-1.5 py-0', statusBadge.className)}
                              >
                                <StatusIcon className="size-3 mr-0.5" />
                                {statusBadge.label}
                              </Badge>
                            </div>

                            <div className="mt-1 flex items-center gap-1.5 flex-wrap text-xs text-slate-500">
                              {tenant?.email && (
                                <span className="flex items-center gap-1 truncate max-w-[180px]">
                                  <Mail className="size-3 shrink-0" />
                                  {tenant.email}
                                </span>
                              )}
                              {tenant?.state && (
                                <>
                                  <span className="text-slate-300">&middot;</span>
                                  <span className="flex items-center gap-1">
                                    <MapPin className="size-3 shrink-0" />
                                    {tenant.state}
                                  </span>
                                </>
                              )}
                              <span className="text-slate-300">&middot;</span>
                              <span className="flex items-center gap-1">
                                <CalendarDays className="size-3 shrink-0" />
                                {formatDateShort(evidence.createdAt)}
                              </span>
                            </div>

                            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', planBadge.className)}>
                                {planBadge.label}
                              </Badge>
                              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', typeBadge.className)}>
                                {typeBadge.label}
                              </Badge>
                              {(evidence.amountUSD || evidence.amountNGN) && (
                                <span className="text-xs font-medium text-slate-700">
                                  {formatCurrency(evidence.amountUSD, 'USD')} / {formatCurrency(evidence.amountNGN, 'NGN')}
                                </span>
                              )}
                            </div>

                            {evidence.reference && (
                              <p className="mt-1 text-xs text-slate-400 font-mono truncate">
                                Ref: {evidence.reference}
                              </p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1.5 text-xs text-slate-500 hover:text-slate-700"
                              onClick={() => setSelectedEvidence(evidence)}
                            >
                              <Eye className="size-3.5" />
                              View
                            </Button>
                            {evidence.status === 'pending' && (
                              <div className="flex gap-1.5">
                                <Button
                                  size="sm"
                                  className="h-7 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                  disabled={isSubmitting}
                                  onClick={() => quickVerify(evidence.id)}
                                >
                                  <CheckCircle2 className="size-3" />
                                  Verify
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 gap-1 text-xs border-rose-200 text-rose-600 hover:bg-rose-50"
                                  disabled={isSubmitting}
                                  onClick={() => quickReject(evidence.id)}
                                >
                                  <XCircle className="size-3" />
                                  Reject
                                </Button>
                              </div>
                            )}
                            {evidence.status !== 'pending' && (
                              <span className="text-[10px] text-slate-400">
                                {evidence.reviewedBy ? `by ${evidence.reviewedBy}` : ''}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedEvidence && (
          <DetailModal
            evidence={selectedEvidence}
            onClose={() => setSelectedEvidence(null)}
            onVerify={(note) => handleVerify(selectedEvidence.id, note)}
            onReject={(note) => handleReject(selectedEvidence.id, note)}
            isSubmitting={isSubmitting}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}