'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/index'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Separator,
} from '@/components/ui/separator'
import {
  Wallet,
  AlertCircle,
  CheckCircle2,
  Clock,
  Receipt,
  TrendingDown,
  CreditCard,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Payment {
  id: string
  amount: number
  method: string
  reference: string
  receiptNo: string
  status: string
  paidBy: string
  createdAt: string
}

interface FeeItem {
  id: string
  feeName: string
  feeDescription: string
  frequency: string
  amount: number
  session: string
  term: string
  dueDate: string
  className: string
  totalPaid: number
  balance: number
  status: 'paid' | 'partial' | 'unpaid'
  payments: Payment[]
}

interface FeeSummary {
  totalFees: number
  totalPaid: number
  outstanding: number
  totalFeesCount: number
  paidCount: number
  partialCount: number
  unpaidCount: number
}

interface FeesData {
  student: { id: string; fullname: string; class: string; regNo: string }
  fees: FeeItem[]
  summary: FeeSummary
}

export function StudentFees() {
  const { tenant, user } = useAppStore()
  const [data, setData] = useState<FeesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFee, setSelectedFee] = useState<FeeItem | null>(null)
  const [paymentDetailOpen, setPaymentDetailOpen] = useState(false)

  const primaryColor = tenant?.primaryColor || '#821329'

  const fetchFees = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/portal/student/fees', {
        headers: { 'x-user-id': user?.id || '' },
      })
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      } else {
        setError(json.message || 'Failed to load fees')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchFees()
  }, [fetchFees])

  const openPaymentDetail = (fee: FeeItem) => {
    setSelectedFee(fee)
    setPaymentDetailOpen(true)
  }

  const getStatusBadge = (status: 'paid' | 'partial' | 'unpaid') => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs">Paid</Badge>
      case 'partial':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs">Partial</Badge>
      case 'unpaid':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs">Unpaid</Badge>
      default:
        return null
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={fetchFees} variant="outline" size="sm">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">My Fees</h1>
        <p className="text-sm text-muted-foreground">
          View your fee schedule, payment history, and outstanding balances
        </p>
      </div>

      {/* Summary Cards */}
      {!loading && data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <Wallet className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Fees</p>
                <p className="text-lg font-bold text-slate-700">
                  ₦{data.summary.totalFees.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                <CreditCard className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Paid</p>
                <p className="text-lg font-bold text-emerald-600">
                  ₦{data.summary.totalPaid.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className={cn(
                  'text-lg font-bold',
                  data.summary.outstanding > 0 ? 'text-red-600' : 'text-emerald-600'
                )}>
                  ₦{data.summary.outstanding.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                <Receipt className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="text-sm font-bold text-blue-600">
                  {data.summary.unpaidCount === 0 && data.summary.partialCount === 0
                    ? 'All Paid'
                    : `${data.summary.unpaidCount} unpaid, ${data.summary.partialCount} partial`}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Fee Payment Progress */}
      {!loading && data && data.summary.totalFees > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Payment Progress</p>
              <p className="text-sm font-bold">
                {data.summary.totalFees > 0
                  ? Math.round((data.summary.totalPaid / data.summary.totalFees) * 100)
                  : 0}%
              </p>
            </div>
            <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${data.summary.totalFees > 0 ? Math.min((data.summary.totalPaid / data.summary.totalFees) * 100, 100) : 0}%`,
                  backgroundColor: primaryColor,
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fee Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Fee Breakdown</CardTitle>
            {data && (
              <Badge variant="outline" className="text-xs">
                {data.student.fullname} &middot; {data.student.class}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : data && data.fees.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fee Name</TableHead>
                      <TableHead className="text-center">Session</TableHead>
                      <TableHead className="text-center">Amount</TableHead>
                      <TableHead className="text-center">Paid</TableHead>
                      <TableHead className="text-center">Balance</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Due Date</TableHead>
                      <TableHead className="text-center"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.fees.map((fee) => (
                      <TableRow key={fee.id}>
                        <TableCell className="font-medium">
                          <div>
                            <p className="text-sm">{fee.feeName}</p>
                            {fee.frequency && (
                              <p className="text-[11px] text-muted-foreground capitalize">{fee.frequency}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {fee.session}
                          {fee.term && <span className="text-muted-foreground"> — {fee.term}</span>}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          ₦{fee.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center text-emerald-600 font-medium">
                          ₦{fee.totalPaid.toLocaleString()}
                        </TableCell>
                        <TableCell className={cn(
                          'text-center font-medium',
                          fee.balance > 0 ? 'text-red-600' : 'text-slate-400'
                        )}>
                          ₦{fee.balance.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(fee.status)}
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {fee.dueDate ? formatDate(fee.dueDate) : '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          {fee.payments.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                              onClick={() => openPaymentDetail(fee)}
                            >
                              <Receipt className="mr-1 h-3 w-3" />
                              {fee.payments.length}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {data.fees.map((fee) => (
                  <div
                    key={fee.id}
                    className="rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => fee.payments.length > 0 && openPaymentDetail(fee)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium">{fee.feeName}</p>
                        {fee.session && (
                          <p className="text-[11px] text-muted-foreground">{fee.session} {fee.term}</p>
                        )}
                      </div>
                      {getStatusBadge(fee.status)}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Amount</p>
                        <p className="text-sm font-medium">₦{fee.amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Paid</p>
                        <p className="text-sm font-medium text-emerald-600">₦{fee.totalPaid.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Balance</p>
                        <p className={cn('text-sm font-medium', fee.balance > 0 ? 'text-red-600' : 'text-slate-400')}>
                          ₦{fee.balance.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {fee.payments.length > 0 && (
                      <p className="mt-2 text-[11px] text-muted-foreground text-center">
                        Tap to view {fee.payments.length} payment(s)
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Wallet className="h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">No fees assigned</p>
              <p className="mt-1 text-xs text-muted-foreground">
                No fee assignments have been made for your class yet
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History Dialog */}
      <Dialog open={paymentDetailOpen} onOpenChange={setPaymentDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment History</DialogTitle>
          </DialogHeader>
          {selectedFee && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm font-semibold">{selectedFee.feeName}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>Amount: ₦{selectedFee.amount.toLocaleString()}</span>
                  <span>Paid: ₦{selectedFee.totalPaid.toLocaleString()}</span>
                  <span>Balance: ₦{selectedFee.balance.toLocaleString()}</span>
                  {getStatusBadge(selectedFee.status)}
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                {selectedFee.payments.map((payment) => (
                  <div key={payment.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm font-medium">
                          ₦{payment.amount.toLocaleString()}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {payment.method}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground space-y-0.5">
                      {payment.receiptNo && (
                        <p>Receipt: <span className="font-mono">{payment.receiptNo}</span></p>
                      )}
                      {payment.paidBy && <p>Paid by: {payment.paidBy}</p>}
                      {payment.reference && <p>Reference: {payment.reference}</p>}
                      <p>Date: {formatDate(payment.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
