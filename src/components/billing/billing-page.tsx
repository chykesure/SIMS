"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

// ─── Types ───────────────────────────────────────────────────────────────
interface MonthlyDue {
  id: string;
  tenantId: string;
  month: string;
  amount: number;
  status: "unpaid" | "overdue" | "paid";
  evidence: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BillingTotals {
  totalOutstanding: number;
  totalPaid: number;
  monthlyRate: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────
function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}

function formatMonth(month: string): string {
  try {
    const [year, m] = month.split("-");
    const date = new Date(Number(year), Number(m) - 1, 1);
    return date.toLocaleDateString("en-NG", { month: "long", year: "numeric" });
  } catch {
    return month;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "paid":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Paid
        </span>
      );
    case "overdue":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          Overdue
        </span>
      );
    case "unpaid":
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Unpaid
        </span>
      );
  }
}

// ─── Component ───────────────────────────────────────────────────────────
export function BillingPage() {
  const { toast } = useToast();

  const [dues, setDues] = useState<MonthlyDue[]>([]);
  const [totals, setTotals] = useState<BillingTotals>({
    totalOutstanding: 0,
    totalPaid: 0,
    monthlyRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  // Upload form state
  const [uploadMonth, setUploadMonth] = useState<string>("");
  const [uploadFile, setUploadFile] = useState<string>("");
  const [uploadFileName, setUploadFileName] = useState<string>("");
  const [uploadReference, setUploadReference] = useState<string>("");
  const [uploadNote, setUploadNote] = useState<string>("");

  // Image preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // ── Fetch dues ───────────────────────────────────────────────────────
  const fetchDues = useCallback(async () => {
    try {
      setLoading(true);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      // Inject tenant/user headers from localStorage (same as fetch-interceptor)
      if (typeof window !== "undefined") {
        const tenantId = localStorage.getItem("tenantId");
        const userId = localStorage.getItem("userId");
        if (tenantId) headers["x-tenant-id"] = tenantId;
        if (userId) headers["x-user-id"] = userId;
      }

      const res = await fetch("/api/billing/due", { headers });
      if (!res.ok) {
        throw new Error("Failed to fetch billing data");
      }
      const json = await res.json();
      setDues(json.dues || []);
      setTotals({
        totalOutstanding: json.totalOutstanding ?? 0,
        totalPaid: json.totalPaid ?? 0,
        monthlyRate: json.monthlyRate ?? 0,
      });
    } catch (err: any) {
      console.error("[BillingPage] fetch error:", err);
      toast({
        title: "Error",
        description: err?.message || "Failed to load billing data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDues();
  }, [fetchDues]);

  // ── Handle file select ───────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB for base64)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploadFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setUploadFile(result);
    };
    reader.onerror = () => {
      toast({
        title: "Read error",
        description: "Failed to read the selected file",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);
  };

  // ── Handle upload submit ─────────────────────────────────────────────
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadMonth || !uploadFile) {
      toast({
        title: "Missing info",
        description: "Please select a month and upload your payment screenshot",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (typeof window !== "undefined") {
        const tenantId = localStorage.getItem("tenantId");
        const userId = localStorage.getItem("userId");
        if (tenantId) headers["x-tenant-id"] = tenantId;
        if (userId) headers["x-user-id"] = userId;
      }

      const res = await fetch("/api/billing/due", {
        method: "POST",
        headers,
        body: JSON.stringify({
          month: uploadMonth,
          evidence: uploadFile,
          reference: uploadReference.trim(),
          note: uploadNote.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      toast({
        title: "Evidence uploaded",
        description: "Your payment evidence has been submitted for review.",
      });

      // Reset form
      setUploadMonth("");
      setUploadFile("");
      setUploadFileName("");
      setUploadReference("");
      setUploadNote("");
      setExpandedMonth(null);
      // clear file input
      const fileInput = document.getElementById("evidence-file") as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      // Refresh data
      fetchDues();
    } catch (err: any) {
      console.error("[BillingPage] upload error:", err);
      toast({
        title: "Upload failed",
        description: err?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // ── Start upload for a specific month ────────────────────────────────
  const startUploadForMonth = (month: string) => {
    setUploadMonth(month);
    setExpandedMonth(month);
  };

  // ── Toggle expand ────────────────────────────────────────────────────
  const toggleExpand = (month: string) => {
    setExpandedMonth((prev) => (prev === month ? null : month));
  };

  // ── Render ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
          <p className="text-sm text-gray-500">Loading billing data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Monthly Billing</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your monthly maintenance dues and payment history
        </p>
      </div>

      {/* ── Summary Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Outstanding */}
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-red-600">
            Outstanding
          </p>
          <p className="mt-2 text-2xl font-bold text-red-700">
            {formatNaira(totals.totalOutstanding)}
          </p>
          <p className="mt-1 text-xs text-red-500">
            {dues.filter((d) => d.status !== "paid").length} unpaid month(s)
          </p>
        </div>

        {/* Paid */}
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-green-600">
            Total Paid
          </p>
          <p className="mt-2 text-2xl font-bold text-green-700">
            {formatNaira(totals.totalPaid)}
          </p>
          <p className="mt-1 text-xs text-green-500">
            {dues.filter((d) => d.status === "paid").length} month(s) paid
          </p>
        </div>

        {/* Monthly Rate */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-blue-600">
            Monthly Rate
          </p>
          <p className="mt-2 text-2xl font-bold text-blue-700">
            {formatNaira(totals.monthlyRate)}
          </p>
          <p className="mt-1 text-xs text-blue-500">
            Current plan rate
          </p>
        </div>
      </div>

      {/* ── Payment History ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
        </div>

        {dues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 rounded-full bg-gray-100 p-4">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900">No billing records yet</p>
            <p className="mt-1 text-xs text-gray-500">
              Your monthly dues will appear here once they are generated
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {dues
              .sort((a, b) => b.month.localeCompare(a.month))
              .map((due) => (
                <div key={due.id} className="px-5 py-4">
                  {/* Row header — clickable */}
                  <button
                    onClick={() => toggleExpand(due.month)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                        <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatMonth(due.month)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Generated {new Date(due.createdAt).toLocaleDateString("en-NG")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatNaira(due.amount)}
                      </span>
                      {getStatusBadge(due.status)}
                      <svg
                        className={`h-4 w-4 text-gray-400 transition-transform ${
                          expandedMonth === due.month ? "rotate-180" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {expandedMonth === due.month && (
                    <div className="mt-4 ml-14 space-y-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
                      {due.status === "paid" && due.evidence && (
                        <div>
                          <p className="mb-2 text-xs font-medium text-gray-500">
                            Payment Evidence
                          </p>
                          <button
                            onClick={() => setPreviewImage(due.evidence!)}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-blue-600 hover:bg-blue-50"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            View Screenshot
                          </button>
                          {due.reviewedBy && (
                            <p className="mt-2 text-xs text-green-600">
                              Reviewed by admin on{" "}
                              {due.reviewedAt
                                ? new Date(due.reviewedAt).toLocaleDateString("en-NG")
                                : "N/A"}
                            </p>
                          )}
                        </div>
                      )}

                      {due.status === "unpaid" && (
                        <div>
                          <p className="mb-3 text-xs font-medium text-gray-500">
                            Upload Payment Evidence
                          </p>
                          <form onSubmit={handleUpload} className="space-y-3">
                            <input type="hidden" value={uploadMonth} />

                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-700">
                                Payment Screenshot *
                              </label>
                              <input
                                id="evidence-file"
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                              />
                              {uploadFileName && (
                                <p className="mt-1 text-xs text-gray-400">{uploadFileName}</p>
                              )}
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-700">
                                Transaction Reference
                              </label>
                              <input
                                type="text"
                                value={uploadReference}
                                onChange={(e) => setUploadReference(e.target.value)}
                                placeholder="e.g. OPay transfer ref"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-700">
                                Note (optional)
                              </label>
                              <textarea
                                value={uploadNote}
                                onChange={(e) => setUploadNote(e.target.value)}
                                placeholder="Any additional information..."
                                rows={2}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>

                            <button
                              type="submit"
                              disabled={uploading || !uploadFile}
                              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {uploading ? (
                                <>
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                  </svg>
                                  Submit Evidence
                                </>
                              )}
                            </button>
                          </form>
                        </div>
                      )}

                      {due.status === "overdue" && (
                        <div>
                          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                            <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-red-800">
                                Overdue Payment
                              </p>
                              <p className="mt-1 text-xs text-red-600">
                                This payment is past due. Please upload your payment evidence
                                below to resolve this.
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => startUploadForMonth(due.month)}
                            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            Upload Evidence Now
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* ── Image Preview Modal ─────────────────────────────────────── */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage}
              alt="Payment evidence"
              className="max-h-[85vh] w-full object-contain"
              onError={() => {
                toast({
                  title: "Image error",
                  description: "Failed to load the payment evidence image",
                  variant: "destructive",
                });
                setPreviewImage(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}