'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Printer,
  FileCheck,
  Receipt,
  CreditCard,
  ArrowRightLeft,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ─── Types ────────────────────────────────────────────────────────────────────

type VoucherType = 'payment' | 'receipt' | 'credit_note' | 'debit_note';
type VoucherStatus = 'draft' | 'approved' | 'cancelled';

interface Voucher {
  id: string;
  voucherNo: string;
  type: VoucherType;
  title: string;
  description: string;
  amount: number;
  date: string;
  payeeName: string;
  payeeDetails: string;
  particulars: string;
  authorizedBy: string;
  status: VoucherStatus;
  term: string;
  session: string;
  createdAt: string;
  updatedAt: string;
}

interface VoucherForm {
  type: VoucherType;
  title: string;
  description: string;
  amount: string;
  date: string;
  payeeName: string;
  payeeDetails: string;
  particulars: string;
  authorizedBy: string;
  term: string;
  session: string;
}

interface SummaryData {
  total: { count: number; amount: number };
  draft: { count: number; amount: number };
  approved: { count: number; amount: number };
  cancelled: { count: number; amount: number };
  approvedPayments: { count: number; amount: number };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);

const TYPE_CONFIG: Record<
  VoucherType,
  { label: string; badgeClass: string; icon: typeof FileText }
> = {
  payment: {
    label: 'Payment',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: CreditCard,
  },
  receipt: {
    label: 'Receipt',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: Receipt,
  },
  credit_note: {
    label: 'Credit Note',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
    icon: FileCheck,
  },
  debit_note: {
    label: 'Debit Note',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    icon: ArrowRightLeft,
  },
};

const STATUS_CONFIG: Record<
  VoucherStatus,
  { label: string; badgeClass: string; icon: typeof CheckCircle }
> = {
  draft: {
    label: 'Draft',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: FileText,
  },
  approved: {
    label: 'Approved',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: CheckCircle,
  },
  cancelled: {
    label: 'Cancelled',
    badgeClass: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle,
  },
};

const EMPTY_FORM: VoucherForm = {
  type: 'payment',
  title: '',
  description: '',
  amount: '',
  date: new Date().toISOString().split('T')[0],
  payeeName: '',
  payeeDetails: '',
  particulars: '',
  authorizedBy: '',
  term: '',
  session: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function numberToWords(n: number): string {
  if (n === 0) return 'Zero Naira Only';
  if (n < 0) return 'Minus ' + numberToWords(-n);

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
  ];

  function convert(num: number): string {
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' and ' + convert(num % 100) : '');
    if (num < 1000000) return convert(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 !== 0 ? ' ' + convert(num % 1000) : '');
    if (num < 1000000000) return convert(Math.floor(num / 1000000)) + ' Million' + (num % 1000000 !== 0 ? ' ' + convert(num % 1000000) : '');
    return convert(Math.floor(num / 1000000000)) + ' Billion' + (num % 1000000000 !== 0 ? ' ' + convert(num % 1000000000) : '');
  }

  const whole = Math.floor(n);
  const kobo = Math.round((n - whole) * 100);
  let result = convert(whole) + ' Naira';
  if (kobo > 0) {
    result += ' and ' + convert(kobo) + ' Kobo';
  }
  result += ' Only';
  return result;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ─── Animation variants ───────────────────────────────────────────────────────

const fadeSlideUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25 },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

// ─── Skeletons ────────────────────────────────────────────────────────────────

function SummaryCardSkeleton() {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-0">
        <div className="space-y-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0"
            >
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-16 ml-auto" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function VoucherView() {
  const tenant = useAppStore((s) => s.tenant);
  const schoolName = tenant?.name || 'SchoolDesk';

  // State
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);

  // Form
  const [form, setForm] = useState<VoucherForm>({ ...EMPTY_FORM });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const printRef = useRef<HTMLDivElement>(null);

  // ─── Fetch vouchers ─────────────────────────────────────────────────────────

  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== 'all') params.set('type', filterType);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (searchText.trim()) params.set('search', searchText.trim());

      const res = await fetch(`/api/vouchers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setVouchers(data.data || []);
        } else {
          toast.error(data.message || 'Failed to fetch vouchers');
        }
      } else {
        toast.error('Failed to fetch vouchers');
      }
    } catch {
      toast.error('Network error while fetching vouchers');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus, searchText]);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  // ─── Computed summary ───────────────────────────────────────────────────────

  const summary: SummaryData = vouchers.reduce(
    (acc, v) => {
      acc.total.count += 1;
      acc.total.amount += v.amount;
      acc[v.status].count += 1;
      acc[v.status].amount += v.amount;
      if (v.type === 'payment' && v.status === 'approved') {
        acc.approvedPayments.count += 1;
        acc.approvedPayments.amount += v.amount;
      }
      return acc;
    },
    {
      total: { count: 0, amount: 0 },
      draft: { count: 0, amount: 0 },
      approved: { count: 0, amount: 0 },
      cancelled: { count: 0, amount: 0 },
      approvedPayments: { count: 0, amount: 0 },
    }
  );

  // ─── Form handlers ──────────────────────────────────────────────────────────

  const updateForm = (field: keyof VoucherForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.type) errors.type = 'Type is required';
    if (!form.title.trim()) errors.title = 'Title is required';
    if (!form.amount || Number(form.amount) <= 0) errors.amount = 'Valid amount is required';
    if (!form.date) errors.date = 'Date is required';
    if (!form.payeeName.trim()) errors.payeeName = 'Payee name is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ─── CRUD operations ────────────────────────────────────────────────────────

  const handleCreateVoucher = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Voucher created successfully');
        setShowCreateDialog(false);
        setForm({ ...EMPTY_FORM, date: new Date().toISOString().split('T')[0] });
        setFormErrors({});
        fetchVouchers();
      } else {
        toast.error(data.message || 'Failed to create voucher');
      }
    } catch {
      toast.error('Network error while creating voucher');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateVoucher = async () => {
    if (!editingVoucher || !validateForm()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/vouchers/${editingVoucher.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Voucher updated successfully');
        setEditingVoucher(null);
        setShowCreateDialog(false);
        setForm({ ...EMPTY_FORM, date: new Date().toISOString().split('T')[0] });
        setFormErrors({});
        fetchVouchers();
      } else {
        toast.error(data.message || 'Failed to update voucher');
      }
    } catch {
      toast.error('Network error while updating voucher');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveVoucher = async (voucher: Voucher) => {
    try {
      const res = await fetch(`/api/vouchers/${voucher.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Voucher approved successfully');
        fetchVouchers();
      } else {
        toast.error(data.message || 'Failed to approve voucher');
      }
    } catch {
      toast.error('Network error while approving voucher');
    }
  };

  const handleCancelVoucher = async () => {
    if (!selectedVoucher) return;
    try {
      const res = await fetch(`/api/vouchers/${selectedVoucher.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Voucher cancelled');
        setShowCancelDialog(false);
        setSelectedVoucher(null);
        fetchVouchers();
      } else {
        toast.error(data.message || 'Failed to cancel voucher');
      }
    } catch {
      toast.error('Network error while cancelling voucher');
    }
  };

  const handleDeleteVoucher = async () => {
    if (!selectedVoucher) return;
    try {
      const res = await fetch(`/api/vouchers/${selectedVoucher.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Voucher deleted');
        setShowDeleteDialog(false);
        setSelectedVoucher(null);
        fetchVouchers();
      } else {
        toast.error(data.message || 'Failed to delete voucher');
      }
    } catch {
      toast.error('Network error while deleting voucher');
    }
  };

  // ─── Dialog openers ─────────────────────────────────────────────────────────

  const openCreateDialog = () => {
    setEditingVoucher(null);
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().split('T')[0] });
    setFormErrors({});
    setShowCreateDialog(true);
  };

  const openEditDialog = (voucher: Voucher) => {
    if (voucher.status !== 'draft') return;
    setEditingVoucher(voucher);
    setForm({
      type: voucher.type,
      title: voucher.title,
      description: voucher.description,
      amount: String(voucher.amount),
      date: voucher.date,
      payeeName: voucher.payeeName,
      payeeDetails: voucher.payeeDetails,
      particulars: voucher.particulars,
      authorizedBy: voucher.authorizedBy,
      term: voucher.term,
      session: voucher.session,
    });
    setFormErrors({});
    setShowCreateDialog(true);
  };

  const openViewDialog = (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setShowViewDialog(true);
  };

  const openCancelDialog = (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setShowCancelDialog(true);
  };

  const openDeleteDialog = (voucher: Voucher) => {
    if (voucher.status !== 'draft') return;
    setSelectedVoucher(voucher);
    setShowDeleteDialog(true);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      toast.error('Could not open print window');
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Voucher - ${selectedVoucher?.voucherNo || ''}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1a1a1a; }
          .voucher-header { text-align: center; margin-bottom: 32px; border-bottom: 3px double #333; padding-bottom: 20px; }
          .school-name { font-size: 24px; font-weight: 700; letter-spacing: 1px; }
          .school-motto { font-size: 12px; color: #666; margin-top: 4px; }
          .voucher-title { font-size: 18px; font-weight: 600; margin-top: 12px; text-transform: uppercase; letter-spacing: 2px; }
          .voucher-meta { display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 13px; }
          .voucher-meta span { color: #555; }
          .voucher-meta strong { color: #111; }
          .section { margin-bottom: 20px; }
          .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 8px; font-weight: 600; }
          .section-content { font-size: 14px; line-height: 1.6; padding: 12px; border: 1px solid #e5e5e5; border-radius: 4px; background: #fafafa; }
          .amount-section { display: flex; gap: 24px; margin-bottom: 24px; }
          .amount-box { flex: 1; padding: 16px; border: 2px solid #333; border-radius: 4px; }
          .amount-box .label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 4px; }
          .amount-box .value { font-size: 18px; font-weight: 700; }
          .signature-line { display: flex; justify-content: flex-end; margin-top: 60px; }
          .signature-block { text-align: center; width: 200px; }
          .sig-line { border-top: 1px solid #333; padding-top: 8px; margin-top: 40px; }
          .sig-label { font-size: 12px; color: #555; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const isEditing = !!editingVoucher;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50/50">
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {/* Page Header */}
        <motion.div
          {...fadeSlideUp}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Voucher Management</h1>
            <p className="text-sm text-muted-foreground">
              Create and manage payment, receipt, and journal vouchers
            </p>
          </div>
          <Button onClick={openCreateDialog} className="shrink-0 gap-2">
            <Plus className="h-4 w-4" />
            Create Voucher
          </Button>
        </motion.div>

        {/* Summary Cards */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SummaryCardSkeleton key={i} />)
          ) : (
            <>
              {/* Total Vouchers */}
              <motion.div variants={staggerItem}>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                        <FileText className="h-5 w-5 text-slate-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-muted-foreground">Total Vouchers</p>
                        <p className="text-lg font-bold">{summary.total.count}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatCurrency(summary.total.amount)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Draft */}
              <motion.div variants={staggerItem}>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                        <FileText className="h-5 w-5 text-slate-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-muted-foreground">Draft</p>
                        <p className="text-lg font-bold">{summary.draft.count}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatCurrency(summary.draft.amount)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Approved */}
              <motion.div variants={staggerItem}>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-muted-foreground">Approved</p>
                        <p className="text-lg font-bold">{summary.approved.count}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatCurrency(summary.approved.amount)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Cancelled */}
              <motion.div variants={staggerItem}>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50">
                        <XCircle className="h-5 w-5 text-red-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-muted-foreground">Cancelled</p>
                        <p className="text-lg font-bold">{summary.cancelled.count}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatCurrency(summary.cancelled.amount)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Approved Payments (highlighted) */}
              <motion.div variants={staggerItem}>
                <Card className="border-0 shadow-sm ring-2 ring-amber-400/50 bg-amber-50/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                        <CreditCard className="h-5 w-5 text-amber-700" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-amber-800">Approved Payments</p>
                        <p className="text-lg font-bold text-amber-900">{summary.approvedPayments.count}</p>
                        <p className="truncate text-xs font-medium text-amber-700">
                          {formatCurrency(summary.approvedPayments.amount)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}
        </motion.div>

        {/* Filters */}
        <motion.div
          {...fadeSlideUp}
          transition={{ delay: 0.15 }}
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by voucher no, title, payee..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="receipt">Receipt</SelectItem>
                <SelectItem value="credit_note">Credit Note</SelectItem>
                <SelectItem value="debit_note">Debit Note</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Vouchers Table */}
        <motion.div {...fadeSlideUp} transition={{ delay: 0.2 }}>
          <Card className="border-0 shadow-sm overflow-hidden">
            {loading ? (
              <TableSkeleton />
            ) : vouchers.length === 0 ? (
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No vouchers found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {searchText || filterType !== 'all' || filterStatus !== 'all'
                    ? 'Try adjusting your search or filters.'
                    : 'Create your first voucher to get started.'}
                </p>
                <Button className="mt-4 gap-2" onClick={openCreateDialog}>
                  <Plus className="h-4 w-4" />
                  Create Voucher
                </Button>
              </CardContent>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">
                        Voucher No
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">
                        Type
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">
                        Title
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">
                        Payee
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">
                        Amount
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">
                        Date
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">
                        Status
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="popLayout">
                      {vouchers.map((voucher, index) => {
                        const typeCfg = TYPE_CONFIG[voucher.type];
                        const statusCfg = STATUS_CONFIG[voucher.status];
                        const TypeIcon = typeCfg.icon;
                        const isDraft = voucher.status === 'draft';

                        return (
                          <motion.tr
                            key={voucher.id}
                            variants={staggerItem}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="group border-b transition-colors hover:bg-muted/30 last:border-b-0"
                            layout
                          >
                            <TableCell className="font-mono text-sm font-medium whitespace-nowrap">
                              {voucher.voucherNo}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`gap-1 text-xs font-medium ${typeCfg.badgeClass}`}
                              >
                                <TypeIcon className="h-3 w-3" />
                                {typeCfg.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-sm font-medium">
                              {voucher.title || '—'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {voucher.payeeName || '—'}
                            </TableCell>
                            <TableCell className="text-right text-sm font-semibold whitespace-nowrap">
                              {formatCurrency(voucher.amount)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {formatDate(voucher.date)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`gap-1 text-xs font-medium ${statusCfg.badgeClass}`}
                              >
                                {statusCfg.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {/* View */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="View voucher"
                                  onClick={() => openViewDialog(voucher)}
                                >
                                  <Eye className="h-4 w-4 text-slate-500" />
                                </Button>

                                {/* Edit (only draft) */}
                                {isDraft && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title="Edit voucher"
                                    onClick={() => openEditDialog(voucher)}
                                  >
                                    <Pencil className="h-4 w-4 text-sky-500" />
                                  </Button>
                                )}

                                {/* Approve (only draft) */}
                                {isDraft && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title="Approve voucher"
                                    onClick={() => handleApproveVoucher(voucher)}
                                  >
                                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                                  </Button>
                                )}

                                {/* Cancel (draft or approved) */}
                                {voucher.status !== 'cancelled' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title="Cancel voucher"
                                    onClick={() => openCancelDialog(voucher)}
                                  >
                                    <XCircle className="h-4 w-4 text-red-500" />
                                  </Button>
                                )}

                                {/* Delete (only draft) */}
                                {isDraft && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title="Delete voucher"
                                    onClick={() => openDeleteDialog(voucher)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </motion.div>

        {/* ─── Create / Edit Dialog ─────────────────────────────────────────────── */}
        <AnimatePresence>
          {(showCreateDialog) && (
            <Dialog open={showCreateDialog} onOpenChange={(open) => {
              if (!open) {
                setShowCreateDialog(false);
                setEditingVoucher(null);
                setFormErrors({});
              }
            }}>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <Pencil className="h-5 w-5" />
                        Edit Voucher
                      </>
                    ) : (
                      <>
                        <Plus className="h-5 w-5" />
                        Create Voucher
                      </>
                    )}
                  </DialogTitle>
                  <DialogDescription>
                    {isEditing
                      ? 'Update the voucher details below. The voucher number cannot be changed.'
                      : 'Fill in the details below to create a new voucher. The voucher number will be auto-generated.'}
                  </DialogDescription>
                </DialogHeader>

                {/* Auto-generated voucher number (only for edit) */}
                {isEditing && editingVoucher && (
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Voucher Number
                    </Label>
                    <p className="mt-1 font-mono text-sm font-semibold">
                      {editingVoucher.voucherNo}
                    </p>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Type */}
                  <div className="space-y-2">
                    <Label htmlFor="voucher-type">
                      Type <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={form.type}
                      onValueChange={(v) => updateForm('type', v)}
                      disabled={!!editingVoucher}
                    >
                      <SelectTrigger id="voucher-type" className={formErrors.type ? 'border-red-400' : ''}>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="payment">
                          <span className="flex items-center gap-2">
                            <CreditCard className="h-3.5 w-3.5 text-amber-600" />
                            Payment
                          </span>
                        </SelectItem>
                        <SelectItem value="receipt">
                          <span className="flex items-center gap-2">
                            <Receipt className="h-3.5 w-3.5 text-emerald-600" />
                            Receipt
                          </span>
                        </SelectItem>
                        <SelectItem value="credit_note">
                          <span className="flex items-center gap-2">
                            <FileCheck className="h-3.5 w-3.5 text-sky-600" />
                            Credit Note
                          </span>
                        </SelectItem>
                        <SelectItem value="debit_note">
                          <span className="flex items-center gap-2">
                            <ArrowRightLeft className="h-3.5 w-3.5 text-rose-600" />
                            Debit Note
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {formErrors.type && (
                      <p className="text-xs text-red-500">{formErrors.type}</p>
                    )}
                  </div>

                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="voucher-title">
                      Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="voucher-title"
                      placeholder="Voucher title"
                      value={form.title}
                      onChange={(e) => updateForm('title', e.target.value)}
                      className={formErrors.title ? 'border-red-400' : ''}
                    />
                    {formErrors.title && (
                      <p className="text-xs text-red-500">{formErrors.title}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="voucher-desc">Description</Label>
                    <Input
                      id="voucher-desc"
                      placeholder="Brief description"
                      value={form.description}
                      onChange={(e) => updateForm('description', e.target.value)}
                    />
                  </div>

                  {/* Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="voucher-amount">
                      Amount (NGN) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="voucher-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={form.amount}
                      onChange={(e) => updateForm('amount', e.target.value)}
                      className={formErrors.amount ? 'border-red-400' : ''}
                    />
                    {formErrors.amount && (
                      <p className="text-xs text-red-500">{formErrors.amount}</p>
                    )}
                  </div>

                  {/* Date */}
                  <div className="space-y-2">
                    <Label htmlFor="voucher-date">
                      Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="voucher-date"
                      type="date"
                      value={form.date}
                      onChange={(e) => updateForm('date', e.target.value)}
                      className={formErrors.date ? 'border-red-400' : ''}
                    />
                    {formErrors.date && (
                      <p className="text-xs text-red-500">{formErrors.date}</p>
                    )}
                  </div>

                  {/* Payee Name */}
                  <div className="space-y-2">
                    <Label htmlFor="voucher-payee">
                      Payee Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="voucher-payee"
                      placeholder="Who is this for?"
                      value={form.payeeName}
                      onChange={(e) => updateForm('payeeName', e.target.value)}
                      className={formErrors.payeeName ? 'border-red-400' : ''}
                    />
                    {formErrors.payeeName && (
                      <p className="text-xs text-red-500">{formErrors.payeeName}</p>
                    )}
                  </div>

                  {/* Payee Details */}
                  <div className="space-y-2">
                    <Label htmlFor="voucher-payee-details">Payee Details</Label>
                    <Input
                      id="voucher-payee-details"
                      placeholder="Account, address, etc."
                      value={form.payeeDetails}
                      onChange={(e) => updateForm('payeeDetails', e.target.value)}
                    />
                  </div>

                  {/* Particulars */}
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="voucher-particulars">Particulars</Label>
                    <Textarea
                      id="voucher-particulars"
                      placeholder="Describe the items or services for this voucher..."
                      rows={3}
                      value={form.particulars}
                      onChange={(e) => updateForm('particulars', e.target.value)}
                    />
                  </div>

                  {/* Authorized By */}
                  <div className="space-y-2">
                    <Label htmlFor="voucher-auth">Authorized By</Label>
                    <Input
                      id="voucher-auth"
                      placeholder="Authorizing officer name"
                      value={form.authorizedBy}
                      onChange={(e) => updateForm('authorizedBy', e.target.value)}
                    />
                  </div>

                  {/* Term & Session */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="voucher-term">Term</Label>
                      <Input
                        id="voucher-term"
                        placeholder="e.g. First Term"
                        value={form.term}
                        onChange={(e) => updateForm('term', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="voucher-session">Session</Label>
                      <Input
                        id="voucher-session"
                        placeholder="e.g. 2024/2025"
                        value={form.session}
                        onChange={(e) => updateForm('session', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter className="gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateDialog(false);
                      setEditingVoucher(null);
                      setFormErrors({});
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={isEditing ? handleUpdateVoucher : handleCreateVoucher}
                    disabled={saving}
                    className="gap-2"
                  >
                    {saving ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        {isEditing ? 'Updating...' : 'Creating...'}
                      </>
                    ) : isEditing ? (
                      <>
                        <Pencil className="h-4 w-4" />
                        Update Voucher
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Create Voucher
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </AnimatePresence>

        {/* ─── View / Print Dialog ─────────────────────────────────────────────── */}
        <AnimatePresence>
          {showViewDialog && selectedVoucher && (
            <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Voucher Receipt
                  </DialogTitle>
                  <DialogDescription>
                    View and print the approved voucher
                  </DialogDescription>
                </DialogHeader>

                {/* Printable Voucher */}
                <div
                  ref={printRef}
                  className="rounded-lg border bg-white p-8"
                >
                  {/* Header */}
                  <div className="mb-8 border-b-4 border-double pb-6 text-center">
                    <h2 className="text-xl font-bold tracking-wider uppercase">
                      {schoolName}
                    </h2>
                    {tenant?.motto && (
                      <p className="mt-1 text-xs text-gray-500">{tenant.motto}</p>
                    )}
                    {tenant?.address && (
                      <p className="mt-0.5 text-xs text-gray-400">
                        {tenant.address}
                        {tenant?.phone ? ` | ${tenant.phone}` : ''}
                      </p>
                    )}
                    <p className="mt-4 text-base font-semibold tracking-widest uppercase">
                      {TYPE_CONFIG[selectedVoucher.type].label} Voucher
                    </p>
                  </div>

                  {/* Meta row */}
                  <div className="mb-6 flex flex-col justify-between gap-2 text-sm sm:flex-row">
                    <div>
                      <span className="text-gray-500">Voucher No: </span>
                      <span className="font-semibold font-mono">
                        {selectedVoucher.voucherNo}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Date: </span>
                      <span className="font-medium">
                        {formatDate(selectedVoucher.date)}
                      </span>
                    </div>
                    {selectedVoucher.term && (
                      <div>
                        <span className="text-gray-500">Term: </span>
                        <span className="font-medium">{selectedVoucher.term}</span>
                      </div>
                    )}
                    {selectedVoucher.session && (
                      <div>
                        <span className="text-gray-500">Session: </span>
                        <span className="font-medium">{selectedVoucher.session}</span>
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <div className="mb-6">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                      Description
                    </p>
                    <p className="mt-1 text-base font-semibold">
                      {selectedVoucher.title || selectedVoucher.description || '—'}
                    </p>
                  </div>

                  <Separator className="my-4" />

                  {/* Payee Details */}
                  <div className="mb-6">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
                      Payee Information
                    </p>
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <span className="text-xs text-gray-500">Name: </span>
                          <span className="text-sm font-medium">
                            {selectedVoucher.payeeName || '—'}
                          </span>
                        </div>
                        {selectedVoucher.payeeDetails && (
                          <div>
                            <span className="text-xs text-gray-500">Details: </span>
                            <span className="text-sm">{selectedVoucher.payeeDetails}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Particulars */}
                  {selectedVoucher.particulars && (
                    <div className="mb-6">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
                        Particulars
                      </p>
                      <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {selectedVoucher.particulars}
                        </p>
                      </div>
                    </div>
                  )}

                  <Separator className="my-4" />

                  {/* Amount Section */}
                  <div className="mb-8 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-md border-2 border-gray-800 p-4">
                      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                        Amount in Words
                      </p>
                      <p className="mt-2 text-sm font-semibold capitalize">
                        {numberToWords(selectedVoucher.amount)}
                      </p>
                    </div>
                    <div className="rounded-md border-2 border-gray-800 p-4 text-right">
                      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                        Amount in Figures
                      </p>
                      <p className="mt-2 text-2xl font-bold">
                        {formatCurrency(selectedVoucher.amount)}
                      </p>
                    </div>
                  </div>

                  {/* Signature */}
                  <div className="flex justify-end">
                    <div className="w-48 text-center">
                      <div className="mb-1 border-t-2 border-gray-800 pt-2">
                        <p className="text-sm font-semibold">
                          {selectedVoucher.authorizedBy || '___________________'}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          Authorized Signatory
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Status watermark for cancelled */}
                  {selectedVoucher.status === 'cancelled' && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="rotate-[-25deg] rounded-lg border-4 border-red-400 bg-red-100/80 px-8 py-4">
                        <p className="text-3xl font-black uppercase tracking-wider text-red-600">
                          Cancelled
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowViewDialog(false)}
                  >
                    Close
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handlePrint}
                    className="gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Print Voucher
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </AnimatePresence>

        {/* ─── Cancel Confirmation Dialog ──────────────────────────────────────── */}
        <AlertDialog
          open={showCancelDialog}
          onOpenChange={(open) => {
            if (!open) {
              setShowCancelDialog(false);
              setSelectedVoucher(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Cancel Voucher
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel voucher{' '}
                <span className="font-semibold">
                  {selectedVoucher?.voucherNo}
                </span>
                ? This action marks the voucher as cancelled and it cannot be
                restored. The amount is{' '}
                <span className="font-semibold">
                  {selectedVoucher ? formatCurrency(selectedVoucher.amount) : ''}
                </span>
                .
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Voucher</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancelVoucher}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Yes, Cancel Voucher
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ─── Delete Confirmation Dialog ──────────────────────────────────────── */}
        <AlertDialog
          open={showDeleteDialog}
          onOpenChange={(open) => {
            if (!open) {
              setShowDeleteDialog(false);
              setSelectedVoucher(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-500" />
                Delete Voucher
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to permanently delete voucher{' '}
                <span className="font-semibold">
                  {selectedVoucher?.voucherNo}
                </span>
                ? This action cannot be undone. Only draft vouchers can be deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Voucher</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteVoucher}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Yes, Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
