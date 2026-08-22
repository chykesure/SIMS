"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReviewPendingData {
  totalPendingReview: number;
  pendingReviewMonths: string[];
  planName: string;
  tenantId: string;
  tenantName: string;
}

interface PaymentReviewPendingPageProps {
  data: ReviewPendingData;
  onBack: () => void;
}

function formatMonth(month: string): string {
  const [y, m] = month.split("-");
  const d = new Date(Number(y), Number(m) - 1);
  return d.toLocaleDateString("en-NG", { month: "long", year: "numeric" });
}

export function PaymentReviewPendingPage({ data, onBack }: PaymentReviewPendingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30 flex items-start justify-center py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl"
      >
        {/* Back button */}
        <button
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Login
        </button>

        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Payment Under Review</h1>
              <p className="mt-1 text-sm text-slate-500">
                {data.tenantName} — Your evidence has been received.
              </p>
            </div>
          </div>

          <div className="mt-4 bg-amber-50 rounded-xl px-4 py-3">
            <p className="text-sm text-amber-800 font-medium">
              {data.pendingReviewMonths.length} month(s) totalling <span className="text-lg font-bold">₦{Number(data.totalPendingReview).toLocaleString()}</span> is being verified.
            </p>
          </div>
        </div>

        {/* Months under review */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Months Under Review</h2>
          <div className="space-y-2">
            {data.pendingReviewMonths.map((month) => (
              <div
                key={month}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3"
              >
                <span className="text-sm font-medium text-slate-700">{formatMonth(month)}</span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                  <Clock className="h-3 w-3" /> Pending Review
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-slate-700 font-medium">What happens next?</p>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                Our team will verify your payment evidence and activate your account. This typically takes <strong>up to 24 hours</strong>. You will regain full access once verification is complete.
              </p>
            </div>
          </div>
        </div>

        {/* WhatsApp support */}
        <div className="text-center">
          <p className="text-sm text-slate-500 mb-3">If this takes more than 24 hours, contact support:</p>
          <Button
            variant="outline"
            className="gap-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
            onClick={() => window.open("https://wa.me/2349133273608", "_blank")}
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp: 09133273608
          </Button>
        </div>
      </motion.div>
    </div>
  );
}