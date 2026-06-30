"use client";

import { motion } from "framer-motion";
import { CheckCircle, Clock, Mail, ArrowLeft, GraduationCap, ShieldCheck, Server, Cloud, CreditCard } from "lucide-react";
import { useAppStore } from "@/store/index";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PendingApprovalPage() {
  const navigate = useAppStore((s) => s.navigate);
  const pendingSchoolName = useAppStore((s) => s.pendingSchoolName);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-white px-6 py-4 shadow-sm">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: "#821329" }}
        >
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold">SIMS</span>
      </div>

      {/* Content */}
      <div className="flex flex-1 items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <Card className="border-0 shadow-xl">
            <CardContent className="flex flex-col items-center p-8 text-center">
              {/* Success icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
                className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-50"
              >
                <CheckCircle className="h-10 w-10 text-green-500" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                <h2 className="text-2xl font-bold text-foreground">
                  Registration Submitted!
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your school <span className="font-semibold text-foreground">"{pendingSchoolName}"</span> has been registered successfully.
                </p>
              </motion.div>

              {/* ─── Payment Approval Notice ─── */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="mt-6 w-full rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/50 p-5 text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                    <ShieldCheck className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-900">
                      Payment Awaiting Cloud Engineer Approval
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-amber-700">
                      Your subscription payment is currently being reviewed by our Cloud Engineer for security verification and cloud storage provisioning. You will receive a confirmation email once your account is activated.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* What happens next — updated */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.4 }}
                className="mt-6 w-full space-y-3"
              >
                <p className="text-sm font-semibold text-foreground">What happens next?</p>
                <div className="space-y-3 text-left">
                  <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#821329]/10">
                      <Cloud className="h-3.5 w-3.5 text-[#821329]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Cloud Engineer Verifies Payment</p>
                      <p className="text-xs text-muted-foreground">Our engineer reviews and provisions your cloud storage & security</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#821329]/10">
                      <Server className="h-3.5 w-3.5 text-[#821329]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Account Gets Activated</p>
                      <p className="text-xs text-muted-foreground">You receive a confirmation email — typically within 24–48 hours</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#821329]/10">
                      <CreditCard className="h-3.5 w-3.5 text-[#821329]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Start Managing Your School</p>
                      <p className="text-xs text-muted-foreground">Sign in and set up students, teachers, results, and more</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Email notice */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.85, duration: 0.4 }}
                className="mt-5 flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3"
              >
                <Mail className="h-4 w-4 shrink-0 text-blue-500" />
                <p className="text-xs text-blue-700">
                  A confirmation email has been sent to the email address you provided during registration.
                </p>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.95, duration: 0.4 }}
                className="mt-8 flex flex-col gap-3 w-full"
              >
                <Button
                  onClick={() => navigate("login")}
                  className="w-full text-white"
                  style={{ backgroundColor: "#821329" }}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sign In
                </Button>
                <a
                  href="mailto:support@chyksys.com"
                  className="flex items-center justify-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Mail className="h-4 w-4" />
                  Contact Support
                </a>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}