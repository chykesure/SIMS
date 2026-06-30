"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  CheckCircle2,
  Copy,
  Check,
  AlertTriangle,
  ShieldCheck,
  User,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface CredentialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: "Student" | "Teacher" | "Parent";
  loginId: string;
  defaultPassword: string;
  userName: string;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`${label} copied to clipboard!`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy. Please copy manually.");
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
    >
      {copied ? (
        <>
          <Check className="size-3.5 text-emerald-500" />
          Copied
        </>
      ) : (
        <>
          <Copy className="size-3.5" />
          Copy
        </>
      )}
    </Button>
  );
}

const roleColors: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  Student: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    icon: "bg-blue-100 text-blue-600",
  },
  Teacher: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    icon: "bg-amber-100 text-amber-600",
  },
  Parent: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    icon: "bg-purple-100 text-purple-600",
  },
};

export function CredentialsDialog({
  open,
  onOpenChange,
  role,
  loginId,
  defaultPassword,
  userName,
}: CredentialsDialogProps) {
  const colors = roleColors[role] || roleColors.Student;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto flex flex-col items-center gap-3">
            {/* Animated success icon */}
            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                    delay: 0.1,
                  }}
                >
                  <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle2 className="size-9 text-emerald-600" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <DialogTitle className="text-xl font-bold">
                    Account Created Successfully!
                  </DialogTitle>
                  <DialogDescription className="mt-1.5 text-sm text-muted-foreground">
                    Share these login credentials with the {role.toLowerCase()}
                  </DialogDescription>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </DialogHeader>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="space-y-4"
            >
              {/* Role badge + User info */}
              <div className="flex items-center justify-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}
                >
                  <User className="size-3.5" />
                  {role} Account
                </span>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{userName}</span>
              </p>

              {/* Credentials ticket card */}
              <Card className={`border-2 ${colors.border} ${colors.bg} overflow-hidden`}>
                <CardContent className="p-0">
                  {/* Dashed top border */}
                  <div className="flex items-center gap-2 border-b border-dashed px-4 py-2" style={{ borderColor: `${colors.border}` }}>
                    <ShieldCheck className={`size-4 ${colors.text}`} />
                    <span className={`text-xs font-semibold uppercase tracking-wider ${colors.text}`}>
                      Login Credentials
                    </span>
                  </div>

                  <div className="divide-y divide-dashed" style={{ borderColor: `${colors.border}` }}>
                    {/* Login ID */}
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground">
                          Login ID
                        </p>
                        <p className="mt-0.5 truncate font-mono text-sm font-semibold text-foreground">
                          {loginId}
                        </p>
                      </div>
                      <CopyButton text={loginId} label="Login ID" />
                    </div>

                    {/* Default Password */}
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground">
                          Default Password
                        </p>
                        <p className="mt-0.5 truncate font-mono text-sm font-semibold text-foreground">
                          {defaultPassword}
                        </p>
                      </div>
                      <CopyButton text={defaultPassword} label="Password" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Warning banner */}
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <div className="text-xs leading-relaxed text-amber-800">
                  <p className="font-semibold">
                    Important: Password Change Required
                  </p>
                  <p className="mt-0.5">
                    The user must change their password on first login. Please
                    share these credentials securely and advise them to update
                    their password immediately.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <DialogFooter className="mt-2 sm:justify-center">
                <Button
                  onClick={() => onOpenChange(false)}
                  className="gap-2 px-8"
                >
                  <CheckCircle2 className="size-4" />
                  Done
                </Button>
              </DialogFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
