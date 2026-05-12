'use client'

import React, { useState, useEffect, useCallback } from 'react'
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
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
  Globe,
  Calendar,
  Building2,
  BookOpen,
  FileText,
  Clock,
  Activity,
  UserPlus,
  Shield,
  BarChart3,
  ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface SchoolDetail {
  id: string
  name: string
  slug: string
  logo: string | null
  motto: string | null
  primaryColor: string | null
  email: string | null
  phone: string | null
  state: string | null
  country: string | null
  address: string | null
  website: string | null
  status: string
  plan: string
  maxStudents: number
  maxUsers: number
  planStart: string | null
  planEnd: string | null
  rejectionReason: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  users: number
  students: number
  teachers: number
  classes: number
  subjects: number
  sessions: number
  examScores: number
  studentRecords: number
  activityLogs: number
  admissionRecords: number
  loginHistories: number
}

interface UserItem {
  id: string
  email: string
  username: string
  role: string
  imageUrl: string
  createdAt: string
}

interface ClassItem {
  id: string
  tenantId: string
  title: string
  createdAt: string
  updatedAt: string
}

interface SessionItem {
  id: string
  tenantId: string
  sessionOne: string
  sessionTwo: string
  active: string
  createdAt: string
}

interface ActivityItem {
  id: string
  tenantId: string
  action: string
  details: string
  createdAt: string
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rejected', className: 'bg-rose-100 text-rose-700 border-rose-200' },
  suspended: { label: 'Suspended', className: 'bg-slate-100 text-slate-600 border-slate-200' },
}

const planConfig: Record<string, { label: string; className: string; icon: string }> = {
  free: { label: 'Free', className: 'bg-slate-100 text-slate-600 border-slate-200', icon: '🆓' },
  basic: { label: 'Basic (₦20K)', className: 'bg-sky-100 text-sky-700 border-sky-200', icon: '⭐' },
  intermediate: { label: 'Intermediate (₦35K)', className: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: '🚀' },
  premium: { label: 'Premium (₦40K)', className: 'bg-amber-100 text-amber-700 border-amber-200', icon: '💎' },
  growth: { label: 'Growth (₦50K)', className: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: '🌟' },
}

function RelativeTime({ timestamp }: { timestamp: string }) {
  const then = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - then.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return <span>Just now</span>
  if (diffMins < 60) return <span>{diffMins}m ago</span>
  if (diffHours < 24) return <span>{diffHours}h ago</span>
  if (diffDays < 30) return <span>{diffDays}d ago</span>
  return <span>{then.toISOString().slice(0, 10)}</span>
}

export function DevSchoolDetail({ schoolId }: { schoolId: string }) {
  const navigate = useAppStore((s) => s.navigate)

  const [school, setSchool] = useState<SchoolDetail | null>(null)
  const [users, setUsers] = useState<UserItem[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Dialog states
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [reactivateOpen, setReactivateOpen] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)

  const fetchSchool = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dev/school-detail?id=${schoolId}`)
      if (!res.ok) throw new Error('Failed to fetch school')
      const data = await res.json()
      setSchool(data.school)
      setUsers(data.users || [])
      setClasses(data.classes || [])
      setSessions(data.sessions || [])
      setActivities(data.recentActivity || [])
    } catch {
      toast.error('Failed to load school details')
    } finally {
      setLoading(false)
    }
  }, [schoolId])

  useEffect(() => {
    fetchSchool()
  }, [fetchSchool])

  const handleAction = async (action: string, payload?: Record<string, unknown>) => {
    setActionLoading(true)
    try {
      const res = await fetch('/api/dev/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, action, ...payload }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Action failed')
      }
      toast.success(`School ${action.replace(/_/g, ' ')} successfully`)
      setApproveOpen(false)
      setRejectOpen(false)
      setSuspendOpen(false)
      setReactivateOpen(false)
      setPlanOpen(false)
      setDeleteOpen(false)
      fetchSchool()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/dev/schools?id=${schoolId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Delete failed')
      }
      toast.success('School deleted successfully')
      navigate('dev-schools')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl lg:col-span-2" />
        </div>
      </div>
    )
  }

  if (!school) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Building2 className="mb-3 size-12 text-slate-300" />
        <p className="text-sm font-medium text-slate-500">School not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('dev-schools')}>
          <ArrowLeft className="mr-1 size-4" />
          Back to Schools
        </Button>
      </div>
    )
  }

  const sc = statusConfig[school.status]
  const pc = planConfig[school.plan]

  const statCards = [
    { label: 'Students', value: school.students, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Teachers', value: school.teachers, icon: GraduationCap, color: 'text-sky-600', bg: 'bg-sky-50' },
    { label: 'Users', value: school.users, icon: UserCog, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Classes', value: school.classes, icon: Building2, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Subjects', value: school.subjects, icon: BookOpen, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Exam Scores', value: school.examScores, icon: ClipboardList, color: 'text-teal-600', bg: 'bg-teal-50' },
  ]

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('dev-schools')}>
              <ArrowLeft className="size-5" />
            </Button>
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-white"
              style={{ backgroundColor: school.primaryColor || '#6b7280' }}
            >
              {school.logo ? (
                <img src={school.logo} alt="" className="h-8 w-8 rounded object-cover" />
              ) : (
                school.name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{school.name}</h1>
                <Badge variant="outline" className={cn('text-[10px]', sc?.className)}>
                  {sc?.label}
                </Badge>
                <Badge variant="outline" className={cn('text-[10px]', pc?.className)}>
                  {pc?.icon} {pc?.label}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                {school.motto ? `"${school.motto}"` : 'No motto set'} · Registered {new Date(school.createdAt).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {school.status === 'pending' && (
              <>
                <Button size="sm" className="bg-emerald-600 text-xs hover:bg-emerald-700" onClick={() => setApproveOpen(true)}>
                  <CheckCircle2 className="mr-1 size-3.5" /> Approve
                </Button>
                <Button size="sm" variant="outline" className="border-rose-200 text-xs text-rose-600 hover:bg-rose-50" onClick={() => { setRejectOpen(true); setRejectReason('') }}>
                  <XCircle className="mr-1 size-3.5" /> Reject
                </Button>
              </>
            )}
            {school.status === 'approved' && (
              <>
                <Button size="sm" variant="outline" className="border-amber-200 text-xs text-amber-600 hover:bg-amber-50" onClick={() => setSuspendOpen(true)}>
                  <Ban className="mr-1 size-3.5" /> Suspend
                </Button>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => { setPlanOpen(true); setSelectedPlan(school.plan) }}>
                  <CreditCard className="mr-1 size-3.5" /> Change Plan
                </Button>
              </>
            )}
            {(school.status === 'rejected' || school.status === 'suspended') && (
              <Button size="sm" className="bg-emerald-600 text-xs hover:bg-emerald-700" onClick={() => setReactivateOpen(true)}>
                <RotateCcw className="mr-1 size-3.5" /> Reactivate
              </Button>
            )}
            <Button size="sm" variant="ghost" className="text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stat cards */}
      <motion.div variants={item} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="py-0">
              <CardContent className="p-3 text-center">
                <Icon className={cn('mx-auto mb-1 size-4', stat.color)} />
                <p className="text-lg font-bold text-slate-900">{stat.value.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500">{stat.label}</p>
              </CardContent>
            </Card>
          )
        })}
      </motion.div>

      {/* Main content tabs */}
      <motion.div variants={item}>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="users" className="text-xs">Users ({users.length})</TabsTrigger>
            <TabsTrigger value="classes" className="text-xs">Classes ({classes.length})</TabsTrigger>
            <TabsTrigger value="activity" className="text-xs">Activity ({activities.length})</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* School Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building2 className="size-4 text-slate-400" />
                    School Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <InfoRow label="Email" value={school.email} icon={Mail} />
                  <InfoRow label="Phone" value={school.phone} icon={Phone} />
                  <InfoRow label="Address" value={school.address} icon={MapPin} />
                  <InfoRow label="State" value={school.state} icon={MapPin} />
                  <InfoRow label="Website" value={school.website} icon={Globe} />
                  <InfoRow label="Plan" value={`${school.plan.charAt(0).toUpperCase() + school.plan.slice(1)} Plan`} />
                  <InfoRow label="Max Students" value={String(school.maxStudents)} />
                  <InfoRow label="Max Users" value={String(school.maxUsers)} />
                  {school.planStart && (
                    <InfoRow label="Plan Start" value={new Date(school.planStart).toLocaleDateString('en-NG')} />
                  )}
                  {school.planEnd && (
                    <InfoRow label="Plan End" value={new Date(school.planEnd).toLocaleDateString('en-NG')} />
                  )}
                  <InfoRow label="Created" value={new Date(school.createdAt).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })} />
                  <InfoRow label="Last Updated" value={new Date(school.updatedAt).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })} />
                  {school.rejectionReason && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 mt-2">
                      <p className="text-xs font-semibold text-rose-700 mb-1">Rejection Reason</p>
                      <p className="text-xs text-rose-600">{school.rejectionReason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Plan & Limits */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CreditCard className="size-4 text-slate-400" />
                    Subscription & Limits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-slate-700">
                        {pc?.icon} {school.plan.charAt(0).toUpperCase() + school.plan.slice(1)} Plan
                      </span>
                      <Badge variant="outline" className={cn('text-[10px]', pc?.className)}>
                        Current
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <ProgressRow label="Students" current={school.students} max={school.maxStudents} color="emerald" />
                      <ProgressRow label="Users" current={school.users} max={school.maxUsers} color="sky" />
                    </div>
                  </div>

                  <div className="rounded-lg border bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-500 mb-3">Data Summary</p>
                    <div className="grid grid-cols-2 gap-3">
                      <DataItem label="Sessions" value={school.sessions} />
                      <DataItem label="Exam Scores" value={school.examScores} />
                      <DataItem label="Student Records" value={school.studentRecords} />
                      <DataItem label="Login History" value={school.loginHistories} />
                      <DataItem label="Admissions" value={school.admissionRecords} />
                      <DataItem label="Activity Logs" value={school.activityLogs} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <UserCog className="size-4 text-slate-400" />
                  School Users
                </CardTitle>
                <CardDescription>All registered users for this school</CardDescription>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">No users registered</p>
                ) : (
                  <div className="space-y-2">
                    {users.map((u) => (
                      <div key={u.id} className="flex items-center gap-3 rounded-lg border p-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{u.username}</p>
                          <p className="text-xs text-slate-500 truncate">{u.email}</p>
                        </div>
                        <Badge variant="outline" className={cn(
                          'text-[10px]',
                          u.role === 'Admin' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                        )}>
                          {u.role}
                        </Badge>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {new Date(u.createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Classes Tab */}
          <TabsContent value="classes">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building2 className="size-4 text-slate-400" />
                    Classes
                  </CardTitle>
                  <CardDescription>{classes.length} classes configured</CardDescription>
                </CardHeader>
                <CardContent>
                  {classes.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-400">No classes configured</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {classes.map((c) => (
                        <Badge key={c.id} variant="outline" className="px-3 py-1.5 text-xs font-medium">
                          {c.title}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="size-4 text-slate-400" />
                    Sessions
                  </CardTitle>
                  <CardDescription>{sessions.length} sessions configured</CardDescription>
                </CardHeader>
                <CardContent>
                  {sessions.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-400">No sessions configured</p>
                  ) : (
                    <div className="space-y-2">
                      {sessions.map((s) => (
                        <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                          <span className="text-sm font-medium text-slate-700">{s.sessionOne}/{s.sessionTwo}</span>
                          <Badge variant={s.active === 'Yes' ? 'default' : 'secondary'} className={cn(
                            'text-[10px]',
                            s.active === 'Yes' ? 'bg-emerald-600' : ''
                          )}>
                            {s.active === 'Yes' ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="size-4 text-slate-400" />
                  Activity Log
                </CardTitle>
                <CardDescription>Recent actions for this school</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {activities.length === 0 ? (
                  <p className="py-12 text-center text-sm text-slate-400">No activity recorded</p>
                ) : (
                  <div className="divide-y max-h-96 overflow-y-auto">
                    {activities.map((a) => (
                      <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100">
                          <Activity className="size-3 text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-700 truncate">{a.action.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">{a.details}</p>
                        </div>
                        <span className="shrink-0 text-[10px] text-slate-400">
                          <RelativeTime timestamp={a.createdAt} />
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Approve Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve School</DialogTitle>
            <DialogDescription>
              Approve <strong>{school.name}</strong>? They will be able to access the platform immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={actionLoading} onClick={() => handleAction('update_status', { status: 'approved' })}>
              {actionLoading ? 'Approving...' : 'Approve School'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject School</DialogTitle>
            <DialogDescription>Rejecting <strong>{school.name}</strong>. Please provide a reason.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Rejection Reason</Label>
            <Textarea id="reject-reason" placeholder="Please explain why..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button className="bg-rose-600 hover:bg-rose-700" disabled={actionLoading || !rejectReason.trim()} onClick={() => { handleAction('update_status', { status: 'rejected', rejectionReason: rejectReason }); setRejectReason('') }}>
              {actionLoading ? 'Rejecting...' : 'Reject School'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend School</DialogTitle>
            <DialogDescription>
              Suspending <strong>{school.name}</strong> will immediately disable their access.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendOpen(false)}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700" disabled={actionLoading} onClick={() => handleAction('update_status', { status: 'suspended' })}>
              {actionLoading ? 'Suspending...' : 'Suspend School'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reactivate Dialog */}
      <Dialog open={reactivateOpen} onOpenChange={setReactivateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivate School</DialogTitle>
            <DialogDescription>
              Reactivate <strong>{school.name}</strong>? They will regain full access.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReactivateOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={actionLoading} onClick={() => handleAction('update_status', { status: 'approved' })}>
              {actionLoading ? 'Reactivating...' : 'Reactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Subscription Plan</DialogTitle>
            <DialogDescription>Update plan for <strong>{school.name}</strong></DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Select Plan</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['basic', 'intermediate', 'premium', 'growth'] as const).map((plan) => {
                const pl = planConfig[plan]
                const isSelected = selectedPlan === plan
                return (
                  <button
                    key={plan}
                    onClick={() => setSelectedPlan(plan)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-all',
                      isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <span className={cn('text-xs font-semibold', isSelected ? 'text-emerald-700' : 'text-slate-600')}>
                      {pl.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={actionLoading || selectedPlan === school.plan} onClick={() => handleAction('update_plan', { plan: selectedPlan })}>
              {actionLoading ? 'Updating...' : 'Update Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete School</DialogTitle>
            <DialogDescription>
              <span className="font-semibold text-rose-600">Warning:</span> Deleting <strong>{school.name}</strong> will permanently remove all data including students, teachers, scores, and records.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button className="bg-rose-600 hover:bg-rose-700" disabled={actionLoading} onClick={handleDelete}>
              {actionLoading ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

function InfoRow({ label, value, icon: Icon }: { label: string; value: string | null | undefined; icon?: React.ComponentType<{ className?: string }> }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-2 text-sm">
      {Icon && <Icon className="size-3.5 text-slate-400 shrink-0" />}
      <span className="text-slate-500 shrink-0">{label}:</span>
      <span className="font-medium text-slate-800 truncate">{value}</span>
    </div>
  )
}

function ProgressRow({ label, current, max, color }: { label: string; current: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0
  const isOver = current >= max
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-600">{label}</span>
        <span className={cn('text-xs font-semibold', isOver ? 'text-rose-600' : 'text-slate-700')}>
          {current}/{max}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isOver ? 'bg-rose-500' : `bg-${color}-500`
          )}
          style={{ width: `${pct}%`, backgroundColor: isOver ? '#ef4444' : undefined }}
        />
      </div>
    </div>
  )
}

function DataItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white border p-2">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-bold text-slate-800">{value.toLocaleString()}</span>
    </div>
  )
}
