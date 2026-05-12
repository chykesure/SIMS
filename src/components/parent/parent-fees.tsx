'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/index'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Wallet,
  AlertCircle,
  CheckCircle,
  Clock,
  Receipt,
  CreditCard,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaymentRecord {
  id: string
  amount: number
  method: string
  reference: string
  receiptNo: string
  term: string
  session: string
  paidBy: string
  note: string
  status: string
  createdAt: string
}

interface FeeItem {
  id: string
  feeTypeId: string
  feeTypeName: string
  feeTypeDescription: string
  feeTypeFrequency: string
  className: string
  session: string
  term: string
  amount: number
  totalPaid: number
  balance: number
  status: 'paid' | 'partial' | 'unpaid'
  dueDate: string
  payments: PaymentRecord[]
}

interface FeeSummary {
  totalAmount: number
  totalPaid: number
  totalOutstanding: number
  totalFees: number
  paidCount: number
  partialCount: number
  unpaidCount: number
}

interface FeesData {
  student: { id: string; fullname: string; regNo: string; class: string }
  fees: FeeItem[]
  summary: FeeSummary
}

interface ChildOption {
  id: string
  fullname: string
  class: string
}

export function ParentFees() {
  const { user, tenant, selectedChildId, setSelectedChildId } = useAppStore()
  const primaryColor = tenant?.primaryColor || '#821329'

  const [children, setChildren] = useState<ChildOption[]>([])
  const [data, setData] = useState<FeesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedFee, setSelectedFee] = useState<FeeItem | null>(null)

  // Fetch children list
  const fetchChildren = useCallback(async () => {
    try {
      const res = await fetch('/api/portal/parent', {
        headers: { 'x-user-id': user?.id || '' },
      })
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data?.children) {
          setChildren(json.data.children.map((c: ChildOption) => ({
            id: c.id,
            fullname: c.fullname,
            class: c.class,
          })))
          if (json.data.children.length > 0 && !selectedChildId) {
            setSelectedChildId(json.data.children[0].id)
          }
        }
      }
    } catch {
      // silent
    }
  }, [user?.id, selectedChildId, setSelectedChildId])

  useEffect(() => {
    fetchChildren()
  }, [fetchChildren])

  // Fetch fees
  const fetchFees = useCallback(async () => {
    if (!selectedChildId) return
    try {
      setLoading(true)
      setError('')
      const res = await fetch(`/api/portal/parent/fees?studentId=${selectedChildId}`)
      if (!res.ok) throw new Error('Failed to load fees')
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      } else {
        throw new Error(json.message || 'Failed to load fees')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [selectedChildId])

  useEffect(() => {
    fetchFees()
  }, [fetchFees])

  function getStatusBadge(status: 'paid' | 'partial' | 'unpaid') {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
            <CheckCircle className="size-3 mr-1" />
            Paid
          </Badge>
        )
      case 'partial':
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
            <Clock className="size-3 mr-1" />
            Partial
          </Badge>
        )
      case 'unpaid':
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
            <AlertCircle className="size-3 mr-1" />
            Unpaid
          </Badge>
        )
    }
  }

  function formatDate(dateStr: string): string {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  const hasMultipleChildren = children.length > 1

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Fee Payments</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track fee payments for {data?.student?.fullname || 'your children'}
        </p>
      </div>

      {/* Child selector */}
      {hasMultipleChildren && (
        <div className="w-full sm:w-64">
          <Select
            value={selectedChildId || ''}
            onValueChange={(val) => setSelectedChildId(val)}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select student" />
            </SelectTrigger>
            <SelectContent>
              {children.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.fullname} — {c.class}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="size-12 text-red-400 mb-4" />
          <p className="text-lg font-medium text-foreground">{error}</p>
        </div>
      )}

      {/* Content */}
      {data && !loading && !error && (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total fees */}
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                  <Wallet className="size-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Fees</p>
                  <p className="text-sm font-bold text-foreground">
                    ₦{data.summary.totalAmount.toLocaleString()}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{data.summary.totalFees} fee items</p>
                </div>
              </CardContent>
            </Card>

            {/* Total paid */}
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                  <CheckCircle className="size-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Paid</p>
                  <p className="text-sm font-bold text-emerald-600">
                    ₦{data.summary.totalPaid.toLocaleString()}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{data.summary.paidCount} fully paid</p>
                </div>
              </CardContent>
            </Card>

            {/* Outstanding */}
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  data.summary.totalOutstanding > 0 ? 'bg-red-50' : 'bg-emerald-50'
                )}>
                  <AlertCircle className={cn(
                    'size-5',
                    data.summary.totalOutstanding > 0 ? 'text-red-500' : 'text-emerald-600'
                  )} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Outstanding</p>
                  <p className={cn(
                    'text-sm font-bold',
                    data.summary.totalOutstanding > 0 ? 'text-red-600' : 'text-emerald-600'
                  )}>
                    ₦{data.summary.totalOutstanding.toLocaleString()}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {data.summary.unpaidCount} unpaid, {data.summary.partialCount} partial
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Progress */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                    <CreditCard className="size-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment Progress</p>
                    <p className="text-sm font-bold text-foreground">
                      {data.summary.totalAmount > 0
                        ? `${Math.round((data.summary.totalPaid / data.summary.totalAmount) * 100)}%`
                        : '0%'}
                    </p>
                  </div>
                </div>
                <Progress
                  value={data.summary.totalAmount > 0
                    ? (data.summary.totalPaid / data.summary.totalAmount) * 100
                    : 0
                  }
                  className="h-2"
                />
              </CardContent>
            </Card>
          </div>

          {/* Fees table */}
          {data.fees.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Receipt className="size-4" />
                  Fee Breakdown
                  {data.student && (
                    <Badge variant="outline" className="text-xs font-normal ml-2">
                      {data.student.fullname} — {data.student.class}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Fee Name</TableHead>
                        <TableHead className="text-xs text-center">Session</TableHead>
                        <TableHead className="text-xs text-center">Term</TableHead>
                        <TableHead className="text-xs text-right">Amount</TableHead>
                        <TableHead className="text-xs text-right">Paid</TableHead>
                        <TableHead className="text-xs text-right">Balance</TableHead>
                        <TableHead className="text-xs text-center">Status</TableHead>
                        <TableHead className="text-xs text-center">History</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.fees.map((fee) => (
                        <TableRow key={fee.id}>
                          <TableCell className="text-sm font-medium">
                            <div>
                              <p>{fee.feeTypeName}</p>
                              {fee.dueDate && (
                                <p className="text-[11px] text-muted-foreground">
                                  Due: {formatDate(fee.dueDate)}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-center text-muted-foreground">{fee.session || '—'}</TableCell>
                          <TableCell className="text-xs text-center text-muted-foreground">{fee.term || '—'}</TableCell>
                          <TableCell className="text-sm text-right font-medium">₦{fee.amount.toLocaleString()}</TableCell>
                          <TableCell className="text-sm text-right text-emerald-600">₦{fee.totalPaid.toLocaleString()}</TableCell>
                          <TableCell className={cn(
                            'text-sm text-right font-semibold',
                            fee.balance > 0 ? 'text-red-600' : 'text-slate-400'
                          )}>
                            ₦{fee.balance.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center">{getStatusBadge(fee.status)}</TableCell>
                          <TableCell className="text-center">
                            {fee.payments.length > 0 ? (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <button
                                    className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1"
                                    onClick={() => setSelectedFee(fee)}
                                  >
                                    {fee.payments.length}
                                    <ChevronRight className="size-3" />
                                  </button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                  <DialogHeader>
                                    <DialogTitle>
                                      Payment History — {fee.feeTypeName}
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-3 mt-2">
                                    {fee.payments.map((p) => (
                                      <div
                                        key={p.id}
                                        className="flex items-center justify-between py-2 border-b last:border-0"
                                      >
                                        <div>
                                          <p className="text-sm font-medium">
                                            ₦{p.amount.toLocaleString()}
                                          </p>
                                          <p className="text-[11px] text-muted-foreground">
                                            {formatDate(p.createdAt)} &middot; {p.method}
                                          </p>
                                          {p.paidBy && (
                                            <p className="text-[11px] text-muted-foreground">
                                              Paid by: {p.paidBy}
                                            </p>
                                          )}
                                          {p.receiptNo && (
                                            <p className="text-[11px] text-muted-foreground">
                                              Receipt: {p.receiptNo}
                                            </p>
                                          )}
                                        </div>
                                        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                                          <CheckCircle className="size-3 mr-1" />
                                          {p.status}
                                        </Badge>
                                      </div>
                                    ))}
                                    <Separator />
                                    <div className="flex items-center justify-between text-sm font-semibold">
                                      <span>Total Paid</span>
                                      <span className="text-emerald-600">
                                        ₦{fee.totalPaid.toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Wallet className="size-12 text-slate-300 mb-4" />
                <p className="text-lg font-medium text-foreground">No Fees Assigned</p>
                <p className="text-sm text-muted-foreground mt-1">
                  No fee assignments found for {data.student.fullname}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
