"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  Search,
  Filter,
  AlertTriangle,
  Boxes,
  Warehouse,
  Tag,
  TrendingDown,
  BarChart3,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface InventoryItem {
  id: string;
  tenantId: string;
  name: string;
  category: string;
  description: string;
  unit: string;
  unitCost: number;
  quantity: number;
  reorderLevel: number;
  location: string;
  supplier: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface InventoryTransaction {
  id: string;
  tenantId: string;
  itemId: string;
  itemName: string;
  type: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  reason: string;
  reference: string;
  performedBy: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

interface InventorySummary {
  totalItems: number;
  totalValue: number;
  lowStockAlerts: number;
  lowStockItems: {
    id: string;
    name: string;
    category: string;
    quantity: number;
    reorderLevel: number;
    unit: string;
    location: string;
  }[];
  categoryBreakdown: {
    category: string;
    itemCount: number;
    totalQuantity: number;
    totalValue: number;
  }[];
  recentTransactions: {
    id: string;
    itemId: string;
    itemName: string;
    type: string;
    quantity: number;
    totalCost: number;
    reason: string;
    performedBy: string;
    date: string;
    createdAt: string;
  }[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CATEGORIES = [
  "stationery",
  "furniture",
  "lab_equipment",
  "sports",
  "cleaning",
  "books",
  "electronics",
  "food",
  "other",
] as const;

const UNITS = ["pcs", "pack", "box", "set", "ream"] as const;

const MOVEMENT_TYPES = ["stock_in", "stock_out", "adjustment"] as const;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(
    amount
  );

function formatCategory(cat: string) {
  return cat
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMovementType(type: string) {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getItemStatus(
  qty: number,
  reorderLevel: number,
  isActive: boolean
) {
  if (!isActive) return "inactive";
  if (qty === 0) return "out_of_stock";
  if (qty <= reorderLevel) return "low_stock";
  return "in_stock";
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "in_stock":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
          In Stock
        </Badge>
      );
    case "low_stock":
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
          Low Stock
        </Badge>
      );
    case "out_of_stock":
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
          Out of Stock
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="text-muted-foreground">
          Inactive
        </Badge>
      );
  }
}

function MovementTypeBadge({ type }: { type: string }) {
  switch (type) {
    case "stock_in":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 gap-1">
          <ArrowDownToLine className="h-3 w-3" />
          Stock In
        </Badge>
      );
    case "stock_out":
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 gap-1">
          <ArrowUpFromLine className="h-3 w-3" />
          Stock Out
        </Badge>
      );
    case "adjustment":
      return (
        <Badge className="bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-100 gap-1">
          <RefreshCw className="h-3 w-3" />
          Adjustment
        </Badge>
      );
    default:
      return <Badge variant="secondary">{type}</Badge>;
  }
}

/* ------------------------------------------------------------------ */
/*  Animation Variants                                                 */
/* ------------------------------------------------------------------ */

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.25 },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.2 },
};

/* ------------------------------------------------------------------ */
/*  Loading Skeletons                                                  */
/* ------------------------------------------------------------------ */

function ItemsTableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-60" />
      </div>
      <div className="rounded-lg border">
        <div className="border-b bg-muted/50 p-2">
          <div className="flex gap-4">
            {Array.from({ length: 11 }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-b p-2 last:border-b-0">
            <div className="flex gap-4">
              {Array.from({ length: 11 }).map((_, j) => (
                <Skeleton key={j} className="h-4 flex-1" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MovementsTableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="rounded-lg border">
        <div className="border-b bg-muted/50 p-2">
          <div className="flex gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-b p-2 last:border-b-0">
            <div className="flex gap-4">
              {Array.from({ length: 10 }).map((_, j) => (
                <Skeleton key={j} className="h-4 flex-1" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="mb-3 h-10 w-10 rounded-lg" />
              <Skeleton className="mb-1 h-4 w-24" />
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full rounded" />
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Item Form Dialog                                                   */
/* ------------------------------------------------------------------ */

function ItemFormDialog({
  open,
  onOpenChange,
  item,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  submitting: boolean;
}) {
  const isEdit = !!item;

  const [name, setName] = useState(item?.name ?? "");
  const [category, setCategory] = useState(item?.category ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [unit, setUnit] = useState(item?.unit ?? "pcs");
  const [unitCost, setUnitCost] = useState(item ? String(item.unitCost) : "");
  const [quantity, setQuantity] = useState(item ? String(item.quantity) : "");
  const [reorderLevel, setReorderLevel] = useState(item ? String(item.reorderLevel) : "5");
  const [location, setLocation] = useState(item?.location ?? "");
  const [supplier, setSupplier] = useState(item?.supplier ?? "");

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("Item name is required");
      return;
    }
    await onSubmit({
      name: name.trim(),
      category,
      description: description.trim(),
      unit,
      unitCost: parseFloat(unitCost) || 0,
      quantity: parseInt(quantity) || 0,
      reorderLevel: parseInt(reorderLevel) || 5,
      location: location.trim(),
      supplier: supplier.trim(),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? (
              <Pencil className="h-5 w-5 text-amber-600" />
            ) : (
              <Plus className="h-5 w-5 text-emerald-600" />
            )}
            {isEdit ? "Edit Item" : "Add New Item"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the inventory item details below."
              : "Fill in the details to add a new inventory item."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="item-name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="item-name"
                placeholder="e.g. A4 Exercise Book"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="item-category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="item-category" className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {formatCategory(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="item-desc">Description</Label>
            <Textarea
              id="item-desc"
              placeholder="Brief description of the item..."
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="item-unit">Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger id="item-unit" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="item-cost">Unit Cost (NGN)</Label>
              <Input
                id="item-cost"
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="item-qty">Initial Quantity</Label>
              <Input
                id="item-qty"
                type="number"
                min={0}
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={isEdit}
              />
              {isEdit && (
                <p className="text-xs text-muted-foreground">
                  Use Stock Movements to change quantity
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="item-reorder">Reorder Level</Label>
              <Input
                id="item-reorder"
                type="number"
                min={0}
                placeholder="5"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="item-location">Location</Label>
              <Input
                id="item-location"
                placeholder="e.g. Store Room A"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="item-supplier">Supplier</Label>
            <Input
              id="item-supplier"
              placeholder="e.g. ABC Supplies Ltd"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !name.trim()}>
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isEdit ? (
              <Pencil className="mr-2 h-4 w-4" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            {isEdit ? "Update Item" : "Add Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Movement Form Dialog                                               */
/* ------------------------------------------------------------------ */

function MovementFormDialog({
  open,
  onOpenChange,
  items,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: InventoryItem[];
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  submitting: boolean;
}) {
  const [itemId, setItemId] = useState("");
  const [type, setType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [performedBy, setPerformedBy] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const selectedItem = items.find((i) => i.id === itemId);
  const movementType = type as string;
  const isStockOut = movementType === "stock_out";
  const exceedsStock =
    isStockOut &&
    selectedItem &&
    parseInt(quantity || "0") > selectedItem.quantity;

  // Pre-fill unit cost from selected item when user picks an item and unitCost is empty
  const handleItemChange = (value: string) => {
    setItemId(value);
    const found = items.find((i) => i.id === value);
    if (found && !unitCost) {
      setUnitCost(String(found.unitCost));
    }
  };

  async function handleSubmit() {
    if (!itemId) {
      toast.error("Please select an item");
      return;
    }
    if (!type) {
      toast.error("Please select a movement type");
      return;
    }
    if (!quantity || parseInt(quantity) < 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    await onSubmit({
      itemId,
      type,
      quantity: parseInt(quantity),
      unitCost: parseFloat(unitCost) || 0,
      totalCost:
        (parseFloat(unitCost) || 0) * (parseInt(quantity) || 0),
      reason: reason.trim(),
      reference: reference.trim(),
      performedBy: performedBy.trim(),
      date,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-sky-600" />
            Record Stock Movement
          </DialogTitle>
          <DialogDescription>
            Record a stock in, stock out, or adjustment transaction.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>
                Item <span className="text-red-500">*</span>
              </Label>
              <Select value={itemId} onValueChange={handleItemChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  {items
                    .filter((i) => i.isActive)
                    .map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.name}{" "}
                        <span className="text-muted-foreground">
                          ({i.quantity} {i.unit})
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>
                Type <span className="text-red-500">*</span>
              </Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {MOVEMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {formatMovementType(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>
                Quantity <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={exceedsStock ? "border-red-500" : ""}
              />
              {selectedItem && (
                <p className="text-xs text-muted-foreground">
                  Current stock: {selectedItem.quantity} {selectedItem.unit}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Unit Cost (NGN)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
              />
            </div>
          </div>

          {exceedsStock && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                Warning: Stock out quantity ({quantity}) exceeds current stock (
                {selectedItem?.quantity} {selectedItem?.unit}).
              </AlertDescription>
            </Alert>
          )}

          {movementType === "adjustment" && selectedItem && (
            <Alert className="border-sky-200 bg-sky-50">
              <RefreshCw className="h-4 w-4 text-sky-600" />
              <AlertDescription className="text-sky-700">
                Note: For adjustments, the quantity entered will become the new
                stock level (current: {selectedItem.quantity} {selectedItem.unit}
                ).
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea
              placeholder="e.g. Restocked from supplier, Damaged items, etc."
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Reference</Label>
              <Input
                placeholder="e.g. INV-2024-001"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Performed By</Label>
              <Input
                placeholder="e.g. John Doe"
                value={performedBy}
                onChange={(e) => setPerformedBy(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              submitting || !itemId || !type || exceedsStock || !quantity
            }
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Record Movement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function InventoryView() {
  // ========================
  // Items State
  // ========================
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);

  // Items filters
  const [filterCategory, setFilterCategory] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  // Item dialog
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemSubmitting, setItemSubmitting] = useState(false);

  // Delete dialog
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // ========================
  // Transactions State
  // ========================
  const [transactions, setTransactions] = useState<InventoryTransaction[]>(
    []
  );
  const [transactionsLoading, setTransactionsLoading] = useState(true);

  // Transaction filters
  const [txFilterItem, setTxFilterItem] = useState("");
  const [txFilterType, setTxFilterType] = useState("");
  const [txFilterStartDate, setTxFilterStartDate] = useState("");
  const [txFilterEndDate, setTxFilterEndDate] = useState("");

  // Transaction dialog
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [movementSubmitting, setMovementSubmitting] = useState(false);

  // ========================
  // Summary State
  // ========================
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // ========================
  // Active Tab
  // ========================
  const [activeTab, setActiveTab] = useState("items");

  // ========================
  // Fetch Functions
  // ========================

  const fetchItems = useCallback(async () => {
    setItemsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.set("category", filterCategory);
      if (filterLocation) params.set("location", filterLocation);
      if (filterSearch) params.set("search", filterSearch);
      const query = params.toString();
      const res = await fetch(
        `/api/inventory/items${query ? `?${query}` : ""}`
      );
      if (res.ok) {
        const data = await res.json();
        setItems(data.data || []);
      } else {
        toast.error("Failed to load inventory items");
      }
    } catch {
      toast.error("Network error loading items");
    } finally {
      setItemsLoading(false);
    }
  }, [filterCategory, filterLocation, filterSearch]);

  const fetchTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    try {
      const params = new URLSearchParams();
      if (txFilterItem) params.set("itemId", txFilterItem);
      if (txFilterType) params.set("type", txFilterType);
      if (txFilterStartDate) params.set("startDate", txFilterStartDate);
      if (txFilterEndDate) params.set("endDate", txFilterEndDate);
      const query = params.toString();
      const res = await fetch(
        `/api/inventory/transactions${query ? `?${query}` : ""}`
      );
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.data || []);
      } else {
        toast.error("Failed to load transactions");
      }
    } catch {
      toast.error("Network error loading transactions");
    } finally {
      setTransactionsLoading(false);
    }
  }, [txFilterItem, txFilterType, txFilterStartDate, txFilterEndDate]);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch("/api/inventory/summary");
      if (res.ok) {
        const data = await res.json();
        setSummary(data.data || null);
      } else {
        toast.error("Failed to load inventory summary");
      }
    } catch {
      toast.error("Network error loading summary");
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  // ========================
  // Effects
  // ========================

  useEffect(() => {
    if (activeTab === "items") fetchItems();
  }, [activeTab, fetchItems]);

  useEffect(() => {
    if (activeTab === "movements") fetchTransactions();
  }, [activeTab, fetchTransactions]);

  useEffect(() => {
    if (activeTab === "summary") fetchSummary();
  }, [activeTab, fetchSummary]);

  // ========================
  // Derived Values
  // ========================

  const uniqueLocations = Array.from(
    new Set(items.filter((i) => i.location).map((i) => i.location))
  ).sort();

  // ========================
  // Item Handlers
  // ========================

  function openAddItemDialog() {
    setEditingItem(null);
    setItemDialogOpen(true);
  }

  function openEditItemDialog(item: InventoryItem) {
    setEditingItem(item);
    setItemDialogOpen(true);
  }

  function openDeleteItemDialog(item: InventoryItem) {
    setDeletingItem(item);
    setDeleteItemDialogOpen(true);
  }

  async function handleItemSubmit(data: Record<string, unknown>) {
    setItemSubmitting(true);
    try {
      const url = editingItem
        ? `/api/inventory/items/${editingItem.id}`
        : "/api/inventory/items";
      const method = editingItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.message || "Failed to save item");
        return;
      }

      toast.success(editingItem ? "Item updated successfully" : "Item added successfully");
      setItemDialogOpen(false);
      setEditingItem(null);
      fetchItems();
    } catch {
      toast.error("Network error");
    } finally {
      setItemSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingItem) return;
    setDeleteSubmitting(true);
    try {
      const res = await fetch(`/api/inventory/items/${deletingItem.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.message || "Failed to delete item");
        return;
      }

      toast.success("Item deleted successfully");
      setDeleteItemDialogOpen(false);
      setDeletingItem(null);
      fetchItems();
    } catch {
      toast.error("Network error");
    } finally {
      setDeleteSubmitting(false);
    }
  }

  // ========================
  // Transaction Handlers
  // ========================

  async function handleMovementSubmit(data: Record<string, unknown>) {
    setMovementSubmitting(true);
    try {
      const res = await fetch("/api/inventory/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.message || "Failed to record movement");
        return;
      }

      toast.success("Stock movement recorded successfully");
      setMovementDialogOpen(false);
      fetchTransactions();
      fetchItems();
    } catch {
      toast.error("Network error");
    } finally {
      setMovementSubmitting(false);
    }
  }

  function clearTransactionFilters() {
    setTxFilterItem("");
    setTxFilterType("");
    setTxFilterStartDate("");
    setTxFilterEndDate("");
  }

  function clearItemFilters() {
    setFilterCategory("");
    setFilterLocation("");
    setFilterSearch("");
  }

  // ========================
  // Render
  // ========================

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        {...fadeIn}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Inventory Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Track items, stock movements, and inventory levels
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="items" className="gap-1.5">
            <Boxes className="h-4 w-4" />
            Items
          </TabsTrigger>
          <TabsTrigger value="movements" className="gap-1.5">
            <RefreshCw className="h-4 w-4" />
            Stock Movements
          </TabsTrigger>
          <TabsTrigger value="summary" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Summary
          </TabsTrigger>
        </TabsList>

        {/* ======================== ITEMS TAB ======================== */}
        <TabsContent value="items">
          <motion.div {...staggerContainer} animate className="space-y-4">
            {/* Filters & Add */}
            <motion.div
              {...fadeIn}
              className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search items..."
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    className="pl-9 w-56"
                  />
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {formatCategory(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterLocation} onValueChange={setFilterLocation}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueLocations.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(filterCategory || filterLocation || filterSearch) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearItemFilters}
                    className="gap-1 text-muted-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear
                  </Button>
                )}
              </div>
              <Button onClick={openAddItemDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </motion.div>

            {/* Items Table */}
            <motion.div {...fadeIn}>
              {itemsLoading ? (
                <ItemsTableSkeleton />
              ) : items.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Package className="mb-4 h-12 w-12 text-muted-foreground/40" />
                    <h3 className="text-lg font-medium text-muted-foreground">
                      No items found
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {filterSearch || filterCategory || filterLocation
                        ? "Try adjusting your search or filters"
                        : "Get started by adding your first inventory item"}
                    </p>
                    {!filterSearch && !filterCategory && !filterLocation && (
                      <Button
                        onClick={openAddItemDialog}
                        className="mt-4 gap-2"
                        variant="outline"
                      >
                        <Plus className="h-4 w-4" />
                        Add Item
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="max-h-[520px] overflow-y-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="hidden xl:table-cell">
                          Description
                        </TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right hidden md:table-cell">
                          Value
                        </TableHead>
                        <TableHead className="hidden lg:table-cell">
                          Location
                        </TableHead>
                        <TableHead className="hidden xl:table-cell">
                          Supplier
                        </TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {items.map((item) => {
                          const status = getItemStatus(
                            item.quantity,
                            item.reorderLevel,
                            item.isActive
                          );
                          const isLowStock = status === "low_stock";
                          return (
                            <motion.tr
                              key={item.id}
                              {...scaleIn}
                              className={`border-b transition-colors hover:bg-muted/50 ${
                                isLowStock ? "bg-amber-50/60 dark:bg-amber-950/20" : ""
                              }`}
                            >
                              <TableCell className="font-medium">
                                {item.name}
                              </TableCell>
                              <TableCell>
                                {item.category ? (
                                  <Badge variant="outline" className="font-normal">
                                    {formatCategory(item.category)}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="hidden xl:table-cell max-w-[160px]">
                                {item.description ? (
                                  <span className="truncate block" title={item.description}>
                                    {item.description}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="uppercase text-xs font-medium">
                                  {item.unit}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(item.unitCost)}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {item.quantity}
                              </TableCell>
                              <TableCell className="text-right hidden md:table-cell font-medium">
                                {formatCurrency(item.quantity * item.unitCost)}
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                {item.location || (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="hidden xl:table-cell">
                                {item.supplier || (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={status} />
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => openEditItemDialog(item)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Pencil className="h-4 w-4 text-amber-600" />
                                    <span className="sr-only">Edit</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => openDeleteItemDialog(item)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                    <span className="sr-only">Delete</span>
                                  </Button>
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
            </motion.div>
          </motion.div>
        </TabsContent>

        {/* ======================== MOVEMENTS TAB ======================== */}
        <TabsContent value="movements">
          <motion.div {...staggerContainer} animate className="space-y-4">
            {/* Filters & Add */}
            <motion.div
              {...fadeIn}
              className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Select value={txFilterItem} onValueChange={setTxFilterItem}>
                  <SelectTrigger className="w-52">
                    <SelectValue placeholder="Filter by item" />
                  </SelectTrigger>
                  <SelectContent>
                    {items
                      .filter((i) => i.isActive)
                      .map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Select value={txFilterType} onValueChange={setTxFilterType}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOVEMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {formatMovementType(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={txFilterStartDate}
                  onChange={(e) => setTxFilterStartDate(e.target.value)}
                  className="w-40"
                  placeholder="Start date"
                />
                <Input
                  type="date"
                  value={txFilterEndDate}
                  onChange={(e) => setTxFilterEndDate(e.target.value)}
                  className="w-40"
                  placeholder="End date"
                />
                {(txFilterItem ||
                  txFilterType ||
                  txFilterStartDate ||
                  txFilterEndDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearTransactionFilters}
                    className="gap-1 text-muted-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear
                  </Button>
                )}
              </div>
              <Button
                onClick={() => setMovementDialogOpen(true)}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Record Movement
              </Button>
            </motion.div>

            {/* Transactions Table */}
            <motion.div {...fadeIn}>
              {transactionsLoading ? (
                <MovementsTableSkeleton />
              ) : transactions.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <RefreshCw className="mb-4 h-12 w-12 text-muted-foreground/40" />
                    <h3 className="text-lg font-medium text-muted-foreground">
                      No transactions found
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {txFilterItem || txFilterType || txFilterStartDate || txFilterEndDate
                        ? "Try adjusting your filters"
                        : "Record your first stock movement to get started"}
                    </p>
                    {!txFilterItem &&
                      !txFilterType &&
                      !txFilterStartDate &&
                      !txFilterEndDate && (
                        <Button
                          onClick={() => setMovementDialogOpen(true)}
                          className="mt-4 gap-2"
                          variant="outline"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Record Movement
                        </Button>
                      )}
                  </CardContent>
                </Card>
              ) : (
                <div className="max-h-[520px] overflow-y-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Date</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right hidden md:table-cell">
                          Unit Cost
                        </TableHead>
                        <TableHead className="text-right">Total Cost</TableHead>
                        <TableHead className="hidden lg:table-cell">
                          Reason
                        </TableHead>
                        <TableHead className="hidden xl:table-cell">
                          Performed By
                        </TableHead>
                        <TableHead className="hidden xl:table-cell">
                          Reference
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {transactions.map((tx) => (
                          <motion.tr
                            key={tx.id}
                            {...scaleIn}
                            className="border-b transition-colors hover:bg-muted/50"
                          >
                            <TableCell className="text-muted-foreground">
                              {tx.date || new Date(tx.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-medium">
                              {tx.itemName}
                            </TableCell>
                            <TableCell>
                              <MovementTypeBadge type={tx.type} />
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {tx.type === "stock_out" ? "-" : tx.type === "stock_in" ? "+" : "~"}
                              {tx.quantity}
                            </TableCell>
                            <TableCell className="text-right hidden md:table-cell">
                              {formatCurrency(tx.unitCost)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(tx.totalCost)}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell max-w-[180px]">
                              {tx.reason ? (
                                <span className="truncate block" title={tx.reason}>
                                  {tx.reason}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="hidden xl:table-cell">
                              {tx.performedBy || (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="hidden xl:table-cell">
                              {tx.reference || (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              )}
            </motion.div>
          </motion.div>
        </TabsContent>

        {/* ======================== SUMMARY TAB ======================== */}
        <TabsContent value="summary">
          <motion.div {...staggerContainer} animate className="space-y-6">
            {summaryLoading ? (
              <SummarySkeleton />
            ) : summary ? (
              <>
                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                  <motion.div {...fadeIn}>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Total Items
                            </p>
                            <p className="mt-1 text-3xl font-bold">
                              {summary.totalItems}
                            </p>
                          </div>
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                            <Boxes className="h-6 w-6 text-primary" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div {...fadeIn}>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Total Inventory Value
                            </p>
                            <p className="mt-1 text-3xl font-bold">
                              {formatCurrency(summary.totalValue)}
                            </p>
                          </div>
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                            <Warehouse className="h-6 w-6 text-emerald-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div {...fadeIn}>
                    <Card
                      className={
                        summary.lowStockAlerts > 0
                          ? "border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"
                          : ""
                      }
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Low Stock Alerts
                            </p>
                            <p
                              className={`mt-1 text-3xl font-bold ${
                                summary.lowStockAlerts > 0
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                              }`}
                            >
                              {summary.lowStockAlerts}
                            </p>
                          </div>
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                              summary.lowStockAlerts > 0
                                ? "bg-amber-200 dark:bg-amber-800/40"
                                : "bg-emerald-100 dark:bg-emerald-900/30"
                            }`}
                          >
                            <AlertTriangle
                              className={`h-6 w-6 ${
                                summary.lowStockAlerts > 0
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                              }`}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Category Breakdown */}
                  <motion.div {...fadeIn}>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Tag className="h-5 w-5 text-primary" />
                          Category Breakdown
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {summary.categoryBreakdown.length === 0 ? (
                          <p className="py-8 text-center text-sm text-muted-foreground">
                            No category data available
                          </p>
                        ) : (
                          <div className="max-h-80 overflow-y-auto rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/50">
                                  <TableHead>Category</TableHead>
                                  <TableHead className="text-right">
                                    Items
                                  </TableHead>
                                  <TableHead className="text-right">
                                    Quantity
                                  </TableHead>
                                  <TableHead className="text-right">
                                    Value
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {summary.categoryBreakdown.map((cat) => (
                                  <TableRow key={cat.category}>
                                    <TableCell className="font-medium">
                                      {formatCategory(cat.category)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {cat.itemCount}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {cat.totalQuantity}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                      {formatCurrency(cat.totalValue)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                              <TableFooter>
                                <TableRow>
                                  <TableCell className="font-semibold">
                                    Total
                                  </TableCell>
                                  <TableCell className="text-right font-semibold">
                                    {summary.categoryBreakdown.reduce(
                                      (s, c) => s + c.itemCount,
                                      0
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold">
                                    {summary.categoryBreakdown.reduce(
                                      (s, c) => s + c.totalQuantity,
                                      0
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold">
                                    {formatCurrency(
                                      summary.categoryBreakdown.reduce(
                                        (s, c) => s + c.totalValue,
                                        0
                                      )
                                    )}
                                  </TableCell>
                                </TableRow>
                              </TableFooter>
                            </Table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Low Stock Alerts */}
                  <motion.div {...fadeIn}>
                    <Card
                      className={
                        summary.lowStockAlerts > 0
                          ? "border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"
                          : ""
                      }
                    >
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <TrendingDown
                            className={`h-5 w-5 ${
                              summary.lowStockAlerts > 0
                                ? "text-amber-600"
                                : "text-emerald-600"
                            }`}
                          />
                          Low Stock Alerts
                          {summary.lowStockAlerts > 0 && (
                            <Badge className="bg-amber-200 text-amber-700 border-amber-300 hover:bg-amber-200">
                              {summary.lowStockAlerts}
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {summary.lowStockItems.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-3">
                              <AlertTriangle className="h-6 w-6 text-emerald-600" />
                            </div>
                            <p className="text-sm font-medium text-emerald-600">
                              All items are above reorder level
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              No restocking needed at this time
                            </p>
                          </div>
                        ) : (
                          <div className="max-h-80 overflow-y-auto space-y-2">
                            {summary.lowStockItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-sm truncate">
                                    {item.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.category
                                      ? formatCategory(item.category)
                                      : "Uncategorized"}
                                    {item.location
                                      ? ` · ${item.location}`
                                      : ""}
                                  </p>
                                </div>
                                <div className="ml-3 flex items-center gap-2">
                                  <div className="text-right">
                                    <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                                      {item.quantity} {item.unit}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Reorder: {item.reorderLevel}
                                    </p>
                                  </div>
                                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Recent Transactions */}
                <motion.div {...fadeIn}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <RefreshCw className="h-5 w-5 text-primary" />
                        Recent Transactions
                        <Badge variant="secondary" className="ml-1">
                          Last 10
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {summary.recentTransactions.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                          No transactions recorded yet
                        </p>
                      ) : (
                        <div className="max-h-80 overflow-y-auto rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead>Date</TableHead>
                                <TableHead>Item</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">
                                  Quantity
                                </TableHead>
                                <TableHead className="text-right hidden sm:table-cell">
                                  Total
                                </TableHead>
                                <TableHead className="hidden md:table-cell">
                                  Performed By
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {summary.recentTransactions.map((tx) => (
                                <TableRow key={tx.id}>
                                  <TableCell className="text-muted-foreground">
                                    {tx.date ||
                                      new Date(
                                        tx.createdAt
                                      ).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {tx.itemName}
                                  </TableCell>
                                  <TableCell>
                                    <MovementTypeBadge type={tx.type} />
                                  </TableCell>
                                  <TableCell className="text-right font-semibold">
                                    {tx.type === "stock_out"
                                      ? "-"
                                      : tx.type === "stock_in"
                                      ? "+"
                                      : "~"}
                                    {tx.quantity}
                                  </TableCell>
                                  <TableCell className="text-right hidden sm:table-cell font-medium">
                                    {formatCurrency(tx.totalCost)}
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell">
                                    {tx.performedBy || (
                                      <span className="text-muted-foreground">
                                        —
                                      </span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground/40" />
                  <h3 className="text-lg font-medium text-muted-foreground">
                    Unable to load summary
                  </h3>
                  <Button
                    variant="outline"
                    className="mt-4 gap-2"
                    onClick={fetchSummary}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </Button>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* ======================== DIALOGS ======================== */}

      <ItemFormDialog
        key={`item-dialog-${editingItem?.id ?? 'new'}-${itemDialogOpen}`}
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
          item={editingItem}
          onSubmit={handleItemSubmit}
          submitting={itemSubmitting}
        />

      <MovementFormDialog
        key={`movement-dialog-${movementDialogOpen}`}
        open={movementDialogOpen}
          onOpenChange={setMovementDialogOpen}
          items={items}
          onSubmit={handleMovementSubmit}
          submitting={movementSubmitting}
        />

      <AlertDialog
        open={deleteItemDialogOpen}
        onOpenChange={setDeleteItemDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Delete Item
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {deletingItem?.name}
              </span>
              ? This action cannot be undone. Note that items with existing
              transactions cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteSubmitting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete Item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
