'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  PiggyBank,
  Plus,
  Pencil,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  ArrowLeft,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  DollarSign,
  Target,
  FileText,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
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
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BudgetEntry {
  id: string;
  tenantId: string;
  budgetId: string;
  category: string;
  description: string;
  allocated: number;
  spent: number;
  createdAt: string;
  updatedAt: string;
}

interface Budget {
  id: string;
  tenantId: string;
  title: string;
  session: string;
  term: string;
  totalBudget: number;
  totalSpent: number;
  status: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  entries: BudgetEntry[];
}

interface Session {
  id: string;
  tenantId: string;
  sessionOne: string;
  sessionTwo: string;
  active: string;
}

interface SummaryData {
  totals: {
    totalBudgets: number;
    totalAllocated: number;
    totalSpent: number;
    remainingBalance: number;
    utilizationPercent: number;
  };
  categoryBreakdown: Array<{
    category: string;
    allocated: number;
    spent: number;
    remaining: number;
    variance: number;
    utilizationPercent: number;
    overBudget: boolean;
    overAmount: number;
  }>;
  alerts: {
    count: number;
    criticalCount: number;
    warningCount: number;
    infoCount: number;
    items: Array<{
      type: string;
      severity: string;
      message: string;
      budgetId: string;
      budgetTitle: string;
      category?: string;
      allocated: number;
      spent: number;
      variance: number;
    }>;
  };
}

interface LineItem {
  category: string;
  description: string;
  allocated: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BUDGET_CATEGORIES = [
  'salary',
  'maintenance',
  'supplies',
  'utility',
  'transport',
  'feeding',
  'books',
  'equipment',
  'rent',
  'tax',
  'insurance',
  'miscellaneous',
] as const;

const TERMS = [
  { value: 'First Term', label: 'First Term' },
  { value: 'Second Term', label: 'Second Term' },
  { value: 'Third Term', label: 'Third Term' },
  { value: 'Full Session', label: 'Full Session' },
] as const;

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  approved: { label: 'Approved', className: 'bg-sky-100 text-sky-700 border-sky-200' },
  active: { label: 'Active', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  closed: { label: 'Closed', className: 'bg-slate-100 text-slate-500 border-slate-200' },
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);

// ---------------------------------------------------------------------------
// Animation Variants
// ---------------------------------------------------------------------------

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.3, ease: 'easeOut' },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.05 } },
};

// ---------------------------------------------------------------------------
// Helper Components
// ---------------------------------------------------------------------------

function UtilizationBar({ percent, className = '' }: { percent: number; className?: string }) {
  const clampedPercent = Math.min(Math.max(percent, 0), 100);
  const barColor =
    clampedPercent > 90
      ? '[&_[data-slot=progress-indicator]]:bg-red-500'
      : clampedPercent > 70
        ? '[&_[data-slot=progress-indicator]]:bg-amber-500'
        : '[&_[data-slot=progress-indicator]]:bg-emerald-500';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Progress value={clampedPercent} className={`h-2 flex-1 ${barColor}`} />
      <span className="text-xs font-medium text-muted-foreground w-10 text-right">
        {percent.toFixed(1)}%
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <Badge variant="outline" className={`${config.className} capitalize text-xs`}>
      {config.label}
    </Badge>
  );
}

function EntryStatusBadge({ allocated, spent }: { allocated: number; spent: number }) {
  const util = allocated > 0 ? (spent / allocated) * 100 : 0;
  if (spent > allocated) {
    return (
      <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 text-xs">
        Over Budget
      </Badge>
    );
  }
  if (util >= 90) {
    return (
      <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
        Warning
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
      On Track
    </Badge>
  );
}

function TableSkeleton({ rows = 5, cols = 8 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
      <div className="flex justify-center pt-2">
        <Skeleton className="h-8 w-48" />
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function BudgetView() {
  const [activeTab, setActiveTab] = useState('budgets');
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);

  // Data states
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);

  // Loading states
  const [budgetsLoading, setBudgetsLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  // Filters
  const [filterSession, setFilterSession] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editBudgetDialogOpen, setEditBudgetDialogOpen] = useState(false);
  const [addEntryDialogOpen, setAddEntryDialogOpen] = useState(false);
  const [editEntryDialogOpen, setEditEntryDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteEntryDialogOpen, setDeleteEntryDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);

  // Form states — Create budget
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    session: '',
    term: '',
    status: 'draft',
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { category: '', description: '', allocated: '' },
  ]);

  // Form states — Edit budget
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    status: '',
  });

  // Form states — Add entry
  const [addEntryForm, setAddEntryForm] = useState({
    category: '',
    description: '',
    allocated: '',
  });

  // Form states — Edit entry
  const [editEntryForm, setEditEntryForm] = useState({
    allocated: '',
    spent: '',
    description: '',
  });
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  // IDs for destructive operations
  const [deletingBudgetId, setDeletingBudgetId] = useState<string | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  // Action loading
  const [actionLoading, setActionLoading] = useState(false);

  // =========================================================================
  // Data Fetching
  // =========================================================================

  const fetchBudgets = useCallback(async () => {
    setBudgetsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterSession && filterSession !== 'all') params.set('session', filterSession);
      if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus);
      const res = await fetch(`/api/budgets?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) setBudgets(json.data || []);
      } else {
        toast.error('Failed to fetch budgets');
      }
    } catch {
      toast.error('Network error while fetching budgets');
    } finally {
      setBudgetsLoading(false);
    }
  }, [filterSession, filterStatus]);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(Array.isArray(data) ? data : []);
      }
    } catch {
      // silent
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch('/api/budgets/summary');
      if (res.ok) {
        const json = await res.json();
        if (json.success) setSummary(json.data);
      } else {
        toast.error('Failed to fetch budget summary');
      }
    } catch {
      toast.error('Network error while fetching summary');
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchBudgetDetail = useCallback(async (budgetId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/budgets/${budgetId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setSelectedBudget(json.data);
        }
      } else {
        toast.error('Failed to fetch budget details');
      }
    } catch {
      toast.error('Network error while fetching budget');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    if (activeTab === 'summary' && !summary) {
      fetchSummary();
    }
  }, [activeTab, summary, fetchSummary]);

  // =========================================================================
  // Handlers
  // =========================================================================

  const handleViewBudget = (budgetId: string) => {
    setSelectedBudgetId(budgetId);
    fetchBudgetDetail(budgetId);
    setActiveTab('detail');
  };

  const handleBackToList = () => {
    setSelectedBudgetId(null);
    setSelectedBudget(null);
    setActiveTab('budgets');
    fetchBudgets();
  };

  // --- Create Budget ---
  const openCreateDialog = () => {
    setCreateForm({ title: '', description: '', session: '', term: '', status: 'draft' });
    setLineItems([{ category: '', description: '', allocated: '' }]);
    setCreateDialogOpen(true);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { category: '', description: '', allocated: '' }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const handleCreateBudget = async () => {
    if (!createForm.title.trim()) {
      toast.error('Budget title is required');
      return;
    }
    if (!createForm.session) {
      toast.error('Please select a session');
      return;
    }

    const validItems = lineItems.filter((item) => item.category && item.allocated);
    const entries = validItems.map((item) => ({
      category: item.category,
      description: item.description,
      allocated: parseFloat(item.allocated) || 0,
      spent: 0,
    }));

    setActionLoading(true);
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createForm,
          entries,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Budget created successfully');
        setCreateDialogOpen(false);
        fetchBudgets();
      } else {
        toast.error(json.message || 'Failed to create budget');
      }
    } catch {
      toast.error('Network error while creating budget');
    } finally {
      setActionLoading(false);
    }
  };

  // --- Edit Budget ---
  const openEditBudgetDialog = (budget: Budget) => {
    setEditForm({
      title: budget.title,
      description: budget.description,
      status: budget.status,
    });
    setCreateForm({
      title: budget.title,
      description: budget.description,
      session: budget.session,
      term: budget.term,
      status: budget.status,
    });
    setEditBudgetDialogOpen(true);
  };

  const handleEditBudget = async () => {
    if (!selectedBudget) return;
    if (!editForm.title.trim()) {
      toast.error('Budget title is required');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/budgets/${selectedBudget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description,
          status: editForm.status,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Budget updated successfully');
        setEditBudgetDialogOpen(false);
        fetchBudgetDetail(selectedBudget.id);
        fetchBudgets();
      } else {
        toast.error(json.message || 'Failed to update budget');
      }
    } catch {
      toast.error('Network error while updating budget');
    } finally {
      setActionLoading(false);
    }
  };

  // --- Delete Budget ---
  const openDeleteDialog = (budgetId: string) => {
    setDeletingBudgetId(budgetId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteBudget = async () => {
    if (!deletingBudgetId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/budgets/${deletingBudgetId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        toast.success('Budget deleted successfully');
        setDeleteDialogOpen(false);
        if (selectedBudgetId === deletingBudgetId) {
          handleBackToList();
        } else {
          fetchBudgets();
        }
      } else {
        toast.error(json.message || 'Failed to delete budget');
      }
    } catch {
      toast.error('Network error while deleting budget');
    } finally {
      setActionLoading(false);
      setDeletingBudgetId(null);
    }
  };

  // --- Approve Budget ---
  const handleApproveBudget = async () => {
    if (!selectedBudget) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/budgets/${selectedBudget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Budget approved successfully');
        setApproveDialogOpen(false);
        fetchBudgetDetail(selectedBudget.id);
      } else {
        toast.error(json.message || 'Failed to approve budget');
      }
    } catch {
      toast.error('Network error while approving budget');
    } finally {
      setActionLoading(false);
    }
  };

  // --- Close Budget ---
  const handleCloseBudget = async () => {
    if (!selectedBudget) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/budgets/${selectedBudget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Budget closed successfully');
        setCloseDialogOpen(false);
        fetchBudgetDetail(selectedBudget.id);
      } else {
        toast.error(json.message || 'Failed to close budget');
      }
    } catch {
      toast.error('Network error while closing budget');
    } finally {
      setActionLoading(false);
    }
  };

  // --- Add Entry ---
  const openAddEntryDialog = () => {
    setAddEntryForm({ category: '', description: '', allocated: '' });
    setAddEntryDialogOpen(true);
  };

  const handleAddEntry = async () => {
    if (!selectedBudget) return;
    if (!addEntryForm.category) {
      toast.error('Please select a category');
      return;
    }

    const newEntry = {
      category: addEntryForm.category,
      description: addEntryForm.description,
      allocated: parseFloat(addEntryForm.allocated) || 0,
      spent: 0,
    };

    // Add entry to existing entries and submit full list
    const existingEntries = selectedBudget.entries.map((e) => ({
      category: e.category,
      description: e.description,
      allocated: e.allocated,
      spent: e.spent,
    }));

    setActionLoading(true);
    try {
      const res = await fetch(`/api/budgets/${selectedBudget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: [...existingEntries, newEntry],
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Entry added successfully');
        setAddEntryDialogOpen(false);
        fetchBudgetDetail(selectedBudget.id);
      } else {
        toast.error(json.message || 'Failed to add entry');
      }
    } catch {
      toast.error('Network error while adding entry');
    } finally {
      setActionLoading(false);
    }
  };

  // --- Edit Entry ---
  const openEditEntryDialog = (entry: BudgetEntry) => {
    setEditingEntryId(entry.id);
    setEditEntryForm({
      allocated: String(entry.allocated),
      spent: String(entry.spent),
      description: entry.description,
    });
    setEditEntryDialogOpen(true);
  };

  const handleEditEntry = async () => {
    if (!selectedBudget || !editingEntryId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/budgets/entries/${editingEntryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allocated: parseFloat(editEntryForm.allocated) || 0,
          spent: parseFloat(editEntryForm.spent) || 0,
          description: editEntryForm.description,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Entry updated successfully');
        setEditEntryDialogOpen(false);
        fetchBudgetDetail(selectedBudget.id);
      } else {
        toast.error(json.message || 'Failed to update entry');
      }
    } catch {
      toast.error('Network error while updating entry');
    } finally {
      setActionLoading(false);
    }
  };

  // --- Delete Entry ---
  const openDeleteEntryDialog = (entryId: string) => {
    setDeletingEntryId(entryId);
    setDeleteEntryDialogOpen(true);
  };

  const handleDeleteEntry = async () => {
    if (!selectedBudget || !deletingEntryId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/budgets/entries/${deletingEntryId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Entry deleted successfully');
        setDeleteEntryDialogOpen(false);
        fetchBudgetDetail(selectedBudget.id);
      } else {
        toast.error(json.message || 'Failed to delete entry');
      }
    } catch {
      toast.error('Network error while deleting entry');
    } finally {
      setActionLoading(false);
      setDeletingEntryId(null);
    }
  };

  // =========================================================================
  // Computed values
  // =========================================================================

  const sessionLabel = (session: string) => {
    const found = sessions.find(
      (s) => `${s.sessionOne}/${s.sessionTwo}` === session
    );
    return found ? `${found.sessionOne}/${found.sessionTwo}` : session;
  };

  const getBudgetUtilization = (budget: Budget) =>
    budget.totalBudget > 0
      ? Math.round((budget.totalSpent / budget.totalBudget) * 10000) / 100
      : 0;

  const getEntryUtilization = (entry: BudgetEntry) =>
    entry.allocated > 0
      ? Math.round((entry.spent / entry.allocated) * 10000) / 100
      : 0;

  // =========================================================================
  // Tab: Budgets List
  // =========================================================================

  const renderBudgetsTab = () => (
    <motion.div {...fadeIn} key="budgets-tab">
      {/* Header + filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-2">
          <PiggyBank className="h-6 w-6 text-emerald-600" />
          <h2 className="text-xl font-semibold">Budget Management</h2>
        </div>
        <Button onClick={openCreateDialog} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Create Budget
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end mb-4">
        <div className="flex-1 min-w-[180px]">
          <Label className="text-xs text-muted-foreground mb-1 block">Session</Label>
          <Select value={filterSession} onValueChange={setFilterSession}>
            <SelectTrigger>
              <SelectValue placeholder="All Sessions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sessions</SelectItem>
              {sessions.map((s) => (
                <SelectItem key={s.id} value={`${s.sessionOne}/${s.sessionTwo}`}>
                  {s.sessionOne}/{s.sessionTwo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <Label className="text-xs text-muted-foreground mb-1 block">Status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {budgetsLoading ? (
        <TableSkeleton rows={6} cols={8} />
      ) : budgets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">No budgets found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Create your first budget to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Title</TableHead>
                    <TableHead className="min-w-[120px]">Session</TableHead>
                    <TableHead className="min-w-[100px]">Term</TableHead>
                    <TableHead className="min-w-[130px] text-right">Total Budget</TableHead>
                    <TableHead className="min-w-[130px] text-right">Total Spent</TableHead>
                    <TableHead className="min-w-[130px] text-right">Remaining</TableHead>
                    <TableHead className="min-w-[160px]">Utilization</TableHead>
                    <TableHead className="min-w-[90px]">Status</TableHead>
                    <TableHead className="min-w-[120px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgets.map((budget, idx) => {
                    const util = getBudgetUtilization(budget);
                    const remaining = budget.totalBudget - budget.totalSpent;
                    return (
                      <motion.tr
                        key={budget.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        <TableCell className="font-medium">{budget.title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {sessionLabel(budget.session)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {budget.term || '—'}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {formatCurrency(budget.totalBudget)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatCurrency(budget.totalSpent)}
                        </TableCell>
                        <TableCell
                          className={`text-right text-sm font-medium ${remaining < 0 ? 'text-red-600' : ''}`}
                        >
                          {formatCurrency(remaining)}
                        </TableCell>
                        <TableCell>
                          <UtilizationBar percent={util} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={budget.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleViewBudget(budget.id)}
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditBudgetDialog(budget)}
                              title="Edit budget"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {budget.status === 'draft' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-700"
                                onClick={() => openDeleteDialog(budget.id)}
                                title="Delete budget"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );

  // =========================================================================
  // Tab: Budget Detail
  // =========================================================================

  const renderDetailTab = () => {
    if (detailLoading || !selectedBudget) {
      return (
        <motion.div {...fadeIn} key="detail-loading">
          <div className="mb-6">
            <Skeleton className="h-8 w-32 mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          </div>
          <TableSkeleton rows={4} cols={7} />
        </motion.div>
      );
    }

    const budget = selectedBudget;
    const util = getBudgetUtilization(budget);
    const remaining = budget.totalBudget - budget.totalSpent;

    return (
      <motion.div {...fadeIn} key={`detail-${budget.id}`}>
        {/* Back button */}
        <Button
          variant="ghost"
          className="mb-4 gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={handleBackToList}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Budgets
        </Button>

        {/* Header */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <PiggyBank className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{budget.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {sessionLabel(budget.session)} &middot; {budget.term || 'Full Session'}
                </p>
              </div>
              <StatusBadge status={budget.status} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {budget.status === 'draft' && (
                <Button
                  variant="outline"
                  className="gap-1.5 text-sky-600 border-sky-200 hover:bg-sky-50"
                  onClick={() => setApproveDialogOpen(true)}
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve Budget
                </Button>
              )}
              {(budget.status === 'approved' || budget.status === 'active') && (
                <Button
                  variant="outline"
                  className="gap-1.5 text-slate-600 border-slate-200 hover:bg-slate-50"
                  onClick={() => setCloseDialogOpen(true)}
                >
                  <XCircle className="h-4 w-4" />
                  Close Budget
                </Button>
              )}
              {budget.status !== 'closed' && (
                <Button className="gap-1.5" onClick={openAddEntryDialog}>
                  <Plus className="h-4 w-4" />
                  Add Entry
                </Button>
              )}
            </div>
          </div>

          {budget.description && (
            <p className="text-sm text-muted-foreground">{budget.description}</p>
          )}
        </div>

        {/* Summary cards */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={fadeIn}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Budget</p>
                    <p className="text-lg font-semibold">{formatCurrency(budget.totalBudget)}</p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
                    <Target className="h-4 w-4 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={fadeIn}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Spent</p>
                    <p className="text-lg font-semibold">{formatCurrency(budget.totalSpent)}</p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
                    <TrendingDown className="h-4 w-4 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={fadeIn}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Remaining</p>
                    <p className={`text-lg font-semibold ${remaining < 0 ? 'text-red-600' : ''}`}>
                      {formatCurrency(remaining)}
                    </p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100">
                    <DollarSign className="h-4 w-4 text-sky-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={fadeIn}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Utilization</p>
                    <p className="text-lg font-semibold">{util.toFixed(1)}%</p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100">
                    <BarChart3 className="h-4 w-4 text-violet-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Utilization bar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Budget Utilization</span>
              <span
                className={`text-sm font-semibold ${
                  util > 90 ? 'text-red-600' : util > 70 ? 'text-amber-600' : 'text-emerald-600'
                }`}
              >
                {util.toFixed(1)}%
              </span>
            </div>
            <UtilizationBar percent={util} />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-muted-foreground">Spent: {formatCurrency(budget.totalSpent)}</span>
              <span className="text-xs text-muted-foreground">Budget: {formatCurrency(budget.totalBudget)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Entries table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Budget Entries ({budget.entries.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {budget.entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No entries yet</p>
                {budget.status !== 'closed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-1.5"
                    onClick={openAddEntryDialog}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add First Entry
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="min-w-[150px]">Description</TableHead>
                      <TableHead className="text-right min-w-[120px]">Allocated</TableHead>
                      <TableHead className="text-right min-w-[120px]">Spent</TableHead>
                      <TableHead className="text-right min-w-[120px]">Remaining</TableHead>
                      <TableHead className="min-w-[140px]">Utilization</TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                      <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {budget.entries.map((entry, idx) => {
                      const eUtil = getEntryUtilization(entry);
                      const eRemaining = entry.allocated - entry.spent;
                      return (
                        <motion.tr
                          key={entry.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <TableCell>
                            <span className="capitalize font-medium">{entry.category}</span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {entry.description || '—'}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {formatCurrency(entry.allocated)}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatCurrency(entry.spent)}
                          </TableCell>
                          <TableCell
                            className={`text-right text-sm font-medium ${eRemaining < 0 ? 'text-red-600' : ''}`}
                          >
                            {formatCurrency(eRemaining)}
                          </TableCell>
                          <TableCell>
                            <UtilizationBar percent={eUtil} />
                          </TableCell>
                          <TableCell>
                            <EntryStatusBadge allocated={entry.allocated} spent={entry.spent} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditEntryDialog(entry)}
                                title="Edit entry"
                                disabled={budget.status === 'closed'}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-700"
                                onClick={() => openDeleteEntryDialog(entry.id)}
                                title="Delete entry"
                                disabled={budget.status === 'closed'}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // =========================================================================
  // Tab: Summary / Dashboard
  // =========================================================================

  const renderSummaryTab = () => {
    if (summaryLoading || !summary) {
      return (
        <motion.div {...fadeIn} key="summary-loading">
          <div className="mb-6">
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          </div>
          <TableSkeleton rows={8} cols={6} />
        </motion.div>
      );
    }

    const { totals, categoryBreakdown, alerts } = summary;

    const summaryCards = [
      {
        label: 'Total Budgets',
        value: String(totals.totalBudgets),
        icon: FileText,
        color: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
      },
      {
        label: 'Total Allocated',
        value: formatCurrency(totals.totalAllocated),
        icon: Target,
        color: 'bg-sky-100',
        iconColor: 'text-sky-600',
      },
      {
        label: 'Total Spent',
        value: formatCurrency(totals.totalSpent),
        icon: TrendingDown,
        color: 'bg-amber-100',
        iconColor: 'text-amber-600',
      },
      {
        label: 'Remaining Balance',
        value: formatCurrency(totals.remainingBalance),
        icon: DollarSign,
        color: totals.remainingBalance >= 0 ? 'bg-emerald-100' : 'bg-red-100',
        iconColor: totals.remainingBalance >= 0 ? 'text-emerald-600' : 'text-red-600',
      },
      {
        label: 'Overall Utilization',
        value: `${totals.utilizationPercent.toFixed(1)}%`,
        icon: BarChart3,
        color: totals.utilizationPercent > 90 ? 'bg-red-100' : totals.utilizationPercent > 70 ? 'bg-amber-100' : 'bg-violet-100',
        iconColor: totals.utilizationPercent > 90 ? 'text-red-600' : totals.utilizationPercent > 70 ? 'text-amber-600' : 'text-violet-600',
      },
    ];

    return (
      <motion.div {...fadeIn} key="summary-tab">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <PieChart className="h-6 w-6 text-violet-600" />
            <h2 className="text-xl font-semibold">Budget Summary</h2>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={fetchSummary}>
            <TrendingUp className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <motion.div key={card.label} variants={fadeIn}>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground truncate">{card.label}</p>
                        <p className="text-lg font-semibold truncate">{card.value}</p>
                      </div>
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.color}`}>
                        <Icon className={`h-4 w-4 ${card.iconColor}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Overall utilization bar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Budget Utilization</span>
              <span
                className={`text-sm font-semibold ${
                  totals.utilizationPercent > 90
                    ? 'text-red-600'
                    : totals.utilizationPercent > 70
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                }`}
              >
                {totals.utilizationPercent.toFixed(1)}%
              </span>
            </div>
            <UtilizationBar percent={totals.utilizationPercent} />
          </CardContent>
        </Card>

        {/* Alerts Section */}
        {alerts.count > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Budget Alerts ({alerts.count})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Alert summary badges */}
              <div className="flex flex-wrap gap-2 mb-3">
                {alerts.criticalCount > 0 && (
                  <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
                    {alerts.criticalCount} Critical
                  </Badge>
                )}
                {alerts.warningCount > 0 && (
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
                    {alerts.warningCount} Warning
                  </Badge>
                )}
                {alerts.infoCount > 0 && (
                  <Badge variant="outline" className="bg-sky-100 text-sky-700 border-sky-200">
                    {alerts.infoCount} Info
                  </Badge>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2">
                {alerts.items.map((alert, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                  >
                    <Alert
                      variant={alert.severity === 'critical' ? 'destructive' : 'default'}
                      className={
                        alert.severity === 'warning'
                          ? 'border-amber-200 bg-amber-50'
                          : alert.severity === 'info'
                            ? 'border-sky-200 bg-sky-50'
                            : ''
                      }
                    >
                      <AlertTriangle
                        className={`h-4 w-4 ${
                          alert.severity === 'critical'
                            ? 'text-red-500'
                            : alert.severity === 'warning'
                              ? 'text-amber-500'
                              : 'text-sky-500'
                        }`}
                      />
                      <AlertTitle className="text-sm font-medium capitalize">
                        {alert.type.replace(/_/g, ' ')}
                      </AlertTitle>
                      <AlertDescription className="text-xs">
                        {alert.message}
                        <span className="text-muted-foreground ml-1">
                          (Budget: {alert.budgetTitle})
                        </span>
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Category Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {categoryBreakdown.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                  <PieChart className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No category data available</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Allocated</TableHead>
                      <TableHead className="text-right">Spent</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead className="min-w-[140px]">Utilization</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryBreakdown.map((cat, idx) => (
                      <motion.tr
                        key={cat.category}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        <TableCell>
                          <span className="capitalize font-medium">{cat.category}</span>
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {formatCurrency(cat.allocated)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatCurrency(cat.spent)}
                        </TableCell>
                        <TableCell
                          className={`text-right text-sm font-medium ${cat.remaining < 0 ? 'text-red-600' : ''}`}
                        >
                          {formatCurrency(cat.remaining)}
                        </TableCell>
                        <TableCell>
                          <UtilizationBar percent={cat.utilizationPercent} />
                        </TableCell>
                        <TableCell>
                          {cat.overBudget ? (
                            <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 text-xs">
                              Over Budget
                            </Badge>
                          ) : cat.utilizationPercent >= 90 ? (
                            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                              Nearly Exhausted
                            </Badge>
                          ) : cat.utilizationPercent >= 50 ? (
                            <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                              On Track
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-sky-100 text-sky-700 border-sky-200 text-xs">
                              Under-utilized
                            </Badge>
                          )}
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="budgets" className="gap-1.5">
              <PiggyBank className="h-4 w-4" />
              Budgets
            </TabsTrigger>
            <TabsTrigger value="detail" className="gap-1.5" disabled={!selectedBudgetId}>
              <Eye className="h-4 w-4" />
              Budget Detail
            </TabsTrigger>
            <TabsTrigger value="summary" className="gap-1.5">
              <BarChart3 className="h-4 w-4" />
              Summary
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            {activeTab === 'budgets' && <TabsContent value="budgets" className="mt-0">{renderBudgetsTab()}</TabsContent>}
            {activeTab === 'detail' && <TabsContent value="detail" className="mt-0">{renderDetailTab()}</TabsContent>}
            {activeTab === 'summary' && <TabsContent value="summary" className="mt-0">{renderSummaryTab()}</TabsContent>}
          </AnimatePresence>
        </Tabs>

        {/* ================================================================= */}
        {/* Dialogs                                                            */}
        {/* ================================================================= */}

        {/* Create Budget Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create Budget
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="create-title">Title *</Label>
                  <Input
                    id="create-title"
                    placeholder="e.g. 2024/2025 Annual Budget"
                    value={createForm.title}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, title: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-session">Session *</Label>
                  <Select
                    value={createForm.session}
                    onValueChange={(v) => setCreateForm({ ...createForm, session: v })}
                  >
                    <SelectTrigger id="create-session">
                      <SelectValue placeholder="Select session" />
                    </SelectTrigger>
                    <SelectContent>
                      {sessions.map((s) => (
                        <SelectItem key={s.id} value={`${s.sessionOne}/${s.sessionTwo}`}>
                          {s.sessionOne}/{s.sessionTwo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-term">Term</Label>
                  <Select
                    value={createForm.term}
                    onValueChange={(v) => setCreateForm({ ...createForm, term: v })}
                  >
                    <SelectTrigger id="create-term">
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                      {TERMS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="create-desc">Description</Label>
                  <Textarea
                    id="create-desc"
                    placeholder="Optional budget description"
                    value={createForm.description}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, description: e.target.value })
                    }
                    rows={2}
                  />
                </div>
              </div>

              <Separator />

              {/* Line Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Budget Line Items</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={addLineItem}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Item
                  </Button>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
                  {lineItems.map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-col sm:flex-row gap-2 p-3 rounded-lg border bg-muted/30"
                    >
                      <Select
                        value={item.category}
                        onValueChange={(v) => updateLineItem(idx, 'category', v)}
                      >
                        <SelectTrigger className="sm:w-[140px]">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          {BUDGET_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat} className="capitalize">
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={item.allocated}
                        onChange={(e) => updateLineItem(idx, 'allocated', e.target.value)}
                        className="sm:w-[140px]"
                        min={0}
                      />
                      {lineItems.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0 text-red-500 hover:text-red-700"
                          onClick={() => removeLineItem(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateBudget} disabled={actionLoading}>
                  {actionLoading ? 'Creating...' : 'Create Budget'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Budget Dialog */}
        <Dialog open={editBudgetDialogOpen} onOpenChange={setEditBudgetDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5" />
                Edit Budget
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-desc">Description</Label>
                <Textarea
                  id="edit-desc"
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(v) => setEditForm({ ...editForm, status: v })}
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setEditBudgetDialogOpen(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button onClick={handleEditBudget} disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Entry Dialog */}
        <Dialog open={addEntryDialogOpen} onOpenChange={setAddEntryDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Budget Entry
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="add-category">Category *</Label>
                <Select
                  value={addEntryForm.category}
                  onValueChange={(v) =>
                    setAddEntryForm({ ...addEntryForm, category: v })
                  }
                >
                  <SelectTrigger id="add-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUDGET_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="capitalize">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-desc">Description</Label>
                <Input
                  id="add-desc"
                  placeholder="Optional description"
                  value={addEntryForm.description}
                  onChange={(e) =>
                    setAddEntryForm({ ...addEntryForm, description: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-allocated">Allocated Amount</Label>
                <Input
                  id="add-allocated"
                  type="number"
                  placeholder="0.00"
                  value={addEntryForm.allocated}
                  onChange={(e) =>
                    setAddEntryForm({ ...addEntryForm, allocated: e.target.value })
                  }
                  min={0}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setAddEntryDialogOpen(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddEntry} disabled={actionLoading}>
                  {actionLoading ? 'Adding...' : 'Add Entry'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Entry Dialog */}
        <Dialog open={editEntryDialogOpen} onOpenChange={setEditEntryDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5" />
                Edit Entry
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="edit-e-desc">Description</Label>
                <Input
                  id="edit-e-desc"
                  value={editEntryForm.description}
                  onChange={(e) =>
                    setEditEntryForm({ ...editEntryForm, description: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-e-allocated">Allocated Amount</Label>
                <Input
                  id="edit-e-allocated"
                  type="number"
                  value={editEntryForm.allocated}
                  onChange={(e) =>
                    setEditEntryForm({ ...editEntryForm, allocated: e.target.value })
                  }
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-e-spent">Spent Amount</Label>
                <Input
                  id="edit-e-spent"
                  type="number"
                  value={editEntryForm.spent}
                  onChange={(e) =>
                    setEditEntryForm({ ...editEntryForm, spent: e.target.value })
                  }
                  min={0}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setEditEntryDialogOpen(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button onClick={handleEditEntry} disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Budget Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Budget</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this budget? This action cannot be
                undone and all associated entries will be permanently removed. Only
                draft budgets can be deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteBudget}
                disabled={actionLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                {actionLoading ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Entry Confirmation */}
        <AlertDialog open={deleteEntryDialogOpen} onOpenChange={setDeleteEntryDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Entry</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this budget entry? This action cannot
                be undone. The budget totals will be recalculated automatically.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteEntry}
                disabled={actionLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                {actionLoading ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Approve Budget Confirmation */}
        <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-sky-500" />
                Approve Budget
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will change the budget status from &quot;Draft&quot; to &quot;Approved&quot;.
                Approved budgets can be activated and have entries added to them.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleApproveBudget}
                disabled={actionLoading}
                className="bg-sky-600 hover:bg-sky-700"
              >
                {actionLoading ? 'Approving...' : 'Approve Budget'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Close Budget Confirmation */}
        <AlertDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-slate-500" />
                Close Budget
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will change the budget status to &quot;Closed&quot;. Closed budgets
                are read-only and no further entries can be added or modified. This
                action can be reversed by editing the budget status.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCloseBudget}
                disabled={actionLoading}
              >
                {actionLoading ? 'Closing...' : 'Close Budget'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
