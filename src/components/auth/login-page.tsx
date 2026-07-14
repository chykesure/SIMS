//src/components/auth/login-page.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  Mail,
  Lock,
  Loader2,
  Shield,
  Check,
  Star,
  Crown,
  Zap,
  Users,
  FileText,
  Award,
  BarChart3,
  BookOpen,
  School,
  CreditCard,
  Settings,
  ChevronRight,
  ArrowRight,
  X,
  Globe,
  Smartphone,
  Clock,
  HeadphonesIcon,
  ShieldCheck,
  Wallet,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/store/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Status Error Message
// ---------------------------------------------------------------------------

function StatusMessage({ code, message }: { code: string; message: string }) {
  const config: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; title: string }> = {
    TENANT_PENDING: { icon: Clock, color: "text-amber-600", title: "Account Pending Approval" },
    TENANT_REJECTED: { icon: X, color: "text-red-600", title: "Registration Rejected" },
    TENANT_SUSPENDED: { icon: Shield, color: "text-red-600", title: "Account Suspended" },
  };
  const cfg = config[code] || config.TENANT_PENDING;
  const Icon = cfg.icon;
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${cfg.color}`} />
        <div>
          <p className={`text-sm font-semibold ${cfg.color}`}>{cfg.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Carousel Data
// ---------------------------------------------------------------------------

const CAROUSEL_SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&h=675&fit=crop&q=80",
    title: "Smart School Management",
    description: "Everything you need to run your school efficiently from one powerful platform.",
  },
  {
    image: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1200&h=675&fit=crop&q=80",
    title: "Track Academic Performance",
    description: "Automatic result computation, positions, and beautiful report cards for every student.",
  },
  {
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&h=675&fit=crop&q=80",
    title: "Manage Finances Seamlessly",
    description: "Track school fees, payments, and generate detailed financial reports in real time.",
  },
  {
    image: "https://images.unsplash.com/photo-1588072432836-e10032774350?w=1200&h=675&fit=crop&q=80",
    title: "Digital Classrooms",
    description: "Create virtual classrooms, share materials, post assignments, and engage your students.",
  },
];

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const FEATURES = [
  { icon: Users, title: "Student Management", desc: "Manage student records, classes, and admission seamlessly." },
  { icon: BookOpen, title: "Academic Structure", desc: "Organize subjects, sessions, exams, and grading systems." },
  { icon: FileText, title: "Report Cards", desc: "Generate professional termly report cards with remarks." },
  { icon: Award, title: "Result Computation", desc: "Automatic score computation, positions, and broadsheets." },
  { icon: BarChart3, title: "Analytics Dashboard", desc: "Visual insights into student performance and trends." },
  { icon: School, title: "Multi-Tenant", desc: "Each school gets its own isolated, branded workspace." },
  { icon: Wallet, title: "Finance Management", desc: "Track fees, payments, and financial reports." },
  { icon: CreditCard, title: "Subscription Plans", desc: "Flexible tiers — 4 plans from ₦20,000/term." },
  { icon: Settings, title: "Customizable Settings", desc: "Tailor assessments, signatures, and school branding." },
];

// Fallback plans used only if the API call fails
const FALLBACK_PLANS = [
  {
    id: "basic", name: "Basic", subtitle: "For small schools", price: "₦20,000", period: "/term",
    icon: "Zap", color: "border-slate-200", popular: false,
    features: ["Up to 50 students", "Up to 5 admin users", "Student & teacher management", "Basic exam & result tracking", "Simple report cards", "Email notifications"],
    cta: "Get Started",
  },
  {
    id: "intermediate", name: "Intermediate", subtitle: "For growing schools", price: "₦35,000", period: "/term",
    icon: "Star", color: "border-sky-200", popular: false,
    features: ["Up to 200 students", "Up to 15 admin users", "Advanced score analytics", "Custom assessment settings", "Broadsheet & class position", "Termly report cards with remarks", "Priority email support"],
    cta: "Start Intermediate Plan",
  },
  {
    id: "premium", name: "Premium", subtitle: "For established schools", price: "₦40,000", period: "/term",
    icon: "Crown", color: "border-amber-200", popular: true,
    features: ["Up to 500 students", "Up to 30 admin users", "Full analytics dashboard", "Custom school branding", "Finance management", "Digital classroom", "Dedicated support", "Data export (Excel/PDF)"],
    cta: "Start Premium Plan",
  },
  {
    id: "growth", name: "Growth", subtitle: "For large school networks", price: "₦50,000", period: "/term",
    icon: "Shield", color: "border-emerald-200", popular: false,
    features: ["Unlimited students", "Up to 99 admin users", "Multi-campus support", "API access", "Staff performance tracking", "Custom integrations", "Account manager", "White-label options", "SLA guarantee"],
    cta: "Start Growth Plan",
  },
];

// Icon lookup map for dynamic plans (icon name string → React component)
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap, Star, Crown, Shield,
};

const STATS = [
  { value: "500+", label: "Schools Managed" },
  { value: "50,000+", label: "Students Tracked" },
  { value: "99.9%", label: "Uptime" },
  { value: "24/7", label: "Support" },
];

// ---------------------------------------------------------------------------
// Image Carousel
// ---------------------------------------------------------------------------

function ImageCarousel() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const total = CAROUSEL_SLIDES.length;

  const next = useCallback(() => { setCurrent((prev) => (prev + 1) % total); }, [total]);
  const prev = useCallback(() => { setCurrent((prev) => (prev - 1 + total) % total); }, [total]);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, isPaused]);

  const slide = CAROUSEL_SLIDES[current];

  return (
    <div className="relative w-full" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
      <div className="relative mx-auto aspect-[16/7] w-full overflow-hidden rounded-2xl shadow-2xl sm:aspect-[16/6] lg:aspect-[2.2/1]">
        {CAROUSEL_SLIDES.map((s, i) => (
          <div key={i} className={cn("absolute inset-0 transition-opacity duration-700 ease-in-out", i === current ? "z-10 opacity-100" : "z-0 opacity-0")}>
            <img src={s.image} alt={s.title} className="h-full w-full object-cover" loading={i === 0 ? "eager" : "lazy"} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20" />
          </div>
        ))}
        <div className="absolute inset-x-0 bottom-0 z-20 px-6 pb-8 sm:px-12 sm:pb-10 lg:px-16 lg:pb-12">
          <AnimatePresence mode="wait">
            <motion.div key={current} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4, delay: 0.1 }}>
              <h3 className="text-xl font-bold text-white drop-shadow-lg sm:text-2xl lg:text-4xl">{slide.title}</h3>
              <p className="mt-2 max-w-2xl text-sm text-white/90 sm:text-base lg:text-lg">{slide.description}</p>
            </motion.div>
          </AnimatePresence>
        </div>
        <button onClick={prev} className="absolute left-4 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white shadow-lg backdrop-blur-sm transition-all hover:bg-white/40 hover:shadow-xl sm:left-6" aria-label="Previous slide">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button onClick={next} className="absolute right-4 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white shadow-lg backdrop-blur-sm transition-all hover:bg-white/40 hover:shadow-xl sm:right-6" aria-label="Next slide">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
        <div className="absolute inset-x-0 bottom-0 z-20 h-1 bg-black/20">
          <motion.div className="h-full bg-white/60" initial={{ width: "0%" }} animate={{ width: isPaused ? undefined : "100%" }} transition={isPaused ? {} : { duration: 5, ease: "linear" }} key={current} />
        </div>
      </div>
      <div className="mt-5 flex items-center justify-center gap-2">
        {CAROUSEL_SLIDES.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)} aria-label={`Go to slide ${i + 1}`} className={cn("h-2 rounded-full transition-all duration-300", i === current ? "w-8 bg-[#C0522B]" : "w-2 bg-slate-300 hover:bg-slate-400")} />
        ))}
        <span className="ml-3 text-xs font-medium text-slate-400">{current + 1} / {total}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Passcode Dialog
// ---------------------------------------------------------------------------

function PasscodeDialog({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    try {
      const res = await fetch("/api/auth/verify-passcode", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode }) });
      const data = await res.json();
      if (data.valid) { setError(false); onSuccess(); }
      else { setError(true); setShaking(true); setTimeout(() => setShaking(false), 500); setTimeout(() => setError(false), 2000); }
    } catch { setError(true); setShaking(true); setTimeout(() => setShaking(false), 500); setTimeout(() => setError(false), 2000); }
    finally { setVerifying(false); }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100"><KeyRound className="h-5 w-5 text-slate-700" /></div>
            Access Verification
          </DialogTitle>
          <DialogDescription>Enter the platform access code to continue.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="flex justify-center gap-3 pt-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={cn("flex h-12 w-12 items-center justify-center rounded-xl border-2 text-xl font-bold transition-all duration-200", i < passcode.length ? (error ? "border-red-300 bg-red-50 text-red-500" : "border-[#C0522B] bg-[#C0522B]/5 text-[#C0522B]") : "border-slate-200 bg-slate-50 text-slate-300")}>
                {i < passcode.length ? "\u2022" : ""}
              </div>
            ))}
          </div>
          <div className="relative">
            <Label className="mb-2 block text-sm text-muted-foreground">Enter 4-digit passcode</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="password" inputMode="numeric" maxLength={4} placeholder="\u2022\u2022\u2022\u2022" value={passcode} onChange={(e) => { const val = e.target.value.replace(/\D/g, "").slice(0, 4); setPasscode(val); setError(false); if (val.length === 4) { handleSubmit({ preventDefault: () => { } } as React.FormEvent); } }} className="pl-10 text-center text-lg tracking-[0.5em]" autoFocus />
            </div>
          </div>
          {error && (
            <motion.div initial={{ opacity: 0, x: 0 }} animate={shaking ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : {}} className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
              <p className="text-xs font-medium text-red-600">Incorrect passcode. Please try again.</p>
            </motion.div>
          )}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1 text-white" style={{ backgroundColor: "#C0522B" }} disabled={passcode.length < 4 || verifying}>
              {verifying ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Verifying...</> : <>Verify <Shield className="ml-1.5 h-4 w-4" /></>}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Forgot Password Dialog
// ---------------------------------------------------------------------------

function ForgotPasswordDialog({ onClose, onBackToLogin }: { onClose: () => void; onBackToLogin: () => void }) {
  const [step, setStep] = useState<"email" | "code" | "success">("email");
  const [email, setEmail] = useState("");
  const [resetCode, setResetCode] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError("Email is required"); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Failed to send reset code"); return; }
      if (!data.found) {
        setError("No account found with that email. Please check and try again.");
        return;
      }
      setStep("code");
    } catch {
      setError("An error occurred. Please try again.");
    } finally { setLoading(false); }
  };

  // Handle code input (auto-advance)
  const handleCodeInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCodes = [...resetCode];
    newCodes[index] = value.slice(-1);
    setResetCode(newCodes);
    setError("");
    // Auto-focus next input
    if (value && index < 5) {
      const next = document.getElementById(`reset-code-${index + 1}`);
      next?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !resetCode[index] && index > 0) {
      const prev = document.getElementById(`reset-code-${index - 1}`);
      prev?.focus();
    }
  };

  // Handle paste
  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const newCodes = pasted.split("");
      setResetCode(newCodes);
      setError("");
      document.getElementById("reset-code-5")?.focus();
    }
  };

  // Step 2: Verify code and reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = resetCode.join("");
    if (code.length !== 6) { setError("Please enter the full 6-digit code"); return; }
    if (newPassword.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), resetCode: code, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Failed to reset password"); return; }
      setStep("success");
    } catch {
      setError("An error occurred. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
              <KeyRound className="h-5 w-5 text-blue-600" />
            </div>
            {step === "email" && "Forgot Password"}
            {step === "code" && "Enter Reset Code"}
            {step === "success" && "Password Reset!"}
          </DialogTitle>
          <DialogDescription>
            {step === "email" && "Enter your email to receive a password reset code."}
            {step === "code" && "Enter the 6-digit code sent to your email."}
            {step === "success" && "Your password has been updated successfully."}
          </DialogDescription>
        </DialogHeader>

        {/* STEP 1: Enter Email */}
        {step === "email" && (
          <form onSubmit={handleSendCode} className="mt-2 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="Enter your recovery or login email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  required
                  className="pl-10"
                  autoFocus
                />
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                <p className="text-xs font-medium text-red-600">{error}</p>
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" onClick={onBackToLogin} className="flex-1">Back</Button>
              <Button
                type="submit"
                className="flex-1 text-white"
                style={{ backgroundColor: "#C0522B" }}
                disabled={loading}
              >
                {loading ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Sending...</> : "Send Reset Code"}
              </Button>
            </div>
          </form>
        )}

        {/* STEP 2: Enter Code + New Password */}
        {step === "code" && (
          <form onSubmit={handleResetPassword} className="mt-2 space-y-4">
            {/* Code input boxes */}
            <div className="space-y-2">
              <Label>6-Digit Reset Code</Label>
              <div className="flex justify-center gap-2" onPaste={handleCodePaste}>
                {resetCode.map((digit, i) => (
                  <input
                    key={i}
                    id={`reset-code-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeInput(i, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                    className="h-12 w-11 rounded-lg border-2 border-slate-200 bg-slate-50 text-center text-lg font-bold text-slate-900 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none"
                    autoFocus={i === 0}
                  />
                ))}
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Check your email for the code. <button type="button" onClick={() => { setStep("email"); setResetCode(["", "", "", "", "", ""]); }} className="text-blue-600 hover:underline">Resend</button>
              </p>
            </div>

            <div className="relative"><Separator /></div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="forgot-new-password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="forgot-new-password"
                  type={showNew ? "text" : "password"}
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                  required
                  minLength={6}
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="forgot-confirm-password">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="forgot-confirm-password"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                  required
                  minLength={6}
                  className={cn("pl-10 pr-10", confirmPassword && newPassword !== confirmPassword && "border-red-300 focus:border-red-500")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                <p className="text-xs font-medium text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => setStep("email")} className="flex-1">Back</Button>
              <Button
                type="submit"
                className="flex-1 text-white"
                style={{ backgroundColor: "#C0522B" }}
                disabled={loading}
              >
                {loading ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Resetting...</> : "Reset Password"}
              </Button>
            </div>
          </form>
        )}

        {/* STEP 3: Success */}
        {step === "success" && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="size-9 text-emerald-600" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">Password Updated!</p>
              <p className="mt-1 text-sm text-muted-foreground">You can now sign in with your new password.</p>
            </div>
            <Button
              onClick={onBackToLogin}
              className="mt-2 text-white"
              style={{ backgroundColor: "#C0522B" }}
            >
              Back to Sign In
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Landing Page
// ---------------------------------------------------------------------------

export default function LoginPage() {
  const login = useAppStore((s) => s.login);
  const setTenant = useAppStore((s) => s.setTenant);
  const setSuperAdmin = useAppStore((s) => s.setSuperAdmin);
  const navigate = useAppStore((s) => s.navigate);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusError, setStatusError] = useState<{ code: string; message: string } | null>(null);

  // Dynamic plans from DB (replaces hardcoded PLANS)
  const [plans, setPlans] = useState(FALLBACK_PLANS);

  // Fetch plans from API on mount
  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch("/api/plans");
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.plans) && data.plans.length > 0) {
            const mapped = data.plans.map((p: Record<string, unknown>) => ({
              ...p,
              icon: typeof p.icon === "string" ? p.icon : "Zap",
              color: typeof p.color === "string" ? p.color : "border-slate-200",
              features: Array.isArray(p.features) ? p.features.map((f: unknown) => (typeof f === "string" ? f : (f as Record<string, string>).label || "")) : [],
              cta: typeof p.cta === "string" ? p.cta : `Start ${p.name} Plan`,
              popular: p.popular === true || p.id === "premium",
            }));
            setPlans(mapped);
          }
        }
      } catch { /* Silently fall back to FALLBACK_PLANS */ }
    }
    fetchPlans();
  }, []);

  const [showPasscode, setShowPasscode] = useState(false);
  const [showDevLogin, setShowDevLogin] = useState(false);
  const [devEmail, setDevEmail] = useState("");
  const [devPassword, setDevPassword] = useState("");
  const [devLoading, setDevLoading] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.ctrlKey && e.altKey && e.key.toLowerCase() === "q") { e.preventDefault(); setShowPasscode(true); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsLoading(true); setStatusError(null);
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) { if (data.code && data.code.startsWith("TENANT_")) { setStatusError({ code: data.code, message: data.message }); return; } throw new Error(data.error || data.message || "Login failed"); }
      if (data.tenant) setTenant(data.tenant);
      login({ id: data.user.id, email: data.user.email, username: data.user.username, role: data.user.role, imageUrl: data.user.imageUrl, tenantId: data.user.tenantId || null });
      toast.success("Welcome back!", { description: `Signed in as ${data.user.username}` });
      setShowLoginModal(false);

      // Role-based redirect
      if (data.user.role === "STUDENT") {
        navigate("student-dashboard");
      } else {
        navigate("dashboard");
      }
    } catch (err) { toast.error("Login failed", { description: err instanceof Error ? err.message : "An unexpected error occurred" }); }
    finally { setIsLoading(false); }
  };

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setDevLoading(true);
    try {
      const res = await fetch("/api/auth/super-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: devEmail, password: devPassword }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Developer login failed");
      setSuperAdmin(true);
      login({ id: data.user.id, email: data.user.email, username: data.user.username, role: data.user.role, imageUrl: data.user.imageUrl, tenantId: null });
      setShowDevLogin(false);
      toast.success("Developer access granted", { description: "Welcome to the Platform Admin dashboard" });
    } catch (err) { toast.error("Developer login failed", { description: err instanceof Error ? err.message : "Invalid credentials" }); }
    finally { setDevLoading(false); }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* NAVIGATION BAR */}
      <motion.nav initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }} className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ backgroundColor: "#C0522B" }}><GraduationCap className="h-5 w-5" /></div>
            <span className="text-xl font-bold tracking-tight text-slate-900">CHYKSYS</span>
          </div>
          <div className="hidden items-center gap-6 md:flex">
            <a href="/" className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">Homepage</a>
            <button onClick={() => navigate("admission")} className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">Admission</button>
            <button onClick={() => navigate("register")} className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">Register</button>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" className="text-sm text-white" style={{ backgroundColor: "#C0522B" }} onClick={() => { setShowLoginModal(true); setStatusError(null); }}>Sign In <ArrowRight className="ml-1.5 h-4 w-4" /></Button>
          </div>
        </div>
      </motion.nav>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-orange-50/30" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, #C0522B 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20 lg:py-24">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge variant="outline" className="mb-6 gap-2 border-orange-200 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700"><span className="h-1.5 w-1.5 rounded-full bg-orange-500" /> Trusted by 500+ schools across Nigeria</Badge>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl" style={{ fontFamily: 'Georgia, serif' }}>The Complete <span className="relative"><span style={{ color: "#C0522B" }}>School Management</span><svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 8" fill="none"><path d="M2 6c40-4 80-4 120-2s60 2 76-2" stroke="#C0522B" strokeWidth="3" strokeLinecap="round" opacity="0.3" /></svg></span> Platform</h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">Manage students, compute results, generate report cards, track admissions, and handle school finances — all in one powerful platform built for Nigerian schools.</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" className="h-12 px-8 text-base font-semibold text-white shadow-lg" style={{ backgroundColor: "#C0522B" }} onClick={() => navigate("register")}>Get Started Free <ChevronRight className="ml-1 h-5 w-5" /></Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base font-semibold text-slate-700" onClick={() => { setShowLoginModal(true); setStatusError(null); }}>Sign In to Dashboard</Button>
            </div>
            <div className="mt-12 flex items-center justify-center gap-10 sm:gap-14">
              {STATS.map((s) => (<div key={s.label} className="text-center"><p className="text-xl font-bold" style={{ color: "#C0522B" }}>{s.value}</p><p className="text-[11px] text-slate-500">{s.label}</p></div>))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CAROUSEL SECTION */}
      <section className="relative bg-slate-50/50 px-4 pb-16 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="mx-auto max-w-6xl"><ImageCarousel /></motion.div>
      </section>

      {/* FEATURES SECTION */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-4 border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Everything You Need</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl" style={{ fontFamily: 'Georgia, serif' }}>Powerful Features for Every School</h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">From student enrollment to result computation, CHYKSYS covers every aspect of school administration.</p>
          </motion.div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => { const Icon = feature.icon; return (<motion.div key={feature.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.05 }} className="group rounded-2xl border border-slate-100 bg-white p-6 transition-all duration-200 hover:border-slate-200 hover:shadow-lg"><div className="flex h-12 w-12 items-center justify-center rounded-xl ring-1 ring-slate-100 transition-colors group-hover:ring-slate-200" style={{ backgroundColor: "rgba(192,82,43,0.06)" }}><Icon className="h-6 w-6" style={{ color: "#C0522B" }} /></div><h3 className="mt-4 text-base font-semibold text-slate-900">{feature.title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-500">{feature.desc}</p></motion.div>); })}
          </div>
        </div>
      </section>

      {/* WHY CHYKSYS */}
      <section className="border-t border-slate-100 bg-gradient-to-b from-slate-50/80 to-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl" style={{ fontFamily: 'Georgia, serif' }}>Why Schools Choose CHYKSYS</h2>
            <p className="mt-4 text-base text-slate-600">Built specifically for the Nigerian education system with features that matter most.</p>
          </motion.div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[{ icon: Globe, title: "Cloud-Based", desc: "Access your school data from anywhere, on any device. No installations needed." }, { icon: Smartphone, title: "Mobile Friendly", desc: "Responsive design works perfectly on phones, tablets, and desktops." }, { icon: ShieldCheck, title: "Secure & Private", desc: "Each school's data is fully isolated. Enterprise-grade security." }, { icon: HeadphonesIcon, title: "24/7 Support", desc: "Get help whenever you need it. We're always here for you." }].map((item, i) => { const Icon = item.icon; return (<motion.div key={item.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.1 }} className="text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-100"><Icon className="h-6 w-6" style={{ color: "#C0522B" }} /></div><h3 className="mt-4 text-sm font-semibold text-slate-900">{item.title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-500">{item.desc}</p></motion.div>); })}
          </div>
        </div>
      </section>

      {/* PRICING TIERS — now dynamic from database */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-4 border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">Simple Pricing</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl" style={{ fontFamily: 'Georgia, serif' }}>Choose the Right Plan for Your School</h2>
            <p className="mt-4 text-base text-slate-600">Start free and scale as your school grows. No hidden fees, no surprises.</p>
          </motion.div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan, i) => {
              const Icon = typeof plan.icon === "string" ? (ICON_MAP[plan.icon] || Zap) : plan.icon;
              return (
                <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }} className={cn("relative flex flex-col overflow-hidden rounded-2xl border bg-white transition-shadow hover:shadow-xl", plan.popular ? "border-amber-300 ring-2 ring-amber-100" : "border-slate-200")}>
                  {plan.popular && (<div className="absolute right-4 top-4"><Badge className="border-amber-500 bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">MOST POPULAR</Badge></div>)}
                  <div className="p-8">
                    <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", plan.popular ? "bg-amber-50" : "bg-slate-50")}><Icon className={cn("h-6 w-6", plan.popular ? "text-amber-600" : "text-slate-500")} /></div>
                    <h3 className="mt-4 text-xl font-bold text-slate-900">{plan.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{plan.subtitle}</p>
                    <div className="mt-4 flex items-baseline gap-1"><span className="text-3xl font-extrabold text-slate-900">{plan.price}</span><span className="text-sm text-slate-400">{plan.period}</span></div>
                  </div>
                  <div className="flex-1 border-t border-slate-100 px-8 py-6"><ul className="space-y-3">{plan.features.map((f) => (<li key={f} className="flex items-start gap-2.5 text-sm text-slate-600"><Check className={cn("mt-0.5 h-4 w-4 shrink-0", plan.popular ? "text-amber-500" : "text-emerald-500")} /><span>{f}</span></li>))}</ul></div>
                  <div className="border-t border-slate-100 px-8 py-6"><Button className={cn("w-full font-semibold", plan.popular ? "bg-amber-500 text-white hover:bg-amber-600" : plan.id === "free" ? "" : "border-slate-200 text-slate-700 hover:bg-slate-50")} variant={plan.id === "free" ? "default" : "outline"} onClick={() => navigate("register")}>{plan.cta} <ArrowRight className="ml-1.5 h-4 w-4" /></Button></div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <GraduationCap className="mx-auto h-12 w-12 text-white/20" />
            <h2 className="mt-6 text-3xl font-bold text-white sm:text-4xl" style={{ fontFamily: 'Georgia, serif' }}>Ready to Transform Your School?</h2>
            <p className="mt-4 text-base text-slate-400">Join hundreds of schools already using CHYKSYS to manage everything efficiently.</p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" className="h-12 px-8 text-base font-semibold text-white shadow-lg" style={{ backgroundColor: "#C0522B" }} onClick={() => navigate("register")}>Create Your School Account <ArrowRight className="ml-1.5 h-5 w-5" /></Button>
              <Button size="lg" variant="outline" className="h-12 border-slate-600 px-8 text-base text-slate-300 hover:bg-white/5" onClick={() => navigate("admission")}>Admission Portal</Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-100 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2"><div className="flex h-7 w-7 items-center justify-center rounded-md text-white" style={{ backgroundColor: "#C0522B" }}><GraduationCap className="h-4 w-4" /></div><span className="text-sm font-semibold text-slate-900">CHYKSYS</span></div>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <a href="/" className="transition-colors hover:text-slate-700">Homepage</a>
              <button onClick={() => navigate("admission")} className="transition-colors hover:text-slate-700">Admission</button>
              <button onClick={() => navigate("register")} className="transition-colors hover:text-slate-700">Register</button>
              <button onClick={() => { setShowLoginModal(true); setStatusError(null); }} className="transition-colors hover:text-slate-700">Sign In</button>
            </div>
            <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} CHYKSYS. All rights reserved.</p>
          </div>
          <div className="mt-8 text-center"><button onClick={() => setShowPasscode(true)} className="inline-flex items-center gap-1 text-[10px] text-slate-300 transition-colors hover:text-slate-400"><Shield className="h-3 w-3" /> Platform Admin</button></div>
        </div>
      </footer>

      {/* LOGIN MODAL */}
      <Dialog open={showLoginModal} onOpenChange={(open) => { setShowLoginModal(open); if (!open) setStatusError(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ backgroundColor: "#C0522B" }}><GraduationCap className="h-5 w-5" /></div><div><DialogTitle className="text-xl">Welcome Back</DialogTitle><DialogDescription>Sign in to your school dashboard</DialogDescription></div></div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="mt-2 space-y-4">
            {statusError && <StatusMessage code={statusError.code} message={statusError.message} />}
            <div className="space-y-2"><Label htmlFor="email">Email or Reg Number</Label><div className="relative"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="email" type="text" placeholder="admin@school.com" value={email} onChange={(e) => { setEmail(e.target.value); setStatusError(null); }} required className="pl-10" /></div></div>
            <div className="space-y-2"><Label htmlFor="password">Password</Label><div className="relative"><Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="password" type="password" placeholder="Enter your password" value={password} onChange={(e) => { setPassword(e.target.value); setStatusError(null); }} required className="pl-10" /></div></div>
            <Button type="submit" className="w-full text-white" style={{ backgroundColor: "#C0522B" }} disabled={isLoading}>{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</> : "Sign In"}</Button>
          </form>
          <div className="mt-4 flex items-center justify-between text-sm">
            <button type="button" onClick={() => { navigate("register"); setShowLoginModal(false); }} className="font-medium transition-colors hover:underline" style={{ color: "#C0522B" }}>Don&apos;t have an account?</button>
            <button type="button" onClick={() => { setShowLoginModal(false); setShowForgotPassword(true); }} className="font-medium text-muted-foreground transition-colors hover:underline">Forgot Password?</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* FORGOT PASSWORD DIALOG */}
      {showForgotPassword && (
        <ForgotPasswordDialog
          onClose={() => setShowForgotPassword(false)}
          onBackToLogin={() => { setShowForgotPassword(false); setShowLoginModal(true); }}
        />
      )}

      {/* PASSCODE VERIFICATION */}
      {showPasscode && !showDevLogin && (<PasscodeDialog onSuccess={() => { setShowPasscode(false); setShowDevLogin(true); }} onClose={() => setShowPasscode(false)} />)}

      {/* DEVELOPER LOGIN DIALOG */}
      <Dialog open={showDevLogin} onOpenChange={setShowDevLogin}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Platform Admin Login</DialogTitle>
            <DialogDescription>Enter your developer credentials to access the platform dashboard.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDevLogin} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="devEmail">Developer Email</Label><Input id="devEmail" type="email" placeholder="admin@CHYKSYShool.ng" value={devEmail} onChange={(e) => setDevEmail(e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="devPassword">Password</Label><Input id="devPassword" type="password" placeholder="Developer password" value={devPassword} onChange={(e) => setDevPassword(e.target.value)} required /></div>
            <Button type="submit" className="w-full text-white" style={{ backgroundColor: "#C0522B" }} disabled={devLoading}>{devLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Authenticating...</> : "Access Dashboard"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}