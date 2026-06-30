'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/index'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Ban,
  RotateCcw,
  CreditCard,
  Trash2,
  Users,
  GraduationCap,
  UserCog,
  MapPin,
  Mail,
  Phone,
  Building2,
  Calendar,
  Sparkles,
  LogIn,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

interface School {
  id: string
  name: string
  motto: string | null
  email: string | null
  phone: string | null
  state: string | null
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  plan: 'free' | 'basic' | 'intermediate' | 'premium' | 'growth'
  studentCount: number
  userCount: number
  teacherCount: number
  createdAt: string
  logo: string | null
  primaryColor: string | null
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'suspended'

const statusConfig: Record<string, { label: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: {
    label: 'Pending',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: Clock,
  },
  approved: {
    label: 'Approved',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-rose-100 text-rose-700 border-rose-200',
    icon: XCircle,
  },
  suspended: {
    label: 'Suspended',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: Ban,
  },
}

const planConfig: Record<string, { label: string; className: string }> = {
  free: { label: 'Free', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  basic: { label: 'Basic (₦20K)', className: 'bg-sky-100 text-sky-700 border-sky-200' },
  intermediate: { label: 'Intermediate (₦35K)', className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  premium: { label: 'Premium (₦40K)', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  growth: { label: 'Growth (₦50K)', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
}

function Clock({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
}

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
}

export function DevSchools() {
  const navigate = useAppStore((s) => s.navigate);
  const viewSchoolDetail = useAppStore((s) => s.viewSchoolDetail);
  const startImpersonation = useAppStore((s) => s.startImpersonation);
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<StatusFilter>('all')

  // Dialogs
  const [approveDialog, setApproveDialog] = useState<{ open: boolean; school: School | null }>({ open: false, school: null })
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; school: School | null }>({ open: false, school: null })
  const [rejectReason, setRejectReason] = useState('')
  const [suspendDialog, setSuspendDialog] = useState<{ open: boolean; school: School | null }>({ open: false, school: null })
  const [reactivateDialog, setReactivateDialog] = useState<{ open: boolean; school: School | null }>({ open: false, school: null })
  const [planDialog, setPlanDialog] = useState<{ open: boolean; school: School | null }>({ open: false, school: null })
  const [selectedPlan, setSelectedPlan] = useState<string>('')
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; school: School | null }>({ open: false, school: null })
  const [actionLoading, setActionLoading] = useState(false)
  const [impersonating, setImpersonating] = useState(false)

  const fetchSchools = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dev/schools')
      if (!res.ok) throw new Error('Failed to fetch schools')
      const data = await res.json()
      setSchools(data.schools || data || [])
    } catch (err) {
      toast.error('Failed to load schools')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSchools()
  }, [fetchSchools])

  const filteredSchools = schools.filter((school) => {
    const matchesSearch =
      !searchQuery ||
      school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (school.email && school.email.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesTab = activeTab === 'all' || school.status === activeTab
    return matchesSearch && matchesTab
  })

  const handleAction = async (schoolId: string, action: string, payload?: Record<string, unknown>) => {
    setActionLoading(true)
    try {
      // Map friendly action names to API-compatible format
      let body: Record<string, unknown>
      let successMsg: string

      switch (action) {
        case 'approve':
          body = { action: 'update_status', schoolId, status: 'approved' }
          successMsg = 'School approved successfully'
          break
        case 'reject':
          body = { action: 'update_status', schoolId, status: 'rejected', rejectionReason: payload?.reason || '' }
          successMsg = 'School rejected'
          break
        case 'suspend':
          body = { action: 'update_status', schoolId, status: 'suspended' }
          successMsg = 'School suspended'
          break
        case 'reactivate':
          body = { action: 'update_status', schoolId, status: 'approved' }
          successMsg = 'School reactivated successfully'
          break
        case 'change_plan':
          body = { action: 'update_plan', schoolId, plan: payload?.plan }
          successMsg = `Plan updated to ${(payload?.plan as string) || 'free'}`
          break
        case 'delete':
          // Delete uses DELETE method
          {
            const res = await fetch(`/api/dev/schools?id=${schoolId}`, { method: 'DELETE' })
            if (!res.ok) {
              const data = await res.json()
              throw new Error(data.message || 'Delete failed')
            }
            toast.success('School deleted permanently')
            fetchSchools()
            setActionLoading(false)
            return
          }
        default:
          throw new Error('Unknown action')
      }

      const res = await fetch('/api/dev/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Action failed')
      }
      toast.success(successMsg)
      fetchSchools()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusCounts = () => {
    const counts: Record<StatusFilter, number> = { all: schools.length, pending: 0, approved: 0, rejected: 0, suspended: 0 }
    schools.forEach((s) => {
      if (s.status in counts) counts[s.status as keyof typeof counts]++
    })
    return counts
  }

  const statusCounts = getStatusCounts()

  const tabLabels: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'suspended', label: 'Suspended' },
  ]

  const handleAccessPortal = async (school: School) => {
    setImpersonating(true)
    try {
      const res = await fetch('/api/dev/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: school.id }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Failed to access school portal')
      }
      const data = await res.json()
      startImpersonation(data.user, data.tenant, data.sessionId)
      toast.success(`Accessing ${data.tenant.name} portal`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to access school portal')
    } finally {
      setImpersonating(false)
    }
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={item}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Manage Schools
              </h1>
              <p className="text-sm text-slate-500">
                Review, approve, and manage all registered schools
              </p>
            </div>
            <Badge variant="secondary" className="h-6 px-2.5 text-sm font-semibold">
              {schools.length}
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={item} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as StatusFilter)}
          className="w-full sm:w-auto"
        >
          <TabsList className="w-full sm:w-auto">
            {tabLabels.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                {tab.label}
                {statusCounts[tab.value] > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-200 px-1 text-[10px] font-medium text-slate-600">
                    {statusCounts[tab.value]}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative flex-1 sm:max-w-xs sm:ml-auto">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search schools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </motion.div>

      {/* Schools List */}
      <motion.div variants={item} className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredSchools.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Building2 className="mb-3 size-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">
                {searchQuery ? 'No schools match your search' : 'No schools found'}
              </p>
              <p className="text-xs text-slate-400">
                {searchQuery ? 'Try a different search term' : 'Schools will appear here when they register'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {filteredSchools.map((school) => {
                const sc = statusConfig[school.status]
                const pc = planConfig[school.plan]
                const StatusIcon = sc.icon

                return (
                  <motion.div
                    key={school.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="overflow-hidden py-0">
                      <CardContent className="p-0">
                        <div className="flex flex-col lg:flex-row lg:items-center">
                          {/* School Info */}
                          <div className="flex-1 p-4 md:p-5">
                            <div className="flex items-start gap-3">
                              {/* School Avatar */}
                              <div
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                                style={{ backgroundColor: school.primaryColor || '#6b7280' }}
                              >
                                {school.logo ? (
                                  <img src={school.logo} alt="" className="h-6 w-6 rounded object-cover" />
                                ) : (
                                  school.name.charAt(0).toUpperCase()
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                {/* Name + Badges */}
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3
                                    className="text-sm font-semibold text-slate-900 truncate cursor-pointer hover:text-emerald-600 transition-colors"
                                    onClick={() => viewSchoolDetail(school.id)}
                                    title="Click to view school details"
                                  >
                                    {school.name}
                                  </h3>
                                  <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', sc.className)}>
                                    <StatusIcon className="mr-0.5 size-2.5" />
                                    {sc.label}
                                  </Badge>
                                  <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', pc.className)}>
                                    {pc.label}
                                  </Badge>
                                </div>

                                {/* Motto */}
                                {school.motto && (
                                  <p className="mt-0.5 text-xs text-slate-500 italic truncate">
                                    &ldquo;{school.motto}&rdquo;
                                  </p>
                                )}

                                {/* Contact Info */}
                                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                  {school.state && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="size-3" />
                                      {school.state}
                                    </span>
                                  )}
                                  {school.email && (
                                    <span className="flex items-center gap-1">
                                      <Mail className="size-3" />
                                      {school.email}
                                    </span>
                                  )}
                                  {school.phone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="size-3" />
                                      {school.phone}
                                    </span>
                                  )}
                                </div>

                                {/* Stats */}
                                <div className="mt-2.5 flex flex-wrap items-center gap-4">
                                  <span className="flex items-center gap-1 text-xs text-slate-500">
                                    <Users className="size-3" />
                                    <span className="font-medium text-slate-700">{school.studentCount}</span> students
                                  </span>
                                  <span className="flex items-center gap-1 text-xs text-slate-500">
                                    <GraduationCap className="size-3" />
                                    <span className="font-medium text-slate-700">{school.teacherCount}</span> teachers
                                  </span>
                                  <span className="flex items-center gap-1 text-xs text-slate-500">
                                    <UserCog className="size-3" />
                                    <span className="font-medium text-slate-700">{school.userCount}</span> users
                                  </span>
                                  <span className="flex items-center gap-1 text-xs text-slate-500">
                                    <Calendar className="size-3" />
                                    {new Date(school.createdAt).toISOString().slice(0, 10)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-3 lg:border-l lg:border-t-0 lg:flex-col lg:items-end lg:px-4 lg:py-4">
                            {school.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  className="h-8 bg-emerald-600 text-xs hover:bg-emerald-700"
                                  onClick={() => setApproveDialog({ open: true, school })}
                                >
                                  <CheckCircle2 className="mr-1 size-3.5" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 border-rose-200 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                  onClick={() => {
                                    setRejectDialog({ open: true, school })
                                    setRejectReason('')
                                  }}
                                >
                                  <XCircle className="mr-1 size-3.5" />
                                  Reject
                                </Button>
                              </>
                            )}
                            {school.status === 'approved' && (
                              <>
                                <Button
                                  size="sm"
                                  className="h-8 bg-indigo-600 text-xs hover:bg-indigo-700"
                                  disabled={impersonating}
                                  onClick={() => handleAccessPortal(school)}
                                >
                                  <LogIn className="mr-1 size-3.5" />
                                  {impersonating ? 'Accessing...' : 'Access Portal'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 border-amber-200 text-xs text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                                  onClick={() => setSuspendDialog({ open: true, school })}
                                >
                                  <Ban className="mr-1 size-3.5" />
                                  Suspend
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs"
                                  onClick={() => {
                                    setPlanDialog({ open: true, school })
                                    setSelectedPlan(school.plan)
                                  }}
                                >
                                  <CreditCard className="mr-1 size-3.5" />
                                  Change Plan
                                </Button>
                              </>
                            )}
                            {school.status === 'rejected' && (
                              <Button
                                size="sm"
                                className="h-8 bg-emerald-600 text-xs hover:bg-emerald-700"
                                onClick={() => setApproveDialog({ open: true, school })}
                              >
                                <CheckCircle2 className="mr-1 size-3.5" />
                                Approve
                              </Button>
                            )}
                            {school.status === 'suspended' && (
                              <Button
                                size="sm"
                                className="h-8 bg-emerald-600 text-xs hover:bg-emerald-700"
                                onClick={() => setReactivateDialog({ open: true, school })}
                              >
                                <RotateCcw className="mr-1 size-3.5" />
                                Reactivate
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              onClick={() => setDeleteDialog({ open: true, school })}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </AnimatePresence>
        )}
      </motion.div>

      {/* Approve Dialog */}
      <Dialog open={approveDialog.open} onOpenChange={(open) => setApproveDialog({ open, school: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve School</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve <strong>{approveDialog.school?.name}</strong>? They will be able to access the platform immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog({ open: false, school: null })}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={actionLoading}
              onClick={() => {
                if (approveDialog.school) {
                  handleAction(approveDialog.school.id, 'approve')
                  setApproveDialog({ open: false, school: null })
                }
              }}
            >
              {actionLoading ? 'Approving...' : 'Approve School'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ open, school: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject School</DialogTitle>
            <DialogDescription>
              Rejecting <strong>{rejectDialog.school?.name}</strong>. Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Rejection Reason</Label>
            <Textarea
              id="reject-reason"
              placeholder="Please explain why this school is being rejected..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, school: null })}>
              Cancel
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700"
              disabled={actionLoading || !rejectReason.trim()}
              onClick={() => {
                if (rejectDialog.school) {
                  handleAction(rejectDialog.school.id, 'reject', { reason: rejectReason })
                  setRejectDialog({ open: false, school: null })
                  setRejectReason('')
                }
              }}
            >
              {actionLoading ? 'Rejecting...' : 'Reject School'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialog.open} onOpenChange={(open) => setSuspendDialog({ open, school: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend School</DialogTitle>
            <DialogDescription>
              Suspending <strong>{suspendDialog.school?.name}</strong> will immediately disable their access to the platform. They will not be able to log in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialog({ open: false, school: null })}>
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700"
              disabled={actionLoading}
              onClick={() => {
                if (suspendDialog.school) {
                  handleAction(suspendDialog.school.id, 'suspend')
                  setSuspendDialog({ open: false, school: null })
                }
              }}
            >
              {actionLoading ? 'Suspending...' : 'Suspend School'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reactivate Dialog */}
      <Dialog open={reactivateDialog.open} onOpenChange={(open) => setReactivateDialog({ open, school: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivate School</DialogTitle>
            <DialogDescription>
              Reactivate <strong>{reactivateDialog.school?.name}</strong>? They will regain full access to the platform.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReactivateDialog({ open: false, school: null })}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={actionLoading}
              onClick={() => {
                if (reactivateDialog.school) {
                  handleAction(reactivateDialog.school.id, 'reactivate')
                  setReactivateDialog({ open: false, school: null })
                }
              }}
            >
              {actionLoading ? 'Reactivating...' : 'Reactivate School'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog open={planDialog.open} onOpenChange={(open) => setPlanDialog({ open, school: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Subscription Plan</DialogTitle>
            <DialogDescription>
              Update plan for <strong>{planDialog.school?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Select Plan</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['basic', 'intermediate', 'premium', 'growth'] as const).map((plan) => {
                const pc = planConfig[plan]
                const isSelected = selectedPlan === plan
                return (
                  <button
                    key={plan}
                    onClick={() => setSelectedPlan(plan)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-all',
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    )}
                  >
                    <span className={cn(
                      'text-xs font-semibold',
                      isSelected ? 'text-emerald-700' : 'text-slate-600'
                    )}>
                      {pc.label}
                    </span>
                    {plan === 'basic' && (
                      <span className="text-[10px] text-slate-400">50 students · 3 users</span>
                    )}
                    {plan === 'intermediate' && (
                      <span className="text-[10px] text-slate-400">200 students · 15 users</span>
                    )}
                    {plan === 'premium' && (
                      <span className="text-[10px] text-slate-400">500 students · 100 users</span>
                    )}
                    {plan === 'growth' && (
                      <span className="text-[10px] text-slate-400">Unlimited students & users</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Plan Details */}
            <div className="mt-3 rounded-lg border bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500 mb-2">Plan Details</p>
              {selectedPlan === 'basic' && (
                <ul className="space-y-1 text-xs text-slate-600">
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="size-3 text-emerald-500" /> Max 50 students</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="size-3 text-emerald-500" /> Max 3 admin users</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="size-3 text-emerald-500" /> ₦20,000/termly</li>
                </ul>
              )}
              {selectedPlan === 'intermediate' && (
                <ul className="space-y-1 text-xs text-slate-600">
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="size-3 text-emerald-500" /> Max 200 students</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="size-3 text-emerald-500" /> Max 15 admin users</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="size-3 text-emerald-500" /> ₦35,000/termly</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="size-3 text-emerald-500" /> Advanced reporting</li>
                </ul>
              )}
              {selectedPlan === 'premium' && (
                <ul className="space-y-1 text-xs text-slate-600">
                  <li className="flex items-center gap-1.5"><Sparkles className="size-3 text-amber-500" /> Max 500 students</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="size-3 text-emerald-500" /> Max 100 admin users</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="size-3 text-emerald-500" /> ₦40,000/termly</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="size-3 text-emerald-500" /> Full analytics suite</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="size-3 text-emerald-500" /> Custom branding</li>
                </ul>
              )}
              {selectedPlan === 'growth' && (
                <ul className="space-y-1 text-xs text-slate-600">
                  <li className="flex items-center gap-1.5"><Sparkles className="size-3 text-emerald-500" /> Unlimited students & users</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="size-3 text-emerald-500" /> ₦50,000/termly</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="size-3 text-emerald-500" /> Multi-campus support</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="size-3 text-emerald-500" /> API access</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="size-3 text-emerald-500" /> Dedicated account manager</li>
                </ul>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialog({ open: false, school: null })}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={actionLoading || selectedPlan === planDialog.school?.plan}
              onClick={() => {
                if (planDialog.school && selectedPlan !== planDialog.school.plan) {
                  handleAction(planDialog.school.id, 'change_plan', { plan: selectedPlan })
                  setPlanDialog({ open: false, school: null })
                }
              }}
            >
              {actionLoading ? 'Updating...' : 'Update Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, school: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete School</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-rose-600">Warning:</span> This action cannot be undone. Deleting{' '}
              <strong>{deleteDialog.school?.name}</strong> will permanently remove all associated data including
              students, teachers, scores, and records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              disabled={actionLoading}
              onClick={() => {
                if (deleteDialog.school) {
                  handleAction(deleteDialog.school.id, 'delete')
                  setDeleteDialog({ open: false, school: null })
                }
              }}
            >
              {actionLoading ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}
