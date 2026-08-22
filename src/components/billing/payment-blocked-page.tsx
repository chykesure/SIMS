// src/components/billing/payment-blocked-page.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ShieldAlert,
  CheckCircle2,
  Upload,
  Loader2,
  Eye,
  X,
  Banknote,
  Copy,
  Check,
  FileText,
  Trash2,
  Clock,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PAYMENT_ACCOUNTS, PAYMENT_NOTE } from "@/lib/payment-accounts";

interface BlockedData {
  totalOwed: number;
  unpaidMonths: string[];
  tenantId: string;
  tenantName: string;
  monthlyAmount: number;
  planName: string;
  paymentAccounts: { bankName: string; accountNumber: string; accountName: string }[];
  pendingReviewMonths: string[];
  tenantPlan?: string;
  planPriceNGN?: number;
  planPriceUSD?: number;
}

interface PaymentBlockedPageProps {
  data: BlockedData;
  onBack: () => void;
  onAllPaid?: () => void;
}

function formatNaira(amount: number): string {
  return `\u20a6${amount.toLocaleString("en-NG")}`;
}

function formatMonth(month: string): string {
  const [y, m] = month.split("-");
  const d = new Date(Number(y), Number(m) - 1);
  return d.toLocaleDateString("en-NG", { month: "long", year: "numeric" });
}

export function PaymentBlockedPage({ data, onBack, onAllPaid }: PaymentBlockedPageProps) {
  const [uploadingMonth, setUploadingMonth] = useState<string | null>(null);
  const [uploadedMonths, setUploadedMonths] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<{ data: string; type: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Upload state per month
  const [files, setFiles] = useState<Record<string, string>>({});
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [fileTypes, setFileTypes] = useState<Record<string, string>>({});
  const [references, setReferences] = useState<Record<string, string>>({});

  const isLicensePayment = data.unpaidMonths.includes("license");
  const allUploaded = data.unpaidMonths.every((m) => uploadedMonths.has(m));
  const hasPendingReview = data.pendingReviewMonths && data.pendingReviewMonths.length > 0;

  // Display label for a month key
  const getMonthLabel = (month: string) => {
    if (month === "license") return "Full License Payment";
    return formatMonth(month);
  };

  // ── Copy to clipboard ──
  const copyField = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // ── Handle file select (images + PDF) ──
  const handleFileSelect = (month: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      alert("Please upload an image file (PNG, JPG, JPEG, WEBP) or a PDF receipt.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("File must be less than 5MB.");
      return;
    }
    setFileNames((prev) => ({ ...prev, [month]: file.name }));
    setFileTypes((prev) => ({ ...prev, [month]: file.type }));
    const reader = new FileReader();
    reader.onload = () => setFiles((prev) => ({ ...prev, [month]: reader.result as string }));
    reader.readAsDataURL(file);
  };

  // ── Remove selected file ──
  const handleRemoveFile = (month: string) => {
    setFiles((prev) => { const n = { ...prev }; delete n[month]; return n; });
    setFileNames((prev) => { const n = { ...prev }; delete n[month]; return n; });
    setFileTypes((prev) => { const n = { ...prev }; delete n[month]; return n; });
  };

  // ── Upload evidence for a single month ──
  const handleUpload = async (month: string) => {
    const evidence = files[month];
    if (!evidence) {
      alert("Please select a payment screenshot or receipt first.");
      return;
    }

    setUploadingMonth(month);
    try {
      // License payment uses a different API than monthly dues
      const isLicense = month === "license";
      const res = await fetch(
        isLicense ? "/api/tenant/payment-evidence" : "/api/billing/due",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-tenant-id": data.tenantId,
          },
          body: JSON.stringify(
            isLicense
              ? {
                  type: "new_subscription",
                  targetPlan: data.tenantPlan || "basic",
                  amountUSD: data.planPriceUSD || 0,
                  amountNGN: data.planPriceNGN || data.totalOwed,
                  fileData: evidence,
                  fileName: fileNames[month] || "license-payment-evidence",
                  fileType: fileTypes[month] || "image/png",
                  reference: references[month] || "",
                }
              : {
                  month,
                  evidence,
                  evidenceName: fileNames[month] || "payment-evidence",
                  evidenceType: fileTypes[month] || "image/png",
                }
          ),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }
      setUploadedMonths((prev) => new Set([...prev, month]));
      // Clean up file state for this month
      handleRemoveFile(month);
    } catch (err: any) {
      alert("Upload failed: " + (err?.message || "Unknown error"));
    } finally {
      setUploadingMonth(null);
    }
  };

  // ── After all uploads, proceed to login ──
  const handleProceed = () => {
    if (onAllPaid) onAllPaid();
    else onBack();
  };

  // Use payment accounts from API response, fall back to hardcoded config
  const accounts = data.paymentAccounts?.length ? data.paymentAccounts : PAYMENT_ACCOUNTS;
  const account = accounts[0];

  // Guard: if no account details available, show error
  if (!account) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white shadow-xl p-8 text-center">
          <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900">Payment Required</h1>
          <p className="mt-2 text-sm text-slate-600">Your school has outstanding monthly dues but payment account details are not available. Please contact support on WhatsApp: 09133273608.</p>
          <Button onClick={onBack} variant="outline" className="mt-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
              <ShieldAlert className="h-10 w-10 text-amber-600" />
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-600 text-white">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-amber-200 bg-white shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-5">
            <h1 className="text-xl font-bold text-white">{isLicensePayment ? "License Payment Required" : "Outstanding Monthly Due"}</h1>
            <p className="mt-1 text-sm text-amber-100">{isLicensePayment ? `Welcome, ${data.tenantName}. Please pay for your ${data.planName} and upload your payment evidence to activate your account.` : `Your school has ${data.unpaidMonths.length} outstanding monthly maintenance due${data.unpaidMonths.length > 1 ? "s" : ""} totalling ${formatNaira(data.totalOwed)}. Please make payment and upload your evidence to continue.`}</p>
          </div>

          <div className="p-6 space-y-5">
            {/* Amount Due */}
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-center">
              <p className="text-sm text-amber-600 font-medium">{isLicensePayment ? data.planName : "Total Amount Due"}</p>
              <p className="text-3xl font-extrabold text-amber-700 mt-1">{formatNaira(data.totalOwed)}</p>
              {!isLicensePayment && (
                <p className="text-xs text-amber-500 mt-1">
                  For {data.unpaidMonths.length} month{data.unpaidMonths.length > 1 ? "s" : ""}: {data.unpaidMonths.map(getMonthLabel).join(", ")}
                </p>
              )}
            </div>

            {/* ─── BANK DETAILS ─── */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Banknote className="h-4 w-4 text-emerald-600" />
                Step 1: Transfer to this account
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between rounded-lg bg-white border border-slate-100 px-3 py-2.5">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Bank</p>
                    <p className="text-sm font-semibold text-slate-800">{account.bankName}</p>
                  </div>
                  <button
                    onClick={() => copyField(account.bankName, "bank")}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {copiedField === "bank" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-white border border-slate-100 px-3 py-2.5">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Account Number</p>
                    <p className="text-sm font-semibold text-slate-800 tracking-wider">{account.accountNumber}</p>
                  </div>
                  <button
                    onClick={() => copyField(account.accountNumber, "acct")}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {copiedField === "acct" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-white border border-slate-100 px-3 py-2.5">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Account Name</p>
                    <p className="text-sm font-semibold text-slate-800">{account.accountName}</p>
                  </div>
                  <button
                    onClick={() => copyField(account.accountName, "name")}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {copiedField === "name" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>

                <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5 text-center">
                  <p className="text-[10px] text-amber-400 uppercase tracking-wider">Amount to Transfer</p>
                  <p className="text-lg font-bold text-amber-700">{formatNaira(data.totalOwed)}</p>
                </div>
              </div>
            </div>

            {/* ─── PENDING REVIEW NOTICE ─── */}
            {hasPendingReview && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                  <Clock className="h-4 w-4" />
                  Evidence Already Under Review
                </div>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Payment evidence for {data.pendingReviewMonths!.length} month{data.pendingReviewMonths!.length > 1 ? "s" : ""} ({data.pendingReviewMonths!.map(formatMonth).join(", ")}) has been received and is being verified. You will regain access once the platform admin confirms the payment.
                </p>
                <div className="space-y-1.5 mt-2">
                  {data.pendingReviewMonths!.map((month) => (
                    <div key={month} className="flex items-center justify-between rounded-lg bg-white border border-blue-100 px-3 py-2">
                      <span className="text-xs font-medium text-slate-700">{formatMonth(month)}</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                        <Clock className="h-3 w-3" /> Under Review
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── UPLOAD SECTION ─── */}
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
                <Upload className="h-4 w-4 text-blue-600" />
                Step 2: Upload payment evidence{isLicensePayment ? "" : " for each month"}
              </div>

              {data.unpaidMonths.map((month) => {
                const isUploaded = uploadedMonths.has(month);
                const isUploading = uploadingMonth === month;
                const hasFile = !!files[month];
                const isPdf = fileTypes[month] === "application/pdf";

                return (
                  <div
                    key={month}
                    className={"rounded-xl border p-4 space-y-3 mb-3 " +
                      (isUploaded
                        ? "border-emerald-200 bg-emerald-50/50"
                        : "border-slate-200 bg-white"
                      )
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isUploaded ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <div className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-amber-400" />
                        )}
                        <span className={"text-sm font-medium " + (isUploaded ? "text-emerald-700" : "text-slate-700")}>
                          {getMonthLabel(month)}
                        </span>
                      </div>
                      {isUploaded && (
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                          Evidence Uploaded
                        </span>
                      )}
                    </div>

                    {!isUploaded && (
                      <>
                        {/* File upload area */}
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">
                            Payment Screenshot or Receipt (PNG, JPG, WEBP, PDF) *
                          </label>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                            onChange={(e) => handleFileSelect(month, e)}
                            className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                          />
                        </div>

                        {/* File preview / selected indicator */}
                        {hasFile && (
                          <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
                            {isPdf ? (
                              <FileText className="h-4 w-4 text-red-500 shrink-0" />
                            ) : (
                              <Eye
                                className="h-4 w-4 text-blue-500 shrink-0 cursor-pointer hover:text-blue-700"
                                onClick={() => setPreviewFile({ data: files[month], type: fileTypes[month] })}
                              />
                            )}
                            <span className="text-xs font-medium text-slate-700 truncate flex-1">
                              {fileNames[month]}
                            </span>
                            {!isPdf && (
                              <button
                                type="button"
                                onClick={() => setPreviewFile({ data: files[month], type: fileTypes[month] })}
                                className="text-[10px] font-medium text-blue-600 hover:text-blue-800 shrink-0"
                              >
                                Preview
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(month)}
                              className="text-slate-400 hover:text-red-500 transition-colors shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Transaction reference */}
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">
                            Transaction Reference (optional)
                          </label>
                          <input
                            type="text"
                            value={references[month] || ""}
                            onChange={(e) => setReferences((prev) => ({ ...prev, [month]: e.target.value }))}
                            placeholder="e.g. OPay transfer ref"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <Button
                          onClick={() => handleUpload(month)}
                          disabled={isUploading || !hasFile}
                          className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" />
                              Upload Evidence for {getMonthLabel(month)}
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ─── ALL DONE ─── */}
            {allUploaded && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3 text-center"
              >
                <div className="flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">All Evidence Submitted!</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Your payment evidence has been submitted successfully.
                  </p>
                </div>

                {/* Clear review status message */}
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-left">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-amber-800">What happens next?</p>
                      <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                        The platform admin will now verify your payment evidence. This typically takes <strong>up to 24 hours</strong>. You will regain full access to your dashboard once verification is complete. Please do not try to log in again until you receive a confirmation.
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={onBack}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </Button>
              </motion.div>
            )}

            {/* Help note */}
            <p className="text-xs text-slate-400 text-center">
              {PAYMENT_NOTE}
            </p>
          </div>

          {/* Footer */}
          <div className="border-t border-amber-100 bg-amber-50/50 px-6 py-4">
            <Button onClick={onBack} variant="outline" className="w-full gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Button>
          </div>
        </div>
      </motion.div>

      {/* File Preview Modal */}
      {previewFile && !previewFile.type.includes("pdf") && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewFile(null)}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
            >
              <X className="h-4 w-4" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewFile.data}
              alt="Payment evidence preview"
              className="max-h-[85vh] w-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}