"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    GraduationCap,
    Upload,
    X,
    Image as ImageIcon,
    CheckCircle,
    Loader2,
    ArrowRight,
    ArrowLeft,
    ShieldCheck,
    CreditCard,
    Clock,
    AlertTriangle,
    FileText,
    BadgeCheck,
    Banknote,
    Copy,
    Check,
    Info,
} from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/store/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function PaymentUploadPage() {
    const navigate = useAppStore((s) => s.navigate);
    const registrationData = useAppStore((s) => s.registrationData);
    const setPendingSchoolName = useAppStore((s) => s.setPendingSchoolName);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [reference, setReference] = useState("");
    const [note, setNote] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [isUploaded, setIsUploaded] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    // ─── If no registration data, redirect to register ──────────────────
    useEffect(() => {
        if (!registrationData) {
            navigate("register");
        }
    }, [registrationData, navigate]);

    // ─── Check if evidence was already uploaded (page refresh scenario) ──
    useEffect(() => {
        if (!registrationData) return;
        const tid = registrationData.tenantId;
        const eml = registrationData.adminEmail;
        async function checkExisting() {
            try {
                const res = await fetch(
                    `/api/auth/register-payment-evidence?tenantId=${tid}&email=${eml}`
                );
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.hasEvidence) {
                        setIsUploaded(true);
                    }
                }
            } catch {
                // Silent fail — user can still try to upload
            }
        }
        checkExisting();
    }, [registrationData]);

    // ─── Handle file selection ──────────────────────────────────────────
    const handleFileSelect = (file: File) => {
        const allowedTypes = [
            "image/png", "image/jpeg", "image/jpg", "image/webp",
            "application/pdf",
        ];
        if (!allowedTypes.includes(file.type)) {
            toast.error("Invalid file", {
                description: "Please upload an image (PNG, JPG, JPEG, WEBP) or PDF file.",
            });
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("File too large", {
                description: "File must be less than 5MB.",
            });
            return;
        }
        setReceiptFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setReceiptPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
    };

    const removeReceipt = () => {
        setReceiptFile(null);
        setReceiptPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // ─── Copy to clipboard helper ───────────────────────────────────────
    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
        });
    };

    // ─── Convert file to base64 ─────────────────────────────────────────
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // ─── Submit payment evidence ────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!registrationData) return;

        if (!receiptFile) {
            toast.error("Receipt required", {
                description: "Please upload your payment receipt before proceeding.",
            });
            return;
        }

        setIsUploading(true);
        try {
            const base64 = await fileToBase64(receiptFile);

            const res = await fetch("/api/auth/register-payment-evidence", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tenantId: registrationData.tenantId,
                    adminEmail: registrationData.adminEmail,
                    targetPlan: registrationData.plan,
                    amountNGN: registrationData.amountNGN,
                    amountUSD: registrationData.amountUSD,
                    fileData: base64,
                    fileName: receiptFile.name,
                    fileSize: String(receiptFile.size),
                    fileType: receiptFile.type,
                    reference: reference.trim(),
                    note: note.trim(),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Upload failed");
            }

            setIsUploaded(true);
            toast.success("Receipt uploaded!", {
                description: data.message || "Your payment evidence has been submitted for verification.",
            });
        } catch (err) {
            toast.error("Upload failed", {
                description: err instanceof Error ? err.message : "An unexpected error occurred.",
            });
        } finally {
            setIsUploading(false);
        }
    };

    // ─── Guard: no registration data (AFTER all hooks) ───────────────────
    if (!registrationData) return null;

    const formatNGN = (amount: number) =>
        `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;

    return (
        <div className="flex min-h-screen">
            {/* ========== LEFT BRANDING PANEL ========== */}
            <motion.div
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative hidden w-[480px] flex-shrink-0 flex-col justify-between overflow-hidden px-10 py-12 text-white lg:flex"
                style={{
                    background:
                        "linear-gradient(160deg, #C0522B 0%, #5a0d1c 50%, #3d0813 100%)",
                }}
            >
                {/* Decorative circles */}
                <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-white/[0.03]" />
                <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-white/[0.03]" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                            <GraduationCap className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">CHYKSYS</h1>
                            <p className="text-xs font-light tracking-widest text-white/60">
                                MANAGEMENT PLATFORM
                            </p>
                        </div>
                    </div>

                    <div className="mt-16">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Secure Payment
                        </div>
                        <h2 className="mt-6 text-3xl font-bold leading-tight">
                            Complete your{" "}
                            <span className="text-white/70">subscription payment</span>
                        </h2>
                        <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
                            Upload your payment receipt to activate your school account. Our
                            Cloud Engineer will verify it within 24–48 hours.
                        </p>
                    </div>
                </div>

                <div className="relative z-10 space-y-6">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                        <p className="text-xs font-medium text-white/60 mb-2">
                            Registration Summary
                        </p>
                        <p className="text-base font-semibold">{registrationData.tenantName}</p>
                        <p className="mt-1 text-sm text-white/70">
                            {registrationData.plan.charAt(0).toUpperCase() +
                                registrationData.plan.slice(1)}{" "}
                            Plan · {registrationData.studentCount.toLocaleString()} students
                        </p>
                    </div>
                    <div className="h-px bg-white/10" />
                    <p className="text-[11px] text-white/30">
                        &copy; {new Date().getFullYear()} CHYKSYS. All rights reserved.
                    </p>
                </div>
            </motion.div>

            {/* ========== RIGHT FORM PANEL ========== */}
            <div className="flex flex-1 flex-col bg-white">
                {/* Mobile header */}
                <div className="flex items-center gap-3 border-b px-4 py-3 lg:hidden">
                    <button
                        type="button"
                        onClick={() => navigate("login")}
                        className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ backgroundColor: "#C0522B" }}
                    >
                        <GraduationCap className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-semibold">Payment Verification</span>
                </div>

                {/* Form area */}
                <motion.div
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                    className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-10 sm:px-8"
                >
                    <div className="w-full max-w-md">
                        {/* Desktop back link */}
                        <button
                            type="button"
                            onClick={() => navigate("login")}
                            className="mb-8 hidden items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground lg:inline-flex"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Sign In
                        </button>

                        <AnimatePresence mode="wait">
                            {!isUploaded ? (
                                <motion.div
                                    key="upload-form"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    {/* Title */}
                                    <div className="mb-8">
                                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
                                            <CreditCard className="h-6 w-6 text-emerald-600" />
                                        </div>
                                        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                                            Upload Payment Receipt
                                        </h2>
                                        <p className="mt-1.5 text-sm text-muted-foreground">
                                            Your school account requires payment verification to be
                                            activated
                                        </p>
                                    </div>

                                    {/* ─── Plan & Amount Card ─── */}
                                    <div className="mb-6 rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/30 p-5">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                                                    Subscription Plan
                                                </p>
                                                <p className="mt-1 text-xl font-bold text-slate-900">
                                                    {registrationData.plan.charAt(0).toUpperCase() +
                                                        registrationData.plan.slice(1)}{" "}
                                                    Plan
                                                </p>
                                                <p className="mt-1 text-sm text-slate-500">
                                                    Up to{" "}
                                                    {registrationData.studentCount.toLocaleString()}{" "}
                                                    students
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-extrabold text-emerald-700">
                                                    {formatNGN(registrationData.amountNGN)}
                                                </p>
                                                <p className="text-xs text-slate-400">/ Full License</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ─── Bank Details ─── */}
                                    <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                                        <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                            <Banknote className="h-4 w-4 text-slate-500" />
                                            Bank Payment Details
                                        </p>
                                        <div className="mt-3 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs text-slate-400">Bank</p>
                                                    <p className="text-sm font-medium text-slate-700">
                                                        OPay
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => copyToClipboard("OPay", "bank")}
                                                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                                                >
                                                    {copiedField === "bank" ? (
                                                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                                                    ) : (
                                                        <Copy className="h-3.5 w-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs text-slate-400">
                                                        Account Number
                                                    </p>
                                                    <p className="text-sm font-mono font-semibold text-slate-700">
                                                        7037933533
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        copyToClipboard("7037933533", "account")
                                                    }
                                                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                                                >
                                                    {copiedField === "account" ? (
                                                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                                                    ) : (
                                                        <Copy className="h-3.5 w-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs text-slate-400">Account Name</p>
                                                    <p className="text-sm font-medium text-slate-700">
                                                        Chike Polycarp
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        copyToClipboard(
                                                            "Chike Polycarp",
                                                            "name"
                                                        )
                                                    }
                                                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                                                >
                                                    {copiedField === "name" ? (
                                                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                                                    ) : (
                                                        <Copy className="h-3.5 w-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs text-slate-400">Amount</p>
                                                    <p className="text-base font-bold text-emerald-700">
                                                        {formatNGN(registrationData.amountNGN)}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        copyToClipboard(
                                                            String(registrationData.amountNGN),
                                                            "amount"
                                                        )
                                                    }
                                                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                                                >
                                                    {copiedField === "amount" ? (
                                                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                                                    ) : (
                                                        <Copy className="h-3.5 w-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                                            <Info className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                                            <p className="text-xs text-amber-700">
                                                Make payment to the account above, then take a screenshot
                                                of your receipt and upload it below.
                                            </p>
                                        </div>
                                    </div>

                                    {/* ─── Upload Form ─── */}
                                    <form onSubmit={handleSubmit} className="space-y-5">
                                        {/* Receipt Upload Area */}
                                        <div className="space-y-2">
                                            <Label>
                                                Payment Receipt <span className="text-red-500">*</span>
                                            </Label>
                                            {!receiptPreview ? (
                                                <div
                                                    className={cn(
                                                        "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-all cursor-pointer",
                                                        dragOver
                                                            ? "border-emerald-400 bg-emerald-50"
                                                            : "border-slate-300 bg-slate-50/50 hover:border-emerald-300 hover:bg-emerald-50/30"
                                                    )}
                                                    onDragOver={(e) => {
                                                        e.preventDefault();
                                                        setDragOver(true);
                                                    }}
                                                    onDragLeave={() => setDragOver(false)}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        setDragOver(false);
                                                        const file = e.dataTransfer.files?.[0];
                                                        if (file) handleFileSelect(file);
                                                    }}
                                                    onClick={() => fileInputRef.current?.click()}
                                                >
                                                    <div
                                                        className={cn(
                                                            "flex h-14 w-14 items-center justify-center rounded-full transition-colors",
                                                            dragOver
                                                                ? "bg-emerald-100"
                                                                : "bg-slate-100"
                                                        )}
                                                    >
                                                        <Upload
                                                            className={cn(
                                                                "h-6 w-6 transition-colors",
                                                                dragOver
                                                                    ? "text-emerald-600"
                                                                    : "text-slate-400"
                                                            )}
                                                        />
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-sm font-medium text-slate-700">
                                                            <span className="text-emerald-600">
                                                                Click to upload
                                                            </span>{" "}
                                                            or drag and drop
                                                        </p>
                                                        <p className="mt-1 text-xs text-slate-400">
                                                            PNG, JPG, JPEG, WEBP or PDF (Max 5MB)
                                                        </p>
                                                    </div>
                                                    <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                                                        onChange={handleFileInput}
                                                        className="hidden"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="relative rounded-xl border-2 border-emerald-200 bg-emerald-50/30 overflow-hidden">
                                                    {receiptFile?.type === "application/pdf" ? (
                                                        <div className="flex flex-col items-center justify-center bg-slate-100 p-8">
                                                            <FileText className="h-16 w-16 text-red-500 mb-3" />
                                                            <p className="text-sm font-medium text-slate-700">{receiptFile.name}</p>
                                                            <p className="text-xs text-slate-400 mt-1">
                                                                {(receiptFile.size / 1024).toFixed(1)} KB
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="relative">
                                                            <img
                                                                src={receiptPreview}
                                                                alt="Receipt preview"
                                                                className="max-h-64 w-full object-contain bg-slate-100"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={removeReceipt}
                                                                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition-opacity hover:bg-red-600"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-2 px-4 py-2.5 bg-white">
                                                        <FileText className="h-4 w-4 text-emerald-600" />
                                                        <span className="text-sm text-slate-700 flex-1 truncate">
                                                            {receiptFile?.name || "receipt.jpg"}
                                                        </span>
                                                        <span className="text-xs text-slate-400">
                                                            {receiptFile
                                                                ? `${(receiptFile.size / 1024).toFixed(1)} KB`
                                                                : ""}
                                                        </span>
                                                        {/* Remove button for PDF (since the X button is only on image) */}
                                                        {receiptFile?.type === "application/pdf" && (
                                                            <button
                                                                type="button"
                                                                onClick={removeReceipt}
                                                                className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                                                            >
                                                                <X className="h-3.5 w-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Transaction Reference (optional) */}
                                        <div className="space-y-2">
                                            <Label htmlFor="reference">
                                                Transaction Reference{" "}
                                                <span className="text-xs text-slate-400 font-normal">
                                                    (optional)
                                                </span>
                                            </Label>
                                            <Input
                                                id="reference"
                                                placeholder="e.g. OPay transfer ref #1234567890"
                                                value={reference}
                                                onChange={(e) => setReference(e.target.value)}
                                            />
                                        </div>

                                        {/* Note (optional) */}
                                        <div className="space-y-2">
                                            <Label htmlFor="note">
                                                Additional Note{" "}
                                                <span className="text-xs text-slate-400 font-normal">
                                                    (optional)
                                                </span>
                                            </Label>
                                            <Input
                                                id="note"
                                                placeholder="Any additional information for the reviewer"
                                                value={note}
                                                onChange={(e) => setNote(e.target.value)}
                                            />
                                        </div>

                                        {/* Warning if no receipt */}
                                        {!receiptFile && (
                                            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                                                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                                                <p className="text-xs text-amber-700">
                                                    You <strong>must</strong> upload your payment receipt to
                                                    proceed. Without it, your account cannot be activated.
                                                </p>
                                            </div>
                                        )}

                                        {/* Submit */}
                                        <Button
                                            type="submit"
                                            className="w-full py-5 text-sm font-semibold text-white"
                                            style={{ backgroundColor: "#C0522B" }}
                                            disabled={isUploading || !receiptFile}
                                        >
                                            {isUploading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Uploading Receipt...
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="mr-2 h-4 w-4" />
                                                    Upload Receipt & Continue
                                                </>
                                            )}
                                        </Button>

                                        {/* Skip for now (but warn) */}
                                        <p className="text-center text-xs text-muted-foreground">
                                            Already uploaded?{" "}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setPendingSchoolName(registrationData.tenantName);
                                                    navigate("pending-approval");
                                                }}
                                                className="font-medium text-slate-600 hover:underline"
                                            >
                                                Skip to pending page
                                            </button>
                                        </p>
                                    </form>
                                </motion.div>
                            ) : (
                                /* ─── SUCCESS STATE ─── */
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <Card className="border-0 shadow-xl">
                                        <CardContent className="flex flex-col items-center p-8 text-center">
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{
                                                    delay: 0.2,
                                                    type: "spring",
                                                    stiffness: 200,
                                                    damping: 15,
                                                }}
                                                className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50"
                                            >
                                                <CheckCircle className="h-10 w-10 text-emerald-500" />
                                            </motion.div>

                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.3, duration: 0.4 }}
                                            >
                                                <h2 className="text-2xl font-bold text-foreground">
                                                    Receipt Uploaded!
                                                </h2>
                                                <p className="mt-2 text-sm text-muted-foreground">
                                                    Your payment receipt for{" "}
                                                    <span className="font-semibold text-foreground">
                                                        {registrationData.tenantName}
                                                    </span>{" "}
                                                    has been submitted successfully.
                                                </p>
                                            </motion.div>

                                            {/* Amount confirmation */}
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.4, duration: 0.4 }}
                                                className="mt-5 w-full rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/30 p-4"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-xs text-emerald-600 font-medium">
                                                            Amount Submitted
                                                        </p>
                                                        <p className="text-xl font-bold text-emerald-700">
                                                            {formatNGN(registrationData.amountNGN)}
                                                        </p>
                                                    </div>
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                                                        <BadgeCheck className="h-5 w-5 text-emerald-600" />
                                                    </div>
                                                </div>
                                            </motion.div>

                                            {/* What happens next */}
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.5, duration: 0.4 }}
                                                className="mt-6 w-full space-y-3 text-left"
                                            >
                                                <p className="text-sm font-semibold text-foreground">
                                                    What happens next?
                                                </p>
                                                <div className="space-y-3">
                                                    <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
                                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#C0522B]/10">
                                                            <Clock className="h-3.5 w-3.5 text-[#C0522B]" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-foreground">
                                                                Cloud Engineer Reviews Receipt
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                Typically within 24–48 hours
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
                                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#C0522B]/10">
                                                            <ShieldCheck className="h-3.5 w-3.5 text-[#C0522B]" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-foreground">
                                                                Account Gets Activated
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                You&apos;ll receive a confirmation email
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
                                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#C0522B]/10">
                                                            <GraduationCap className="h-3.5 w-3.5 text-[#C0522B]" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-foreground">
                                                                Start Managing Your School
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                Sign in and set up students, teachers, results,
                                                                and more
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>

                                            {/* Need urgent help */}
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.6, duration: 0.4 }}
                                                className="mt-5 w-full flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3"
                                            >
                                                <Info className="h-4 w-4 shrink-0 text-blue-500" />
                                                <p className="text-xs text-blue-700">
                                                    Need urgent activation? Contact us on WhatsApp:{" "}
                                                    <a
                                                        href="https://wa.me/2349133273608"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="font-semibold underline"
                                                    >
                                                        09133273608
                                                    </a>
                                                </p>
                                            </motion.div>

                                            {/* Actions */}
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.7, duration: 0.4 }}
                                                className="mt-8 flex flex-col gap-3 w-full"
                                            >
                                                <Button
                                                    onClick={() => navigate("login")}
                                                    className="w-full text-white"
                                                    style={{ backgroundColor: "#C0522B" }}
                                                >
                                                    <ArrowRight className="mr-2 h-4 w-4" />
                                                    Proceed to Sign In
                                                </Button>
                                            </motion.div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Sign in link */}
                        {!isUploaded && (
                            <p className="pt-4 text-center text-sm text-muted-foreground">
                                Already have an active account?{" "}
                                <button
                                    type="button"
                                    onClick={() => navigate("login")}
                                    className="font-semibold transition-colors hover:underline"
                                    style={{ color: "#C0522B" }}
                                >
                                    Sign In
                                </button>
                            </p>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}