'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  CreditCard,
  Save,
  RotateCcw,
  Plus,
  Clock,
  DollarSign,
  UserCog,
  GraduationCap,
  Sparkles,
  Check,
  X,
  Loader2,
  AlertCircle,
  Info,
  CalendarDays,
  Tag,
  ArrowRightLeft,
  Crown,
  Star,
  Zap,
  RefreshCw,
  Pencil,
  BadgeCheck,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Eye,
} from 'lucide-react'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────

interface PlanData {
  id: string
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
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

interface EditablePlan {
  name: string
  subtitle: string
  priceUSD: string
  priceNGN: string
  priceLabel: string
  validityDays: string
  maxStudents: string
  maxUsers: string
  features: string[]
  isActive: boolean
}

// ── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_USD_TO_NGN_RATE = 1500

// ── Helpers ────────────────────────────────────────────────────────────────

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
}

function getPlanMeta(planKey: string) {
  switch (planKey) {
    case 'growth':
      return {
        icon: Zap,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        ring: 'ring-emerald-100',
        accentBg: 'bg-emerald-500',
        tagBg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      }
    case 'premium':
      return {
        icon: Crown,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        ring: 'ring-amber-100',
        accentBg: 'bg-amber-500',
        tagBg: 'bg-amber-100 text-amber-700 border-amber-200',
      }
    case 'intermediate':
      return {
        icon: Star,
        color: 'text-indigo-600',
        bg: 'bg-indigo-50',
        border: 'border-indigo-200',
        ring: 'ring-indigo-100',
        accentBg: 'bg-indigo-500',
        tagBg: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      }
    case 'basic':
      return {
        icon: Zap,
        color: 'text-sky-600',
        bg: 'bg-sky-50',
        border: 'border-sky-200',
        ring: 'ring-sky-100',
        accentBg: 'bg-sky-500',
        tagBg: 'bg-sky-100 text-sky-700 border-sky-200',
      }
    default:
      return {
        icon: Zap,
        color: 'text-slate-600',
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        ring: 'ring-slate-100',
        accentBg: 'bg-slate-500',
        tagBg: 'bg-slate-100 text-slate-600 border-slate-200',
      }
  }
}

function planToEditable(plan: PlanData): EditablePlan {
  return {
    name: plan.name,
    subtitle: plan.subtitle,
    priceUSD: String(plan.priceUSD),
    priceNGN: String(plan.priceNGN),
    priceLabel: plan.priceLabel,
    validityDays: String(plan.validityDays),
    maxStudents: plan.maxStudents >= 999999 ? '999999' : String(plan.maxStudents),
    maxUsers: String(plan.maxUsers),
    features: [...plan.features],
    isActive: plan.isActive,
  }
}

function formatCurrency(value: number): string {
  if (value === 0) return 'Free'
  return value.toLocaleString()
}

function formatValidityShort(days: number): string {
  if (days >= 365) {
    const y = Math.round(days / 365)
    return `${y} year${y > 1 ? 's' : ''}`
  }
  return `${days} day${days !== 1 ? 's' : ''}`
}

function formatStudentsShort(max: number): string {
  return max >= 999999 ? 'Unlimited' : max.toLocaleString()
}

// ── Feature Editor ─────────────────────────────────────────────────────────

function FeatureEditor({
  features,
  onChange,
}: {
  features: string[]
  onChange: (features: string[]) => void
}) {
  const [newFeature, setNewFeature] = useState('')

  const addFeature = () => {
    const trimmed = newFeature.trim()
    if (trimmed && !features.includes(trimmed)) {
      onChange([...features, trimmed])
      setNewFeature('')
    }
  }

  const removeFeature = (index: number) => {
    onChange(features.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addFeature()
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={newFeature}
          onChange={(e) => setNewFeature(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a feature and press Enter"
          className="h-9 text-sm"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 px-3 shrink-0 gap-1.5"
          onClick={addFeature}
          disabled={!newFeature.trim()}
        >
          <Plus className="size-3.5" />
          Add
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {features.map((feature, idx) => (
          <Badge
            key={idx}
            variant="outline"
            className="text-xs px-2 py-0.5 gap-1 bg-white border-slate-200 hover:border-rose-200 transition-colors"
          >
            <Check className="size-3 text-emerald-500 shrink-0" />
            <span className="text-slate-700">{feature}</span>
            <button
              type="button"
              onClick={() => removeFeature(idx)}
              className="text-slate-300 hover:text-rose-500 transition-colors shrink-0"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  )
}

// ── Stat Pill ──────────────────────────────────────────────────────────────

function StatPill({
  label,
  value,
  subValue,
  icon: Icon,
  variant,
}: {
  label: string
  value: string
  subValue?: string
  icon: React.ComponentType<{ className?: string }>
  variant: 'usd' | 'ngn' | 'time' | 'students' | 'staff' | 'features'
}) {
  const variants = {
    usd: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    ngn: 'bg-amber-50 border-amber-100 text-amber-700',
    time: 'bg-sky-50 border-sky-100 text-sky-700',
    students: 'bg-violet-50 border-violet-100 text-violet-700',
    staff: 'bg-rose-50 border-rose-100 text-rose-700',
    features: 'bg-teal-50 border-teal-100 text-teal-700',
  }

  return (
    <div className={cn(
      'flex items-center gap-2 rounded-lg border px-2.5 py-1.5',
      variants[variant]
    )}>
      <Icon className="size-3.5 shrink-0 opacity-60" />
      <div className="min-w-0">
        <p className="text-[10px] font-medium opacity-60 leading-none">{label}</p>
        <p className="text-xs font-bold leading-tight truncate">{value}</p>
        {subValue && <p className="text-[9px] opacity-50 leading-tight">{subValue}</p>}
      </div>
    </div>
  )
}

// ── Plan Row (Read View) ──────────────────────────────────────────────────

function PlanRowView({
  plan,
  onEdit,
}: {
  plan: PlanData
  onEdit: () => void
}) {
  const meta = getPlanMeta(plan.planKey)
  const PlanIcon = meta.icon
  const isPopular = plan.planKey === 'premium'

  return (
    <Card className={cn(
      'transition-all duration-200 hover:shadow-md overflow-hidden',
      !plan.isActive && 'opacity-50'
    )}>
      <CardContent className="p-0">
        {/* Top row: identity + quick actions */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 sm:p-5">
          {/* Left: Plan identity */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              meta.bg
            )}>
              <PlanIcon className={cn('size-5', meta.color)} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900">{plan.name}</h3>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 hidden sm:inline-flex">{plan.planKey}</Badge>
                {isPopular && (
                  <Badge className="text-[9px] px-1.5 py-0 bg-emerald-500 text-white border-0 gap-0.5">
                    <Star className="size-2.5" />
                    Popular
                  </Badge>
                )}
                {!plan.isActive && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Inactive</Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{plan.subtitle}</p>
            </div>
          </div>

          {/* Right: Edit button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="gap-1.5 text-xs h-8 shrink-0 self-start sm:self-center"
          >
            <Pencil className="size-3" />
            Edit Plan
          </Button>
        </div>

        {/* Divider */}
        <Separator />

        {/* Stats row */}
        <div className="p-4 sm:p-5 pt-3 sm:pt-4">
          <div className="flex flex-wrap gap-2">
            <StatPill
              label="USD"
              value={plan.priceUSD === 0 ? 'Free' : `$${formatCurrency(plan.priceUSD)}`}
              subValue={plan.priceLabel || undefined}
              icon={DollarSign}
              variant="usd"
            />
            <StatPill
              label="NGN"
              value={plan.priceNGN === 0 ? 'Free' : `₦${formatCurrency(plan.priceNGN)}`}
              icon={DollarSign}
              variant="ngn"
            />
            <StatPill
              label="Validity"
              value={formatValidityShort(plan.validityDays)}
              icon={Clock}
              variant="time"
            />
            <StatPill
              label="Students"
              value={formatStudentsShort(plan.maxStudents)}
              icon={GraduationCap}
              variant="students"
            />
            <StatPill
              label="Staff"
              value={plan.maxUsers.toString()}
              icon={UserCog}
              variant="staff"
            />
            <StatPill
              label="Features"
              value={`${plan.features.length} included`}
              icon={Sparkles}
              variant="features"
            />
          </div>

          {/* Features preview */}
          <div className="mt-3">
            <div className="flex flex-wrap gap-1.5">
              {plan.features.slice(0, 5).map((f, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                  <Check className={cn('size-3', meta.color)} />
                  {f}
                </span>
              ))}
              {plan.features.length > 5 && (
                <span className="text-[11px] text-slate-400">
                  +{plan.features.length - 5} more
                </span>
              )}
            </div>
          </div>

          {/* Conversion hint */}
          {plan.priceUSD > 0 && (
            <p className="mt-2.5 text-[10px] text-slate-400 flex items-center gap-1">
              <ArrowRightLeft className="size-2.5" />
              ${plan.priceUSD} = ₦{plan.priceNGN.toLocaleString()} at ₦{DEFAULT_USD_TO_NGN_RATE.toLocaleString()}/$             </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Plan Row (Edit View) ──────────────────────────────────────────────────

function PlanRowEdit({
  plan,
  editData,
  savingId,
  onSave,
  onCancel,
  onReset,
  onEditChange,
}: {
  plan: PlanData
  editData: EditablePlan
  savingId: string | null
  onSave: () => void
  onCancel: () => void
  onReset: () => void
  onEditChange: (data: EditablePlan) => void
}) {
  const isSaving = savingId === plan.id
  const meta = getPlanMeta(plan.planKey)

  const handleUsdChange = (usdValue: string) => {
    const usd = parseFloat(usdValue) || 0
    const ngn = Math.round(usd * DEFAULT_USD_TO_NGN_RATE)
    onEditChange({ ...editData, priceUSD: usdValue, priceNGN: String(ngn) })
  }

  const handleNgnChange = (ngnValue: string) => {
    onEditChange({ ...editData, priceNGN: ngnValue })
  }

  const currentUsd = parseFloat(editData.priceUSD) || 0
  const currentNgn = parseFloat(editData.priceNGN) || 0

  return (
    <Card className="overflow-hidden ring-2 ring-emerald-500/20 border-emerald-300">
      <CardContent className="p-4 sm:p-6 space-y-5">
        {/* Edit header */}
        <div className="flex items-center gap-2">
          <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', meta.bg)}>
            {React.createElement(meta.icon, { className: cn('size-4', meta.color) })}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">
              Editing: {editData.name || plan.name}
            </p>
            <p className="text-[11px] text-slate-400">{plan.planKey} plan</p>
          </div>
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] gap-1">
            <Eye className="size-3" />
            Edit Mode
          </Badge>
        </div>

        <Separator />

        {/* Section: Identity */}
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Identity</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Plan Name</Label>
              <Input
                value={editData.name}
                onChange={(e) => onEditChange({ ...editData, name: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Subtitle</Label>
              <Input
                value={editData.subtitle}
                onChange={(e) => onEditChange({ ...editData, subtitle: e.target.value })}
                className="h-9 text-sm"
                placeholder="e.g. Growing School"
              />
            </div>
          </div>
        </div>

        {/* Section: Pricing */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pricing</p>
            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
              <ArrowRightLeft className="size-2.5" />
              ₦{DEFAULT_USD_TO_NGN_RATE.toLocaleString()} / $             </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-emerald-500 text-[10px] font-bold text-white">$</span>
                Price (USD)
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editData.priceUSD}
                  onChange={(e) => handleUsdChange(e.target.value)}
                  className="h-10 text-sm font-semibold border-emerald-200 pl-7"
                  placeholder="0.00"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-500 font-semibold text-xs">$</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-amber-500 text-[10px] font-bold text-white">₦</span>
                Price (NGN)
                <span className="text-[9px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">auto</span>
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  step="100"
                  value={editData.priceNGN}
                  onChange={(e) => handleNgnChange(e.target.value)}
                  className="h-10 text-sm font-semibold border-amber-200 pl-7"
                  placeholder="0"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-500 font-semibold text-xs">₦</span>
              </div>
            </div>
          </div>

          {/* Live conversion preview */}
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
            <ArrowRightLeft className="size-3.5 text-emerald-600 shrink-0" />
            <span className="text-xs font-bold text-slate-800">
              <span className="text-emerald-600">${formatCurrency(currentUsd)}</span>
              <span className="mx-1.5 text-slate-300">→</span>
              <span className="text-amber-600">₦{formatCurrency(currentNgn)}</span>
            </span>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Price Label</Label>
            <Input
              value={editData.priceLabel}
              onChange={(e) => onEditChange({ ...editData, priceLabel: e.target.value })}
              className="h-9 text-sm"
              placeholder="e.g. /month, /year, forever"
            />
          </div>
        </div>

        {/* Section: Limits */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Limits</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                <Clock className="size-3.5 text-slate-400" />
                Validity (days)
              </Label>
              <Input
                type="number"
                min="1"
                value={editData.validityDays}
                onChange={(e) => onEditChange({ ...editData, validityDays: e.target.value })}
                className="h-9 text-sm"
              />
              <p className="text-[10px] text-slate-400">
                = {formatValidityShort(Number(editData.validityDays) || 1)}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                <GraduationCap className="size-3.5 text-slate-400" />
                Max Students
              </Label>
              <Input
                type="number"
                min="1"
                value={editData.maxStudents}
                onChange={(e) => onEditChange({ ...editData, maxStudents: e.target.value })}
                className="h-9 text-sm"
              />
              <p className="text-[10px] text-slate-400">
                {Number(editData.maxStudents) >= 999999 ? 'Unlimited' : `${editData.maxStudents} students`}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                <UserCog className="size-3.5 text-slate-400" />
                Max Staff
              </Label>
              <Input
                type="number"
                min="1"
                value={editData.maxUsers}
                onChange={(e) => onEditChange({ ...editData, maxUsers: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Section: Features */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            Features
            <Badge variant="secondary" className="text-[10px]">{editData.features.length}</Badge>
          </p>
          <FeatureEditor
            features={editData.features}
            onChange={(features) => onEditChange({ ...editData, features })}
          />
        </div>

        {/* Section: Active Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-3 bg-slate-50/50 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
              editData.isActive ? 'bg-emerald-100' : 'bg-slate-100'
            )}>
              <BadgeCheck className={cn('size-4', editData.isActive ? 'text-emerald-600' : 'text-slate-300')} />
            </div>
            <div className="min-w-0">
              <Label className="text-xs font-semibold text-slate-800">Active Plan</Label>
              <p className="text-[10px] text-slate-400">Inactive plans are hidden from schools</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onEditChange({ ...editData, isActive: !editData.isActive })}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
              editData.isActive ? 'bg-emerald-500' : 'bg-slate-200'
            )}
          >
            <span
              className={cn(
                'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform',
                editData.isActive ? 'translate-x-5' : 'translate-x-0'
              )}
            />
          </button>
        </div>

        {/* Actions */}
        <Separator />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <Button
            variant="ghost"
            onClick={onReset}
            disabled={isSaving}
            className="text-slate-400 gap-1.5 text-xs"
          >
            <RotateCcw className="size-3.5" />
            Reset to Original
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
            >
              {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export function DevPlans() {
  const [plans, setPlans] = useState<PlanData[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [editData, setEditData] = useState<EditablePlan | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/dev/plan-config')
      if (!res.ok) throw new Error('Failed to fetch plans')
      const data = await res.json()
      setPlans(data.plans || [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load plan configs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  const startEditing = (plan: PlanData) => {
    setEditingPlanId(plan.id)
    setEditData(planToEditable(plan))
  }

  const cancelEditing = () => {
    setEditingPlanId(null)
    setEditData(null)
  }

  const resetEditing = () => {
    if (editingPlanId) {
      const plan = plans.find((p) => p.id === editingPlanId)
      if (plan) setEditData(planToEditable(plan))
    }
  }

  const savePlan = async () => {
    if (!editingPlanId || !editData) return

    if (!editData.name.trim()) { toast.error('Plan name is required'); return }

    const priceUSD = Number(editData.priceUSD)
    const priceNGN = Number(editData.priceNGN)
    const validityDays = Number(editData.validityDays)
    const maxStudents = Number(editData.maxStudents)
    const maxUsers = Number(editData.maxUsers)

    if (isNaN(priceUSD) || priceUSD < 0) { toast.error('USD price must be valid'); return }
    if (isNaN(priceNGN) || priceNGN < 0) { toast.error('NGN price must be valid'); return }
    if (isNaN(validityDays) || validityDays < 1) { toast.error('Validity must be ≥ 1 day'); return }
    if (isNaN(maxStudents) || maxStudents < 1) { toast.error('Max students must be ≥ 1'); return }
    if (isNaN(maxUsers) || maxUsers < 1) { toast.error('Max staff must be ≥ 1'); return }

    setSavingId(editingPlanId)
    try {
      const res = await fetch('/api/dev/plan-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: editingPlanId,
          updates: {
            name: editData.name.trim(),
            subtitle: editData.subtitle,
            priceUSD,
            priceNGN,
            priceLabel: editData.priceLabel,
            validityDays,
            maxStudents,
            maxUsers,
            features: editData.features,
            isActive: editData.isActive,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to save')

      toast.success(data.message || 'Plan updated successfully')
      setEditingPlanId(null)
      setEditData(null)
      await fetchPlans()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save plan')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      {/* Page Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
            <CreditCard className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">Subscription Plans</h1>
            <p className="text-xs text-slate-500">Manage pricing, limits & features</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchPlans()}
          disabled={loading}
          className="gap-1.5 shrink-0"
        >
          <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </motion.div>

      {/* Info Banner */}
      <motion.div variants={item}>
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200/60 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
            <TrendingUp className="size-4 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-emerald-800">
              USD → NGN Auto-Conversion
              <Badge variant="outline" className="text-[10px] bg-white text-emerald-700 border-emerald-200 ml-2">
                ₦{DEFAULT_USD_TO_NGN_RATE.toLocaleString()} per $1
              </Badge>
            </p>
            <p className="text-[11px] text-emerald-600/80 mt-0.5">
              NGN is auto-calculated when you enter USD. Edit NGN manually to override.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 shrink-0 rounded-lg border border-sky-200/60 bg-sky-50/50 px-3 py-2">
            <Info className="size-3.5 text-sky-600" />
            <span className="text-[11px] text-sky-700 font-medium">Changes reflect instantly</span>
          </div>
        </div>
      </motion.div>

      {/* Plan List */}
      <motion.div variants={item} className="space-y-4">
        {loading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-8 w-24 rounded-md" />
                  </div>
                  <Separator />
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4].map((j) => (
                      <Skeleton key={j} className="h-9 w-28 rounded-lg" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : plans.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="size-10 text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-500">No plans configured</p>
              <p className="text-xs text-slate-400 mt-1">Plans should have been auto-seeded. Try refreshing.</p>
            </CardContent>
          </Card>
        ) : (
          plans.map((plan) => {
            const isEditing = editingPlanId === plan.id

            return (
              <AnimatePresence key={plan.id} mode="wait">
                {isEditing && editData ? (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.2 }}
                  >
                    <PlanRowEdit
                      plan={plan}
                      editData={editData}
                      savingId={savingId}
                      onSave={savePlan}
                      onCancel={cancelEditing}
                      onReset={resetEditing}
                      onEditChange={setEditData}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.2 }}
                  >
                    <PlanRowView
                      plan={plan}
                      onEdit={() => startEditing(plan)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            )
          })
        )}
      </motion.div>
    </motion.div>
  )
}