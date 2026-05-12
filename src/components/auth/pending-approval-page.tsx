"use client";

import { motion } from "framer-motion";
import { CheckCircle, Clock, Mail, ArrowLeft, GraduationCap } from "lucide-react";
import { useAppStore } from "@/store/index";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PendingApprovalPage() {
  const navigate = useAppStore((s) => s.navigate);
  const pendingSchoolName = useAppStore((s) => s.pendingSchoolName);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-6 py-4">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: "#821329" }}
        >
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold">SchoolDesk</span>
      </div>

      {/* Content */}
      <div className="flex flex-1 items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <Card className="border-0 shadow-lg">
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

              {/* Waiting info */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="mt-6 w-full rounded-lg border border-amber-200 bg-amber-50 p-4 text-left"
              >
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Pending Admin Review</p>
                    <p className="mt-1 text-xs text-amber-700">
                      Your account is currently under review. Once approved by our team, you will be able to sign in and start using the platform. This typically takes 24-48 hours.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* What happens next */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.4 }}
                className="mt-6 w-full space-y-3"
              >
                <p className="text-sm font-semibold text-foreground">What happens next?</p>
                <div className="space-y-2 text-left">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">1</span>
                    Our team reviews your registration details
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">2</span>
                    Your account gets approved (or rejected with reason)
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">3</span>
                    You can then sign in and start managing your school
                  </div>
                </div>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.4 }}
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
                  href="mailto:support@schooldesk.com"
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
