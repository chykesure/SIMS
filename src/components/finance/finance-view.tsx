'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  Receipt,
  CreditCard,
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  CircleDollarSign,
  Building,
  Loader2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ─── Helpers ───────────────────────────────────────────────────────

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: 'easeOut' },
};

// ─── Types ─────────────────────────────────────────────────────────

interface FeeType {
  id: string;
  name: string;
  description: string;
  amount: number;
  frequency: string;
  isActive: boolean;
  createdAt: string;
}

interface FeeAssignment {
  id: string;
  tenantId: string;
  feeTypeId: string;
  className: string;
  session: string;
  term: string;
  amount: number;
  dueDate: string;
  isActive: boolean;
  createdAt: string;
  feeType?: { id: string; name: string; frequency: string };
}

interface Payment {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  studentRegNo: string;
  feeTypeName: string;
  amount: number;
  method: string;
  reference: string;
  term: string;
  session: string;
  paidBy: string;
  note: string;
  status: string;
  receiptNo: string;
  createdAt: string;
  assignment?: { id: string; className: string; feeType?: { id: string; name: string } };
}

interface IncomeExpense {
  id: string;
  type: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  method: string;
  reference: string;
  paidTo: string;
  receivedFrom: string;
  term: string;
  session: string;
  createdAt: string;
}

interface FinanceSummary {
  session: string;
  term: string;
  income: { total: number; byCategory: Record<string, number>; transactionCount: number };
  expenses: { total: number; byCategory: Record<string, number>; transactionCount: number };
  netBalance: number;
  fees: {
    totalAssigned: number;
    totalCollected: number;
    totalOutstanding: number;
    totalRefunded: number;
  };
  payments: {
    totalTransactions: number;
    statusCounts: Record<string, number>;
    methodDistribution: Record<string, number>;
  };
}

interface ClassItem { id: string; title: string; }
interface StudentItem { id: string; regNo: string; fullname: string; class: string; }
interface SessionItem { id: string; sessionOne: string; sessionTwo: string; active: string; }

const TERM_OPTIONS = ['First Term', 'Second Term', 'Third Term'];
const CATEGORY_OPTIONS = [
  'salary', 'maintenance', 'supplies', 'utility',
  'transport', 'donation', 'rent', 'tax', 'other',
];
const METHOD_OPTIONS = ['cash', 'bank_transfer', 'pos', 'cheque', 'online'];
const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  pos: 'POS',
  cheque: 'Cheque',
  online: 'Online',
};

// ─── Skeleton Helpers ──────────────────────────────────────────────

function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <Skeleton className="mb-2 h-4 w-24" />
        <Skeleton className="h-8 w-36" />
      </CardContent>
    </Card>
  );
}

// ─── Empty State ───────────────────────────────────────────────────

function EmptyState({ icon: Icon, title, description, action }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted">
          <Icon className="size-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}

// ====================================================================
// MAIN COMPONENT
// ====================================================================

export function FinanceView() {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Shared data
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [assignments, setAssignments] = useState<FeeAssignment[]>([]);

  const refreshData = useCallback(async () => {
    try {
      const [classRes, sessRes, studRes, ftRes, assignRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/sessions'),
        fetch('/api/students'),
        fetch('/api/finance/fees'),
        fetch('/api/finance/assignments'),
      ]);
      if (classRes.ok) { const d = await classRes.json(); setClasses(Array.isArray(d) ? d : []); }
      if (sessRes.ok) { const d = await sessRes.json(); setSessions(Array.isArray(d) ? d : []); }
      if (studRes.ok) { const d = await studRes.json(); setStudents(Array.isArray(d) ? d : []); }
      if (ftRes.ok) { const d = await ftRes.json(); setFeeTypes(d.data ?? []); }
      if (assignRes.ok) { const d = await assignRes.json(); setAssignments(d.data ?? []); }
    } catch {
      // silent
    }
  }, []);

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      await refreshData();
    };
    fetchData();
  }, [refreshData]);

  const sessionLabel = (s: SessionItem) => `${s.sessionOne}/${s.sessionTwo}`;

  return (
    <motion.div {...fadeIn} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100">
            <Wallet className="size-5 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Finance</h1>
            <p className="text-sm text-muted-foreground">
              Manage fees, payments, income &amp; expenses
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full flex-wrap justify-start gap-1 bg-transparent p-0 h-auto">
          <TabsTrigger value="dashboard" className="gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <CircleDollarSign className="size-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="fee-types" className="gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <DollarSign className="size-4" /> Fee Types
          </TabsTrigger>
          <TabsTrigger value="assignments" className="gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Building className="size-4" /> Assignments
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Receipt className="size-4" /> Payments
          </TabsTrigger>
          <TabsTrigger value="income-expense" className="gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <CreditCard className="size-4" /> Income &amp; Expense
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab sessions={sessions} sessionLabel={sessionLabel} />
        </TabsContent>

        <TabsContent value="fee-types">
          <FeeTypesTab
            feeTypes={feeTypes}
            onRefresh={refreshData}
          />
        </TabsContent>

        <TabsContent value="assignments">
          <AssignmentsTab
            feeTypes={feeTypes}
            classes={classes}
            sessions={sessions}
            sessionLabel={sessionLabel}
            assignments={assignments}
            onRefresh={refreshData}
          />
        </TabsContent>

        <TabsContent value="payments">
          <PaymentsTab
            students={students}
            assignments={assignments}
            feeTypes={feeTypes}
            sessions={sessions}
            sessionLabel={sessionLabel}
            onRefresh={refreshData}
          />
        </TabsContent>

        <TabsContent value="income-expense">
          <IncomeExpenseTab
            sessions={sessions}
            sessionLabel={sessionLabel}
          />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

// ====================================================================
// TAB 5: DASHBOARD
// ====================================================================

function DashboardTab({ sessions, sessionLabel }: {
  sessions: SessionItem[];
  sessionLabel: (s: SessionItem) => string;
}) {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterSession, setFilterSession] = useState('all');
  const [filterTerm, setFilterTerm] = useState('all');

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterSession && filterSession !== 'all') {
        const s = sessions.find((x) => x.id === filterSession);
        if (s) params.set('session', `${s.sessionOne}/${s.sessionTwo}`);
      }
      if (filterTerm && filterTerm !== 'all') params.set('term', filterTerm);

      const res = await fetch(`/api/finance/summary?${params.toString()}`);
      if (res.ok) {
        const d = await res.json();
        setSummary(d.data);
      } else {
        toast.error('Failed to load financial summary');
      }
    } catch {
      toast.error('Network error loading summary');
    } finally {
      setLoading(false);
    }
  }, [filterSession, filterTerm, sessions]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const incomeByCat = summary?.income?.byCategory ?? {};
  const expenseByCat = summary?.expenses?.byCategory ?? {};
  const methodDist = summary?.payments?.methodDistribution ?? {};
  const maxIncomeCat = Math.max(1, ...Object.values(incomeByCat));
  const maxExpenseCat = Math.max(1, ...Object.values(expenseByCat));
  const maxMethodVal = Math.max(1, ...Object.values(methodDist));

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="size-4 text-muted-foreground" />
            <Select value={filterSession} onValueChange={setFilterSession}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Sessions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sessions</SelectItem>
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{sessionLabel(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterTerm} onValueChange={setFilterTerm}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Terms" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terms</SelectItem>
                {TERM_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <TrendingUp className="size-4 text-emerald-600" /> Total Income
              </div>
              <p className="text-xl font-bold text-emerald-700">{formatCurrency(summary.income.total)}</p>
              <p className="text-xs text-muted-foreground mt-1">{summary.income.transactionCount} transactions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <TrendingDown className="size-4 text-red-500" /> Total Expenses
              </div>
              <p className="text-xl font-bold text-red-600">{formatCurrency(summary.expenses.total)}</p>
              <p className="text-xs text-muted-foreground mt-1">{summary.expenses.transactionCount} transactions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Wallet className="size-4 text-slate-600" /> Net Balance
              </div>
              <p className={`text-xl font-bold ${summary.netBalance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {formatCurrency(summary.netBalance)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <DollarSign className="size-4 text-emerald-600" /> Fees Collected
              </div>
              <p className="text-xl font-bold">{formatCurrency(summary.fees.totalCollected)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <ArrowDownRight className="size-4 text-amber-500" /> Fees Outstanding
              </div>
              <p className="text-xl font-bold text-amber-600">{formatCurrency(summary.fees.totalOutstanding)}</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <EmptyState icon={CircleDollarSign} title="No financial data" description="Start by adding fee types and recording payments." />
      )}

      {summary && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Income Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowUpRight className="size-4 text-emerald-600" /> Income by Category
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(incomeByCat).length === 0 ? (
                <p className="text-sm text-muted-foreground">No income recorded.</p>
              ) : (
                Object.entries(incomeByCat)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, amt]) => (
                    <div key={cat} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="capitalize">{cat.replace(/_/g, ' ')}</span>
                        <span className="font-medium text-emerald-700">{formatCurrency(amt)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${(amt / maxIncomeCat) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>

          {/* Expense Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowDownRight className="size-4 text-red-500" /> Expenses by Category
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(expenseByCat).length === 0 ? (
                <p className="text-sm text-muted-foreground">No expenses recorded.</p>
              ) : (
                Object.entries(expenseByCat)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, amt]) => (
                    <div key={cat} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="capitalize">{cat.replace(/_/g, ' ')}</span>
                        <span className="font-medium text-red-600">{formatCurrency(amt)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-red-400 transition-all duration-500"
                          style={{ width: `${(amt / maxExpenseCat) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>

          {/* Payment Method Distribution */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="size-4 text-slate-600" /> Payment Method Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.entries(methodDist).length === 0 ? (
                <p className="text-sm text-muted-foreground">No payment data available.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(methodDist)
                    .sort(([, a], [, b]) => b - a)
                    .map(([method, amt]) => (
                      <div key={method} className="flex items-center gap-3 rounded-lg border p-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                          <CreditCard className="size-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{METHOD_LABELS[method] || method}</p>
                          <p className="text-sm font-semibold text-emerald-700">{formatCurrency(amt)}</p>
                        </div>
                        <div className="w-16 text-right">
                          <Badge variant="secondary" className="text-xs">
                            {summary.payments.totalTransactions > 0
                              ? `${Math.round((amt / Object.values(methodDist).reduce((a, b) => a + b, 0)) * 100)}%`
                              : '0%'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ====================================================================
// TAB 1: FEE TYPES
// ====================================================================

function FeeTypesTab({ feeTypes, onRefresh }: {
  feeTypes: FeeType[];
  onRefresh: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FeeType | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FeeType | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formFrequency, setFormFrequency] = useState('termly');
  const [formIsActive, setFormIsActive] = useState(true);

  const filtered = feeTypes.filter(
    (ft) =>
      ft.name.toLowerCase().includes(search.toLowerCase()) ||
      ft.description.toLowerCase().includes(search.toLowerCase()),
  );

  function openAdd() {
    setEditing(null);
    setFormName('');
    setFormDesc('');
    setFormAmount('');
    setFormFrequency('termly');
    setFormIsActive(true);
    setDialogOpen(true);
  }

  function openEdit(ft: FeeType) {
    setEditing(ft);
    setFormName(ft.name);
    setFormDesc(ft.description);
    setFormAmount(String(ft.amount));
    setFormFrequency(ft.frequency);
    setFormIsActive(ft.isActive);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('Fee type name is required');
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: formName.trim(),
        description: formDesc.trim(),
        amount: parseFloat(formAmount) || 0,
        frequency: formFrequency,
        isActive: formIsActive,
      };
      const url = editing ? `/api/finance/fees/${editing.id}` : '/api/finance/fees';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Operation failed');
        return;
      }
      toast.success(editing ? 'Fee type updated successfully' : 'Fee type created successfully');
      setDialogOpen(false);
      onRefresh();
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(ft: FeeType) {
    try {
      const res = await fetch(`/api/finance/fees/${ft.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !ft.isActive }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.message || 'Failed to toggle');
        return;
      }
      toast.success(`Fee type ${!ft.isActive ? 'activated' : 'deactivated'}`);
      onRefresh();
    } catch {
      toast.error('Network error');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/finance/fees/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to delete');
        return;
      }
      toast.success('Fee type deleted');
      setDeleteOpen(false);
      setDeleteTarget(null);
      onRefresh();
    } catch {
      toast.error('Network error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search fee types..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="size-4" /> Add Fee Type
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="No fee types"
              description="Create your first fee type to get started."
              action={
                <Button onClick={openAdd} className="gap-2">
                  <Plus className="size-4" /> Add Fee Type
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((ft) => (
                    <TableRow key={ft.id}>
                      <TableCell className="font-medium">{ft.name}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {ft.description || '—'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{formatCurrency(ft.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {ft.frequency}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={ft.isActive ? 'default' : 'secondary'}>
                          {ft.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(ft)} title="Edit">
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => handleToggle(ft)}
                            title={ft.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {ft.isActive ? (
                              <TrendingDown className="size-4 text-amber-500" />
                            ) : (
                              <TrendingUp className="size-4 text-emerald-500" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() => { setDeleteTarget(ft); setDeleteOpen(true); }}
                            title="Delete"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Fee Type' : 'Add Fee Type'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update the fee type details below.' : 'Create a new fee type for your school.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ft-name">Name <span className="text-destructive">*</span></Label>
              <Input id="ft-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Tuition Fee" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ft-desc">Description</Label>
              <Textarea id="ft-desc" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Optional description" rows={2} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ft-amount">Amount (NGN) <span className="text-destructive">*</span></Label>
                <Input id="ft-amount" type="number" min="0" step="0.01" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="0.00" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ft-freq">Frequency</Label>
                <Select value={formFrequency} onValueChange={setFormFrequency}>
                  <SelectTrigger id="ft-freq" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="termly">Termly</SelectItem>
                    <SelectItem value="session">Session</SelectItem>
                    <SelectItem value="once">Once</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="ft-active" checked={formIsActive} onCheckedChange={setFormIsActive} />
              <Label htmlFor="ft-active" className="cursor-pointer">Active</Label>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                {editing ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Fee Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{deleteTarget?.name}</span>?
              This action cannot be undone. Any existing assignments will prevent deletion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-white hover:bg-destructive/90">
              {deleting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ====================================================================
// TAB 2: FEE ASSIGNMENTS
// ====================================================================

function AssignmentsTab({ feeTypes, classes, sessions, sessionLabel, assignments, onRefresh }: {
  feeTypes: FeeType[];
  classes: ClassItem[];
  sessions: SessionItem[];
  sessionLabel: (s: SessionItem) => string;
  assignments: FeeAssignment[];
  onRefresh: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterClass, setFilterClass] = useState('all');
  const [filterSession, setFilterSession] = useState('all');
  const [filterTerm, setFilterTerm] = useState('all');

  // Form
  const [formFeeType, setFormFeeType] = useState('');
  const [formClass, setFormClass] = useState('all');
  const [formSession, setFormSession] = useState('');
  const [formTerm, setFormTerm] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDueDate, setFormDueDate] = useState('');

  const selectedFeeType = feeTypes.find((ft) => ft.id === formFeeType);

  const filtered = assignments.filter((a) => {
    if (filterClass !== 'all' && a.className !== filterClass) return false;
    if (filterSession !== 'all' && a.session !== filterSession) return false;
    if (filterTerm !== 'all' && a.term !== filterTerm) return false;
    return true;
  });

  function openAdd() {
    setFormFeeType('');
    setFormClass('all');
    setFormSession('');
    setFormTerm('');
    setFormAmount('');
    setFormDueDate('');
    setDialogOpen(true);
  }

  useEffect(() => {
    if (selectedFeeType && !formAmount) {
      setFormAmount(String(selectedFeeType.amount));
    }
  }, [selectedFeeType, formAmount]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formFeeType) { toast.error('Please select a fee type'); return; }
    if (!formSession) { toast.error('Please select a session'); return; }
    setSaving(true);
    try {
      const sess = sessions.find((s) => s.id === formSession);
      const res = await fetch('/api/finance/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feeTypeId: formFeeType,
          className: formClass,
          session: sess ? `${sess.sessionOne}/${sess.sessionTwo}` : '',
          term: formTerm,
          amount: parseFloat(formAmount) || 0,
          dueDate: formDueDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || 'Failed to create assignment'); return; }
      toast.success('Fee assigned successfully');
      setDialogOpen(false);
      onRefresh();
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters + Add */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Classes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.title}>{c.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterSession} onValueChange={setFilterSession}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Sessions" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sessions</SelectItem>
              {sessions.map((s) => (
                <SelectItem key={s.id} value={`${s.sessionOne}/${s.sessionTwo}`}>{sessionLabel(s)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTerm} onValueChange={setFilterTerm}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Terms" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Terms</SelectItem>
              {TERM_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="size-4" /> Assign Fee
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Building}
              title="No fee assignments"
              description="Assign fees to classes to start collecting payments."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fee Type</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.feeType?.name || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{a.className === 'all' ? 'All Classes' : a.className}</Badge>
                      </TableCell>
                      <TableCell>{a.session}</TableCell>
                      <TableCell>{a.term || 'All Terms'}</TableCell>
                      <TableCell className="font-mono text-sm">{formatCurrency(a.amount)}</TableCell>
                      <TableCell>{a.dueDate || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={a.isActive ? 'default' : 'secondary'}>
                          {a.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Fee Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Fee</DialogTitle>
            <DialogDescription>Assign a fee type to a class for a specific session/term.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Fee Type <span className="text-destructive">*</span></Label>
              <Select value={formFeeType} onValueChange={(v) => { setFormFeeType(v); setFormAmount(''); }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select fee type" /></SelectTrigger>
                <SelectContent>
                  {feeTypes.filter((ft) => ft.isActive).map((ft) => (
                    <SelectItem key={ft.id} value={ft.id}>
                      {ft.name} — {formatCurrency(ft.amount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={formClass} onValueChange={setFormClass}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.title}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Session <span className="text-destructive">*</span></Label>
                <Select value={formSession} onValueChange={setFormSession}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select session" /></SelectTrigger>
                  <SelectContent>
                    {sessions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{sessionLabel(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Term</Label>
                <Select value={formTerm} onValueChange={setFormTerm}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select term" /></SelectTrigger>
                  <SelectContent>
                    {TERM_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount (NGN)</Label>
                <Input type="number" min="0" step="0.01" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                Assign Fee
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ====================================================================
// TAB 3: PAYMENTS
// ====================================================================

function PaymentsTab({ students, assignments, feeTypes, sessions, sessionLabel, onRefresh }: {
  students: StudentItem[];
  assignments: FeeAssignment[];
  feeTypes: FeeType[];
  sessions: SessionItem[];
  sessionLabel: (s: SessionItem) => string;
  onRefresh: () => void;
}) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterSession, setFilterSession] = useState('all');
  const [filterTerm, setFilterTerm] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Form
  const [formStudent, setFormStudent] = useState('');
  const [formAssignment, setFormAssignment] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formMethod, setFormMethod] = useState('cash');
  const [formReference, setFormReference] = useState('');
  const [formPaidBy, setFormPaidBy] = useState('');
  const [formNote, setFormNote] = useState('');

  const selectedStudent = students.find((s) => s.id === formStudent);
  const selectedAssignment = assignments.find((a) => a.id === formAssignment);

  const filtered = payments.filter((p) => {
    if (filterSession !== 'all' && p.session !== filterSession) return false;
    if (filterTerm !== 'all' && p.term !== filterTerm) return false;
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    return true;
  });

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/finance/payments');
      if (res.ok) {
        const d = await res.json();
        setPayments(d.data ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const filteredAssignments = selectedStudent
    ? assignments.filter((a) => a.className === 'all' || a.className === selectedStudent.class)
    : assignments;

  function openAdd() {
    setFormStudent('');
    setFormAssignment('');
    setFormAmount('');
    setFormMethod('cash');
    setFormReference('');
    setFormPaidBy('');
    setFormNote('');
    setDialogOpen(true);
  }

  useEffect(() => {
    if (selectedAssignment && !formAmount) {
      setFormAmount(String(selectedAssignment.amount));
    }
  }, [selectedAssignment, formAmount]);

  useEffect(() => {
    if (selectedStudent) {
      setFormAssignment('');
      setFormAmount('');
    }
  }, [selectedStudent]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formStudent) { toast.error('Please select a student'); return; }
    if (!formAssignment) { toast.error('Please select a fee assignment'); return; }
    if (!formAmount || parseFloat(formAmount) <= 0) { toast.error('Amount must be greater than zero'); return; }

    setSaving(true);
    try {
      const assign = assignments.find((a) => a.id === formAssignment);
      const student = students.find((s) => s.id === formStudent);
      const res = await fetch('/api/finance/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: formAssignment,
          studentId: student?.id,
          studentName: student?.fullname,
          studentRegNo: student?.regNo,
          feeTypeName: assign?.feeType?.name || '',
          amount: parseFloat(formAmount),
          method: formMethod,
          reference: formReference,
          term: assign?.term || '',
          session: assign?.session || '',
          paidBy: formPaidBy,
          note: formNote,
          status: 'completed',
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || 'Failed to record payment'); return; }
      toast.success('Payment recorded successfully');
      setDialogOpen(false);
      fetchPayments();
      onRefresh();
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters + Add */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <Select value={filterSession} onValueChange={setFilterSession}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Sessions" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sessions</SelectItem>
              {sessions.map((s) => (
                <SelectItem key={s.id} value={`${s.sessionOne}/${s.sessionTwo}`}>{sessionLabel(s)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTerm} onValueChange={setFilterTerm}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Terms" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Terms</SelectItem>
              {TERM_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="size-4" /> Record Payment
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton rows={5} cols={7} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No payments recorded"
              description="Record a payment against a fee assignment."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt No</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Reg No</TableHead>
                    <TableHead>Fee Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.receiptNo}</TableCell>
                      <TableCell className="font-medium">{p.studentName}</TableCell>
                      <TableCell className="text-muted-foreground">{p.studentRegNo || '—'}</TableCell>
                      <TableCell>{p.feeTypeName}</TableCell>
                      <TableCell className="font-mono text-sm">{formatCurrency(p.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{METHOD_LABELS[p.method] || p.method}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            p.status === 'completed'
                              ? 'default'
                              : p.status === 'partial'
                                ? 'secondary'
                                : 'outline'
                          }
                        >
                          {p.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Record Payment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Record a new fee payment from a student.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Student <span className="text-destructive">*</span></Label>
              <Select value={formStudent} onValueChange={setFormStudent}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.fullname} ({s.regNo}) — {s.class}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fee Assignment <span className="text-destructive">*</span></Label>
              <Select value={formAssignment} onValueChange={setFormAssignment} disabled={!selectedStudent}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={selectedStudent ? 'Select assignment' : 'Select a student first'} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {filteredAssignments.filter((a) => a.isActive).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.feeType?.name || 'Unknown'} — {a.className === 'all' ? 'All Classes' : a.className} — {a.session} {a.term}
                    </SelectItem>
                  ))}
                  {filteredAssignments.filter((a) => a.isActive).length === 0 && (
                    <SelectItem value="_none" disabled>No assignments available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Amount (NGN) <span className="text-destructive">*</span></Label>
                <Input type="number" min="0" step="0.01" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="0.00" required />
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={formMethod} onValueChange={setFormMethod}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {METHOD_OPTIONS.map((m) => (
                      <SelectItem key={m} value={m}>{METHOD_LABELS[m]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Reference</Label>
                <Input value={formReference} onChange={(e) => setFormReference(e.target.value)} placeholder="Transaction reference" />
              </div>
              <div className="space-y-2">
                <Label>Paid By</Label>
                <Input value={formPaidBy} onChange={(e) => setFormPaidBy(e.target.value)} placeholder="Name of payer" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea value={formNote} onChange={(e) => setFormNote(e.target.value)} placeholder="Optional note" rows={2} />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                Record Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ====================================================================
// TAB 4: INCOME & EXPENSE
// ====================================================================

function IncomeExpenseTab({ sessions, sessionLabel }: {
  sessions: SessionItem[];
  sessionLabel: (s: SessionItem) => string;
}) {
  const [entries, setEntries] = useState<IncomeExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Form
  const [formType, setFormType] = useState<'income' | 'expense'>('income');
  const [formCategory, setFormCategory] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formMethod, setFormMethod] = useState('cash');
  const [formPaidTo, setFormPaidTo] = useState('');
  const [formReceivedFrom, setFormReceivedFrom] = useState('');
  const [formReference, setFormReference] = useState('');

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== 'all') params.set('type', filterType);
      if (filterCategory !== 'all') params.set('category', filterCategory);
      if (filterStartDate) params.set('startDate', filterStartDate);
      if (filterEndDate) params.set('endDate', filterEndDate);

      const res = await fetch(`/api/finance/income-expense?${params.toString()}`);
      if (res.ok) {
        const d = await res.json();
        setEntries(d.data ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [filterType, filterCategory, filterStartDate, filterEndDate]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Summary calculations
  const totalIncome = entries.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const totalExpenses = entries.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const netBalance = totalIncome - totalExpenses;

  function openAdd() {
    setFormType('income');
    setFormCategory('');
    setFormDescription('');
    setFormAmount('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormMethod('cash');
    setFormPaidTo('');
    setFormReceivedFrom('');
    setFormReference('');
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formCategory) { toast.error('Please select a category'); return; }
    if (!formAmount || parseFloat(formAmount) <= 0) { toast.error('Amount must be greater than zero'); return; }
    if (!formDate) { toast.error('Date is required'); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/finance/income-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formType,
          category: formCategory,
          description: formDescription,
          amount: parseFloat(formAmount),
          date: formDate,
          method: formMethod,
          paidTo: formType === 'expense' ? formPaidTo : '',
          receivedFrom: formType === 'income' ? formReceivedFrom : '',
          reference: formReference,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || 'Failed to record entry'); return; }
      toast.success(`${formType === 'income' ? 'Income' : 'Expense'} recorded successfully`);
      setDialogOpen(false);
      fetchEntries();
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  }

  function handleResetFilters() {
    setFilterType('all');
    setFilterCategory('all');
    setFilterStartDate('');
    setFilterEndDate('');
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <ArrowUpRight className="size-4 text-emerald-600" /> Total Income
            </div>
            <p className="text-xl font-bold text-emerald-700">{formatCurrency(totalIncome)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <ArrowDownRight className="size-4 text-red-500" /> Total Expenses
            </div>
            <p className="text-xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Wallet className="size-4" /> Net Balance
            </div>
            <p className={`text-xl font-bold ${netBalance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {formatCurrency(netBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Add */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="size-4 text-muted-foreground mt-2" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORY_OPTIONS.map((c) => (
                <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
            className="w-[150px]"
            placeholder="Start date"
          />
          <Input
            type="date"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
            className="w-[150px]"
            placeholder="End date"
          />
          <Button variant="ghost" size="sm" onClick={handleResetFilters}>Reset</Button>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="size-4" /> Add Entry
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton rows={5} cols={6} />
          ) : entries.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No income or expense entries"
              description="Start tracking your school finances by adding an entry."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <Badge variant={e.type === 'income' ? 'default' : 'destructive'} className="capitalize">
                          {e.type === 'income' ? (
                            <span className="flex items-center gap-1"><ArrowUpRight className="size-3" /> Income</span>
                          ) : (
                            <span className="flex items-center gap-1"><ArrowDownRight className="size-3" /> Expense</span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{e.category.replace(/_/g, ' ')}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {e.description || '—'}
                      </TableCell>
                      <TableCell className={`font-mono text-sm font-medium ${e.type === 'income' ? 'text-emerald-700' : 'text-red-600'}`}>
                        {e.type === 'income' ? '+' : '-'}{formatCurrency(e.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{e.date || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{METHOD_LABELS[e.method] || e.method}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{e.reference || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Entry Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Income / Expense</DialogTitle>
            <DialogDescription>Record a new financial transaction.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type Toggle */}
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formType === 'income' ? 'default' : 'outline'}
                  className={formType === 'income' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                  onClick={() => setFormType('income')}
                >
                  <ArrowUpRight className="mr-1 size-4" /> Income
                </Button>
                <Button
                  type="button"
                  variant={formType === 'expense' ? 'default' : 'outline'}
                  className={formType === 'expense' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
                  onClick={() => setFormType('expense')}
                >
                  <ArrowDownRight className="mr-1 size-4" /> Expense
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category <span className="text-destructive">*</span></Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount (NGN) <span className="text-destructive">*</span></Label>
                <Input type="number" min="0" step="0.01" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="0.00" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="What is this for?" rows={2} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={formMethod} onValueChange={setFormMethod}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {METHOD_OPTIONS.map((m) => (
                      <SelectItem key={m} value={m}>{METHOD_LABELS[m]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{formType === 'income' ? 'Received From' : 'Paid To'}</Label>
              <Input
                value={formType === 'income' ? formReceivedFrom : formPaidTo}
                onChange={(e) => {
                  if (formType === 'income') setFormReceivedFrom(e.target.value);
                  else setFormPaidTo(e.target.value);
                }}
                placeholder={formType === 'income' ? 'Who paid?' : 'Who received payment?'}
              />
            </div>

            <div className="space-y-2">
              <Label>Reference</Label>
              <Input value={formReference} onChange={(e) => setFormReference(e.target.value)} placeholder="Transaction reference" />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
              <Button
                type="submit"
                disabled={saving}
                className={formType === 'income' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
              >
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                {formType === 'income' ? 'Record Income' : 'Record Expense'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
