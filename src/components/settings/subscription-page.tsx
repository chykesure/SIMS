'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  CheckCircle2,
  Crown,
  Zap,
  Star,
  Users,
  UserCog,
  GraduationCap,
  CreditCard,
  AlertTriangle,
  ArrowRight,
  Shield,
  Upload,
  X,
  Image as ImageIcon,
  FileText,
  Clock,
  Hash,
  RefreshCw,
  Sparkles,
  Check,
  X as XIcon,
  Eye,
  Download,
} from 'lucide-react'
import { useAppStore } from '@/store/index'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────

interface UsageData {
  students: number
  users: number
  teachers: number
  classes: number
  subjects: number
}

interface DynamicPlan {
  planKey: string
  name: string
  subtitle: string
  priceUSD: number
  priceNGN: number
  priceLabel: string
  validityDays: number
  maxStudents: number
  maxUsers: number
  features: string[]
}

interface PlanConfig {
  id: string
  name: string
  subtitle: string
  price: string
  priceNGN: string
  maxStudents: number | null
  maxUsers: number
  features: string[]
  popular?: boolean
  icon: React.ReactNode
  headerBg: string
  iconBg: string
  borderColor: string
  validityDays: number
}

interface PaymentSubmission {
  id: string
  type: string
  targetPlan: string
  amountUSD: number
  amountNGN: number
  fileName: string
  fileSize: string
  fileType: string
  reference: string
  note: string
  status: string
  reviewedBy: string
  reviewNote: string
  reviewedAt: string
  createdAt: string
}

// ── Visual config per plan (cosmetic, not editable) ────────────────

const PLAN_VISUALS: Record<string, { icon: React.ReactNode; headerBg: string; iconBg: string; borderColor: string }> = {
  free: {
    icon: <Zap className="h-5 w-5 text-slate-500" />,
    headerBg: 'bg-slate-50',
    iconBg: 'bg-slate-100',
    borderColor: 'border-slate-200',
  },
  basic: {
    icon: <Star className="h-5 w-5 text-sky-500" />,
    headerBg: 'bg-sky-50/70',
    iconBg: 'bg-sky-100',
    borderColor: 'border-sky-200',
  },
  intermediate: {
    icon: <Star className="h-5 w-5 text-indigo-500" />,
    headerBg: 'bg-indigo-50/70',
    iconBg: 'bg-indigo-100',
    borderColor: 'border-indigo-200',
  },
  premium: {
    icon: <Crown className="h-5 w-5 text-amber-500" />,
    headerBg: 'bg-gradient-to-b from-amber-50/50 to-transparent',
    iconBg: 'bg-amber-100',
    borderColor: 'border-amber-300',
  },
  growth: {
    icon: <Zap className="h-5 w-5 text-emerald-500" />,
    headerBg: 'bg-gradient-to-b from-emerald-50/50 to-transparent',
    iconBg: 'bg-emerald-100',
    borderColor: 'border-emerald-300',
  },
}

// Convert dynamic API plan to display PlanConfig
function toPlanConfig(p: DynamicPlan): PlanConfig {
  const vis = PLAN_VISUALS[p.planKey] || PLAN_VISUALS.free
  const priceStr = p.priceUSD === 0 ? 'Free' : `$${p.priceUSD} ${p.priceLabel !== 'forever' ? p.priceLabel : ''}`.trim()
  const ngnStr = p.priceNGN === 0 ? '₦0' : `₦${p.priceNGN.toLocaleString()}`
  return {
    id: p.planKey,
    name: p.name,
    subtitle: p.subtitle,
    price: priceStr,
    priceNGN: ngnStr,
    maxStudents: p.maxStudents >= 999999 ? null : p.maxStudents,
    maxUsers: p.maxUsers,
    features: p.features,
    popular: p.planKey === 'premium',
    icon: vis.icon,
    headerBg: vis.headerBg,
    iconBg: vis.iconBg,
    borderColor: vis.borderColor,
    validityDays: p.validityDays,
  }
}

// ── Helpers ──────────────────────────────────────────────────────

function getPlanBadgeStyle(plan?: string) {
  switch (plan) {
    case 'growth':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case 'premium':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'intermediate':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200'
    case 'basic':
      return 'bg-sky-100 text-sky-800 border-sky-200'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

function getProgressColor(ratio: number) {
  if (ratio > 0.9) return '[&>div]:bg-red-500'
  if (ratio > 0.7) return '[&>div]:bg-amber-500'
  return '[&>div]:bg-emerald-500'
}

function getProgressLabel(ratio: number) {
  if (ratio >= 1) return 'text-red-600 font-semibold'
  if (ratio > 0.9) return 'text-red-500 font-medium'
  if (ratio > 0.7) return 'text-amber-600'
  return 'text-emerald-600'
}

function daysUntilExpiry(planEnd?: string | null): number | null {
  if (!planEnd) return null
  const diff = new Date(planEnd).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '--'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return '--'
  }
}

function formatLimit(value: number | null): string {
  return value === null ? 'Unlimited' : value.toLocaleString()
}

function formatFileSize(bytes: string): string {
  const size = parseFloat(bytes) || 0
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending Review', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  verified: { label: 'Verified', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rejected', className: 'bg-rose-100 text-rose-700 border-rose-200' },
}

const typeConfig: Record<string, { label: string }> = {
  new_subscription: { label: 'New Subscription' },
  renewal: { label: 'Renewal' },
  upgrade: { label: 'Upgrade' },
}

// ── Component ────────────────────────────────────────────────────

export function SubscriptionPage() {
  const { tenant } = useAppStore()
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submissions, setSubmissions] = useState<PaymentSubmission[]>([])
  const [dynamicPlans, setDynamicPlans] = useState<PlanConfig[]>([])
  const [rawPlans, setRawPlans] = useState<DynamicPlan[]>([])

  // Upload form state
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [targetPlan, setTargetPlan] = useState('basic')
  const [payType, setPayType] = useState('new_subscription')
  const [payReference, setPayReference] = useState('')
  const [payNote, setPayNote] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Image preview dialog
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewFileType, setPreviewFileType] = useState('')
  const [loadingPreview, setLoadingPreview] = useState(false)

  const currentPlan = tenant?.plan?.toLowerCase() || 'free'
  const maxStudents = tenant?.maxStudents ?? 50
  const maxUsers = tenant?.maxUsers ?? 3
  const daysLeft = daysUntilExpiry(tenant?.planEnd)
  const isExpiringSoon = daysLeft !== null && daysLeft <= 30 && daysLeft > 0
  const isExpired = daysLeft !== null && daysLeft <= 0

  // Get dynamic price info for selected target plan
  const selectedPlanData = rawPlans.find(p => p.planKey === targetPlan)

  const studentUsed = usage?.students ?? 0
  const userUsed = usage?.users ?? 0
  const studentRatio = maxStudents > 0 ? studentUsed / maxStudents : 0
  const userRatio = maxUsers > 0 ? userUsed / maxUsers : 0
  const studentLimitReached = maxStudents > 0 && studentUsed >= maxStudents
  const userLimitReached = maxUsers > 0 && userUsed >= maxUsers

  // Fetch plans (dynamic from DB)
  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch('/api/tenant/plan-config')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      if (data.success && data.plans) {
        setRawPlans(data.plans)
        setDynamicPlans(data.plans.map(toPlanConfig))
      }
    } catch {
      // Fallback: if API fails, show empty (could add fallback hardcoded here)
    }
  }, [])

  // Fetch usage
  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/tenant/usage')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setUsage(data)
    } catch {
      // silent
    }
  }, [])

  // Fetch submissions
  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await fetch('/api/payment-evidence')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setSubmissions(data.evidences || [])
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    Promise.all([fetchPlans(), fetchUsage(), fetchSubmissions()]).finally(() => setLoading(false))
  }, [fetchPlans, fetchUsage, fetchSubmissions])

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Max 5MB
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File too large. Maximum size is 5MB.')
        return
      }
      setSelectedFile(file)
    }
  }

  // Handle view evidence
  const handleViewEvidence = async (evidenceId: string) => {
    setLoadingPreview(true)
    setPreviewOpen(true)
    try {
      const res = await fetch(`/api/payment-evidence/${evidenceId}`)
      if (!res.ok) throw new Error('Failed to load evidence')
      const data = await res.json()
      if (data.success && data.evidence?.fileData) {
        setPreviewUrl(data.evidence.fileData)
        setPreviewFileType(data.evidence.fileType || '')
      } else {
        toast.error('No file data found for this evidence')
        setPreviewOpen(false)
      }
    } catch {
      toast.error('Failed to load evidence file')
      setPreviewOpen(false)
    } finally {
      setLoadingPreview(false)
    }
  }

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a payment screenshot or document.')
      return
    }

    setUploading(true)
    try {
      // Read file as base64
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(selectedFile)
      })
      const base64Data = await base64Promise

      const res = await fetch('/api/payment-evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPlan,
          type: payType,
          amountUSD: selectedPlanData?.priceUSD ?? 0,
          amountNGN: selectedPlanData?.priceNGN ?? 0,
          fileName: selectedFile.name,
          fileSize: String(selectedFile.size),
          fileType: selectedFile.type || 'image/png',
          fileData: base64Data,
          reference: payReference,
          note: payNote,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Upload failed')

      toast.success('Payment evidence submitted!', {
        description: 'It will be reviewed by our team within 24 hours.',
      })

      // Reset form
      setShowUpload(false)
      setSelectedFile(null)
      setPayReference('')
      setPayNote('')
      setTargetPlan('basic')
      setPayType('new_subscription')
      if (fileInputRef.current) fileInputRef.current.value = ''

      fetchSubmissions()
    } catch (err) {
      toast.error('Upload failed', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setUploading(false)
    }
  }

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
        <div className="h-80 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* ═══ Page Heading ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 ring-1 ring-emerald-200">
              <CreditCard className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Subscription & Plans</h1>
              <p className="text-sm text-slate-500">
                View your plan, usage, and upgrade anytime
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowUpload(!showUpload)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Upload className="mr-1.5 h-4 w-4" />
            Upload Payment Evidence
          </Button>
        </div>
      </motion.div>

      {/* ═══ Payment Upload Form ═══ */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <Card className="border-emerald-200 bg-emerald-50/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Upload Payment Evidence</CardTitle>
                    <CardDescription>
                      Pay via OPAY and upload your receipt below
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowUpload(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* OPAY Details */}
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-2">
                    OPAY Payment Details
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">Account Name</p>
                      <p className="font-semibold text-slate-800">CHIKE POLYCARP</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Phone Number</p>
                      <p className="font-semibold text-slate-800">703793353</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Plan selection */}
                  <div className="space-y-2">
                    <Label>Plan to Subscribe</Label>
                    <Select value={targetPlan} onValueChange={setTargetPlan}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {dynamicPlans.filter(p => p.id !== 'free').map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} — {p.price} {p.priceNGN !== '₦0' && `(${p.priceNGN})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payment type */}
                  <div className="space-y-2">
                    <Label>Payment Type</Label>
                    <Select value={payType} onValueChange={setPayType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new_subscription">New Subscription</SelectItem>
                        <SelectItem value="renewal">Renewal</SelectItem>
                        <SelectItem value="upgrade">Upgrade</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* File upload */}
                <div className="space-y-2">
                  <Label>Payment Screenshot / Receipt</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-white p-6 transition-colors hover:border-emerald-300 hover:bg-emerald-50/50"
                  >
                    {selectedFile ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        <span className="text-sm font-medium text-slate-700">
                          {selectedFile.name} ({formatFileSize(String(selectedFile.size))})
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedFile(null)
                            if (fileInputRef.current) fileInputRef.current.value = ''
                          }}
                          className="ml-auto rounded-full p-1 hover:bg-slate-100"
                        >
                          <X className="h-3.5 w-3.5 text-slate-400" />
                        </button>
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5 text-slate-400" />
                        <span className="text-sm text-slate-500">
                          Click to upload screenshot or PDF
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* Reference + Note */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Payment Reference (optional)</Label>
                    <Input
                      placeholder="Transaction ID / reference"
                      value={payReference}
                      onChange={(e) => setPayReference(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Note (optional)</Label>
                    <Input
                      placeholder="Any additional info"
                      value={payNote}
                      onChange={(e) => setPayNote(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  disabled={uploading || !selectedFile}
                  onClick={handleUpload}
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Submit Payment Evidence
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Current Plan Status Banner ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Current Plan</span>
                  <Badge className={getPlanBadgeStyle(currentPlan)} variant="outline">
                    {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
                  </Badge>
                </div>
                <p className="text-lg font-semibold">{tenant?.name || 'Your School'}</p>
                {(tenant?.planStart || tenant?.planEnd) && (
                  <p className="text-sm text-muted-foreground">
                    {tenant?.planStart && `Started ${formatDate(tenant.planStart)}`}
                    {tenant?.planStart && tenant?.planEnd && ' — '}
                    {tenant?.planEnd && `Expires ${formatDate(tenant.planEnd)}`}
                  </p>
                )}
              </div>
              {isExpired && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Plan expired. Renew to continue.</span>
                </div>
              )}
              {isExpiringSoon && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}.</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══ Plan Comparison Cards (Dev-style) ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {dynamicPlans.map((plan) => {
            const isCurrent = plan.id === currentPlan
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
              >
                <Card
                  className={cn(
                    'relative flex flex-col overflow-hidden transition-shadow hover:shadow-lg',
                    isCurrent && 'ring-2 ring-primary shadow-sm',
                    plan.popular && !isCurrent && 'ring-2 ring-amber-400/50 shadow-md',
                    plan.borderColor
                  )}
                >
                  {plan.popular && (
                    <div className="absolute right-0 top-0 z-10">
                      <div className="flex items-center gap-1 rounded-bl-lg bg-amber-500 px-3 py-1 text-xs font-semibold text-white">
                        <Sparkles className="size-3" />
                        Popular
                      </div>
                    </div>
                  )}

                  {/* Header */}
                  <div className={cn('p-5 pb-3', plan.headerBg)}>
                    <div className="flex items-center gap-3">
                      <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', plan.iconBg)}>
                        {plan.icon}
                      </div>
                      <div>
                        <p className="text-lg font-bold">{plan.name}</p>
                        <p className="text-xs font-medium text-slate-500">{plan.subtitle}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold">{plan.price}</span>
                      {plan.priceNGN !== '₦0' && (
                        <span className="text-xs text-slate-400">({plan.priceNGN})</span>
                      )}
                    </div>
                  </div>

                  {/* Limits */}
                  <div className="px-5 pt-3">
                    <div className="flex items-center gap-4 rounded-lg bg-slate-50 p-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <GraduationCap className="size-3.5 text-slate-400" />
                        <span className="font-semibold">{formatLimit(plan.maxStudents)}</span>
                        <span className="text-slate-400">students</span>
                      </div>
                      <Separator orientation="vertical" className="h-4" />
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <UserCog className="size-3.5 text-slate-400" />
                        <span className="font-semibold">{plan.maxUsers}</span>
                        <span className="text-slate-400">users</span>
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <CardContent className="flex-1 px-5 pt-3 pb-0">
                    <div className="space-y-2">
                      {plan.features.map((feature) => (
                        <div key={feature} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                          <span className="text-xs text-slate-600 leading-relaxed">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>

                  {/* Action */}
                  <CardFooter className="px-5 pb-5 pt-3">
                    {isCurrent ? (
                      <Badge variant="outline" className="w-full justify-center py-1.5">
                        <CheckCircle2 className="mr-1 size-3" />
                        Current Plan
                      </Badge>
                    ) : (
                      <Button
                        className={cn(
                          'w-full',
                          plan.popular && 'bg-amber-500 text-white hover:bg-amber-600'
                        )}
                        variant={plan.popular ? 'default' : 'outline'}
                        onClick={() => {
                          setTargetPlan(plan.id)
                          setShowUpload(true)
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                      >
                        Upgrade to {plan.name}
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* ═══ Usage Dashboard ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Usage Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  Students
                </div>
                <span className={cn('text-sm', getProgressLabel(studentRatio))}>
                  {studentUsed} / {formatLimit(maxStudents)}
                </span>
              </div>
              <Progress
                value={Math.min(studentRatio * 100, 100)}
                className={cn('h-3', getProgressColor(studentRatio))}
              />
              {studentLimitReached && (
                <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Student limit reached. Upgrade your plan.</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto h-7 gap-1 border-red-200 text-red-700 hover:bg-red-100"
                    onClick={() => {
                      setTargetPlan('basic')
                      setShowUpload(true)
                    }}
                  >
                    Upgrade <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Admin Users
                </div>
                <span className={cn('text-sm', getProgressLabel(userRatio))}>
                  {userUsed} / {formatLimit(maxUsers)}
                </span>
              </div>
              <Progress
                value={Math.min(userRatio * 100, 100)}
                className={cn('h-3', getProgressColor(userRatio))}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { label: 'Teachers', value: usage?.teachers ?? 0, icon: <Users className="h-4 w-4 text-muted-foreground" /> },
                { label: 'Classes', value: usage?.classes ?? 0, icon: <GraduationCap className="h-4 w-4 text-muted-foreground" /> },
                { label: 'Subjects', value: usage?.subjects ?? 0, icon: <Star className="h-4 w-4 text-muted-foreground" /> },
                { label: 'Plan', value: currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1), icon: <Shield className="h-4 w-4 text-muted-foreground" /> },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-3 rounded-lg border p-3">
                  {stat.icon}
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-lg font-semibold">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══ Payment History ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Payment History</CardTitle>
                <CardDescription>Your submitted payment evidence</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowUpload(true)}>
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                New
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {submissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="mb-3 h-10 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">No payments submitted yet</p>
                <p className="mt-1 text-xs text-slate-400">
                  Upload your first payment evidence to get started
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setShowUpload(true)}
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Upload Payment Evidence
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.map((sub) => {
                  const sc = statusConfig[sub.status] || statusConfig.pending
                  const tc = typeConfig[sub.type] || { label: sub.type }
                  return (
                    <div
                      key={sub.id}
                      className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center"
                    >
                      {/* Plan + Status + Type */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800 capitalize">
                            {sub.targetPlan} Plan
                          </span>
                          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', sc.className)}>
                            {sc.label}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-50 text-slate-600 border-slate-200">
                            {tc.label}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          {sub.amountNGN > 0 && (
                            <span className="font-medium text-slate-700">
                              ₦{sub.amountNGN.toLocaleString()}
                            </span>
                          )}
                          {sub.reference && (
                            <span className="flex items-center gap-1">
                              <Hash className="size-3" />
                              {sub.reference}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {formatDateTime(sub.createdAt)}
                          </span>
                        </div>

                        {sub.note && (
                          <p className="text-xs text-slate-400 italic truncate">
                            &ldquo;{sub.note}&rdquo;
                          </p>
                        )}

                        {/* Review info */}
                        {sub.status !== 'pending' && (
                          <div className="text-xs text-slate-500">
                            {sub.reviewedBy && <span>Reviewed by {sub.reviewedBy}</span>}
                            {sub.reviewNote && (
                              <span className="ml-1">— &ldquo;{sub.reviewNote}&rdquo;</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* File info + Actions */}
                      <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                        {sub.fileName && (
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            {sub.fileType?.startsWith('image') ? (
                              <ImageIcon className="size-3.5 text-slate-400" />
                            ) : (
                              <FileText className="size-3.5 text-slate-400" />
                            )}
                            <span>{sub.fileName}</span>
                            <span className="text-slate-400">({formatFileSize(sub.fileSize)})</span>
                          </div>
                        )}

                        {/* View button + Status icon */}
                        <div className="flex items-center gap-2">
                          {sub.status === 'pending' && sub.fileName && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1.5 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              onClick={() => handleViewEvidence(sub.id)}
                            >
                              <Eye className="size-3" />
                              View
                            </Button>
                          )}
                          {sub.status === 'verified' && sub.fileName && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1.5 text-xs"
                              onClick={() => handleViewEvidence(sub.id)}
                            >
                              <Eye className="size-3" />
                              View
                            </Button>
                          )}
                          {sub.status === 'verified' ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          ) : sub.status === 'rejected' ? (
                            <XIcon className="h-5 w-5 text-rose-500" />
                          ) : (
                            <Clock className="h-5 w-5 text-amber-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══ Image Preview Dialog ═══ */}
      {previewOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] overflow-auto rounded-lg bg-white p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute right-2 top-2 z-10 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
              onClick={() => setPreviewOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
            {loadingPreview ? (
              <div className="flex h-64 w-64 items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : previewFileType?.startsWith('application/pdf') ? (
              <div className="flex min-h-[300px] min-w-[300px] flex-col items-center justify-center p-8">
                <FileText className="mb-3 h-12 w-12 text-slate-400" />
                <p className="mb-3 text-sm font-medium text-slate-600">PDF Document</p>
                <a
                  href={previewUrl}
                  download
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </a>
              </div>
            ) : (
              <img
                src={previewUrl}
                alt="Payment evidence preview"
                className="max-h-[85vh] rounded-md object-contain"
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}