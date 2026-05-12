"use client";

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Mail,
  Lock,
  Loader2,
  School,
  MapPin,
  Phone,
  User,
  Building2,
  BookOpen,
  FileText,
  Users,
  CheckCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  Clock,
  Shield,
  Check,
  Sparkles,
  Globe,
  Camera,
  X,
  ImageIcon,
  Upload,
  Zap,
  Star,
  Crown,
  Rocket,
  BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/store/index";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NIGERIAN_STATES = [
  "Abia", "Abuja (FCT)", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi",
  "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo",
  "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano",
  "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger",
  "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba",
  "Yobe", "Zamfara",
];

const STEPS = [
  { id: 1, label: "School Info" },
  { id: 2, label: "Admin Account" },
  { id: 3, label: "Confirm" },
];

const perks = [
  { icon: Shield, label: "Secure & Private" },
  { icon: Globe, label: "Cloud-Based" },
  { icon: Users, label: "500+ Schools Trust Us" },
];

// Helper to determine plan from student count
function getRecommendedPlan(count: number): { id: string; name: string; price: string; maxStudents: number; maxUsers: string; icon: React.ComponentType<{ className?: string }> } | null {
  if (count <= 0) return null;
  if (count <= 50) {
    return { id: 'basic', name: 'Basic', price: '₦20,000/termly', maxStudents: 50, maxUsers: '3', icon: Zap };
  } else if (count <= 200) {
    return { id: 'intermediate', name: 'Intermediate', price: '₦35,000/termly', maxStudents: 200, maxUsers: '15', icon: Star };
  } else if (count <= 500) {
    return { id: 'premium', name: 'Premium', price: '₦40,000/termly', maxStudents: 500, maxUsers: 'Unlimited', icon: Crown };
  } else {
    return { id: 'growth', name: 'Growth', price: '₦50,000/termly', maxStudents: 999999, maxUsers: 'Unlimited', icon: Rocket };
  }
}

export default function RegisterPage() {
  const setPendingSchoolName = useAppStore((s) => s.setPendingSchoolName);
  const navigate = useAppStore((s) => s.navigate);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [schoolName, setSchoolName] = useState("");
  const [schoolMotto, setSchoolMotto] = useState("");
  const [schoolAddress, setSchoolAddress] = useState("");
  const [schoolPhone, setSchoolPhone] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [schoolState, setSchoolState] = useState("");
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null); // base64 string
  const [schoolLogoFile, setSchoolLogoFile] = useState<File | null>(null);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [studentCount, setStudentCount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const recommendedPlan = studentCount ? getRecommendedPlan(Number(studentCount) || 0) : null;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Invalid file", { description: "Please upload an image file (PNG, JPG, SVG)." });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File too large", { description: "Logo must be less than 2MB." });
      return;
    }

    setSchoolLogoFile(file);

    // Convert to base64 for preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setSchoolLogo(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setSchoolLogo(null);
    setSchoolLogoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const canGoNext = () => {
    if (step === 1) return schoolName.trim() !== "" && studentCount.trim() !== "";
    if (step === 2) return adminName.trim() !== "" && adminEmail.trim() !== "" && adminPassword.length >= 6 && adminPassword === confirmPassword;
    if (step === 3) return agreeTerms;
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreeTerms) {
      toast.error("Terms required", { description: "Please agree to the Terms of Service to continue." });
      return;
    }

    if (adminPassword !== confirmPassword) {
      toast.error("Password mismatch", { description: "Password and Confirm Password do not match." });
      return;
    }

    if (adminPassword.length < 6) {
      toast.error("Weak password", { description: "Password must be at least 6 characters long." });
      return;
    }

    setIsLoading(true);

    try {
      const payload: Record<string, unknown> = {
        school: {
          name: schoolName,
          motto: schoolMotto || undefined,
          address: schoolAddress || undefined,
          phone: schoolPhone || undefined,
          email: schoolEmail || undefined,
          state: schoolState || undefined,
          logo: schoolLogo || undefined,
          studentCount: Number(studentCount) || 0,
        },
        admin: {
          name: adminName,
          email: adminEmail,
          password: adminPassword,
        },
      };

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Registration failed");
      }

      toast.success("Registration submitted!", {
        description: "Your school account is pending admin approval.",
      });

      setPendingSchoolName(schoolName);
    } catch (err) {
      toast.error("Registration failed", {
        description: err instanceof Error ? err.message : "An unexpected error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* ========== LEFT BRANDING PANEL ========== */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative hidden w-[480px] flex-shrink-0 flex-col justify-between overflow-hidden px-10 py-12 text-white lg:flex"
        style={{ background: "linear-gradient(160deg, #C0522B 0%, #5a0d1c 50%, #3d0813 100%)" }}
      >
        {/* Decorative elements */}
        <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-white/[0.03]" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-white/[0.03]" />
        <div className="pointer-events-none absolute right-10 top-1/2 h-40 w-40 rounded-full bg-white/[0.02]" />

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">SchoolDesk</h1>
              <p className="text-xs font-light tracking-widest text-white/60">MANAGEMENT PLATFORM</p>
            </div>
          </div>

          {/* Hero text */}
          <div className="mt-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Join 500+ schools
            </div>
            <h2 className="mt-6 text-3xl font-bold leading-tight">
              Set up your school in{" "}
              <span className="text-white/70">under 5 minutes</span>
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
              Create your account, configure your school profile, and start managing students, results, and finances — all from one platform.
            </p>
          </div>
        </div>

        {/* Bottom perks */}
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-4">
            {perks.map((perk) => (
              <div key={perk.label} className="flex items-center gap-2 text-xs text-white/70">
                <perk.icon className="h-4 w-4 text-white/50" />
                <span>{perk.label}</span>
              </div>
            ))}
          </div>
          <div className="h-px bg-white/10" />
          <p className="text-[11px] text-white/30">
            &copy; {new Date().getFullYear()} SchoolDesk. All rights reserved.
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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: "#C0522B" }}>
            <GraduationCap className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold">Create School Account</span>
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
              Back to home
            </button>

            {/* Title */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Create Your School Account</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Fill in your school details to get started
              </p>
            </div>

            {/* Step indicator */}
            <div className="mb-8">
              <div className="flex items-center gap-2">
                {STEPS.map((s, i) => (
                  <React.Fragment key={s.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors"
                        style={
                          step > s.id
                            ? { backgroundColor: "#C0522B", color: "white" }
                            : step === s.id
                              ? { backgroundColor: "#C0522B", color: "white" }
                              : { backgroundColor: "#f1f5f9", color: "#94a3b8" }
                        }
                      >
                        {step > s.id ? <Check className="h-4 w-4" /> : s.id}
                      </div>
                      <span className={cn("hidden text-sm font-medium sm:inline", step >= s.id ? "text-slate-900" : "text-slate-400")}>
                        {s.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={cn("mx-1 h-px flex-1", step > s.id ? "bg-[#C0522B]" : "bg-slate-200")} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ===== STEP 1: SCHOOL INFO ===== */}
              {step === 1 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-5">

                  {/* School Logo Upload */}
                  <div className="space-y-2">
                    <Label>School Logo / Image</Label>
                    <div className="flex items-center gap-4">
                      {schoolLogo ? (
                        <div className="relative group">
                          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-50 shadow-sm">
                            <img src={schoolLogo} alt="School logo" className="h-full w-full object-cover" />
                          </div>
                          <button
                            type="button"
                            onClick={removeLogo}
                            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex h-20 w-20 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 text-slate-400 transition-all hover:border-[#C0522B] hover:bg-[#C0522B]/5 hover:text-[#C0522B]"
                        >
                          <ImageIcon className="h-6 w-6" />
                          <span className="text-[9px] font-medium">Upload</span>
                        </button>
                      )}
                      <div className="flex-1">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          {schoolLogo ? "Change logo" : "Choose file"}
                        </button>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          PNG, JPG or SVG. Max 2MB.
                        </p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Logo URL input */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Or paste your logo URL</Label>
                    <div className="flex gap-2">
                      <Input
                        type="url"
                        placeholder="https://example.com/logo.png"
                        value={logoUrl}
                        onChange={(e) => {
                          setLogoUrl(e.target.value);
                          if (e.target.value.trim()) setSchoolLogo(e.target.value.trim());
                          else if (!schoolLogoFile) setSchoolLogo("");
                        }}
                      />
                      {logoUrl && (
                        <img src={logoUrl} alt="Logo preview" className="h-10 w-10 rounded-lg object-contain border border-slate-200" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="schoolName">School Name <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="schoolName" placeholder="e.g. Grace International Academy" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} required className="pl-10" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="schoolMotto">School Motto</Label>
                    <div className="relative">
                      <BookOpen className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="schoolMotto" placeholder="e.g. Excellence in Character and Learning" value={schoolMotto} onChange={(e) => setSchoolMotto(e.target.value)} className="pl-10" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="schoolAddress">Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="schoolAddress" placeholder="School address" value={schoolAddress} onChange={(e) => setSchoolAddress(e.target.value)} className="pl-10" />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="schoolPhone">Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="schoolPhone" type="tel" placeholder="+234 800 000 0000" value={schoolPhone} onChange={(e) => setSchoolPhone(e.target.value)} className="pl-10" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="schoolState">State</Label>
                      <Select value={schoolState} onValueChange={setSchoolState}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {NIGERIAN_STATES.map((state) => (
                            <SelectItem key={state} value={state}>{state}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">
                      Number of Students <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      placeholder="e.g. 150"
                      min="1"
                      value={studentCount}
                      onChange={(e) => setStudentCount(e.target.value)}
                      required
                    />
                    <p className="text-xs text-slate-400">This helps us recommend the right plan for your school</p>
                  </div>

                  {/* Recommended Plan Card */}
                  {recommendedPlan && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/30 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                          <BadgeCheck className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-emerald-700">Recommended Plan</p>
                          <div className="mt-2 flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm">
                              <recommendedPlan.icon className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{recommendedPlan.name}</p>
                              <p className="text-xs text-slate-500">Up to {recommendedPlan.maxStudents >= 999999 ? 'Unlimited' : `${recommendedPlan.maxStudents.toLocaleString()}`} students · {recommendedPlan.maxUsers} users</p>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between rounded-lg bg-white/80 px-3 py-2">
                            <span className="text-lg font-extrabold text-emerald-700">{recommendedPlan.price}</span>
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Auto-assigned</span>
                          </div>
                          <p className="mt-1.5 text-[10px] text-emerald-600/80">
                            This plan will be applied when your registration is approved
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="schoolEmail">School Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="schoolEmail" type="email" placeholder="school@example.com" value={schoolEmail} onChange={(e) => setSchoolEmail(e.target.value)} className="pl-10" />
                    </div>
                  </div>

                  <Button type="button" onClick={() => setStep(2)} className="w-full py-5 text-sm font-semibold text-white" style={{ backgroundColor: "#C0522B" }} disabled={!schoolName.trim() || !studentCount.trim()}>
                    Continue
                    <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </Button>
                </motion.div>
              )}

              {/* ===== STEP 2: ADMIN ACCOUNT ===== */}
              {step === 2 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="adminName">Full Name <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="adminName" placeholder="Your full name" value={adminName} onChange={(e) => setAdminName(e.target.value)} required className="pl-10" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">Admin Email <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="adminEmail" type="email" placeholder="admin@school.com" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required className="pl-10" />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="adminPassword">Password <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="adminPassword" type={showPassword ? "text" : "password"} placeholder="Min 6 characters" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required className="pl-10 pr-10" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="confirmPassword" type={showConfirm ? "text" : "password"} placeholder="Re-enter password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="pl-10 pr-10" />
                        <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Password strength indicator */}
                  {adminPassword.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex gap-1">
                        {[1, 2, 3].map((level) => (
                          <div key={level} className={cn("h-1 flex-1 rounded-full transition-colors", adminPassword.length >= level * 3 ? (adminPassword.length >= 9 ? "bg-emerald-500" : adminPassword.length >= 6 ? "bg-amber-500" : "bg-red-400") : "bg-slate-100")} />
                        ))}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {adminPassword.length < 6 ? "Weak — add more characters" : adminPassword.length < 9 ? "Fair — consider adding numbers or symbols" : "Strong password"}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1 py-5 text-sm font-semibold">
                      <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                      Back
                    </Button>
                    <Button type="button" onClick={() => setStep(3)} className="flex-1 py-5 text-sm font-semibold text-white" style={{ backgroundColor: "#C0522B" }} disabled={!adminName.trim() || adminPassword.length < 6 || adminPassword !== confirmPassword}>
                      Review
                      <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* ===== STEP 3: REVIEW & CONFIRM ===== */}
              {step === 3 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-5">
                  {/* Review summary */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-5 space-y-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">School Information</p>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-start gap-3">
                          {schoolLogo ? (
                            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                              <img src={schoolLogo} alt="Logo" className="h-full w-full object-cover" />
                            </div>
                          ) : (
                            <School className="mt-0.5 h-4 w-4 text-muted-foreground" />
                          )}
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{schoolName || "—"}</p>
                            {schoolMotto && <p className="text-xs text-muted-foreground">{schoolMotto}</p>}
                          </div>
                        </div>
                        {schoolAddress && (
                          <div className="flex items-center gap-3 text-sm text-slate-600">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            {schoolAddress}
                            {schoolState && <span className="text-muted-foreground">· {schoolState}</span>}
                          </div>
                        )}
                        {(schoolPhone || schoolEmail) && (
                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            {schoolPhone && (
                              <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{schoolPhone}</span>
                            )}
                            {schoolEmail && (
                              <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{schoolEmail}</span>
                            )}
                          </div>
                        )}
                        {studentCount && (
                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-muted-foreground" />{Number(studentCount).toLocaleString()} students</span>
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: "#C0522B15", color: "#C0522B" }}>
                              {Number(studentCount) <= 50 ? "Basic Plan" : Number(studentCount) <= 200 ? "Intermediate Plan" : Number(studentCount) <= 500 ? "Premium Plan" : "Growth Plan"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="h-px bg-slate-200" />

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Admin Account</p>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                          {adminName ? adminName.charAt(0).toUpperCase() : "?"}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{adminName || "—"}</p>
                          <p className="text-xs text-muted-foreground">{adminEmail || "—"}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Approval notice */}
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5">
                    <div className="flex items-start gap-2.5">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      <p className="text-xs leading-relaxed text-amber-700">
                        <span className="font-semibold">Approval Required:</span> After submission, your school account will be reviewed by our team before you can access the system. This typically takes less than 24 hours.
                      </p>
                    </div>
                  </div>

                  {/* Terms */}
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => setAgreeTerms(!agreeTerms)}
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-input transition-colors"
                      style={agreeTerms ? { backgroundColor: "#C0522B", borderColor: "#C0522B" } : undefined}
                    >
                      {agreeTerms && <CheckCircle className="h-4 w-4 text-white" />}
                    </button>
                    <p className="text-sm text-muted-foreground">
                      I agree to the{" "}
                      <span className="cursor-pointer font-medium underline" style={{ color: "#C0522B" }}>Terms of Service</span>
                      {" "}and{" "}
                      <span className="cursor-pointer font-medium underline" style={{ color: "#C0522B" }}>Privacy Policy</span>
                    </p>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1 py-5 text-sm font-semibold">
                      <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                      Back
                    </Button>
                    <Button type="submit" className="flex-1 py-5 text-sm font-semibold text-white" style={{ backgroundColor: "#C0522B" }} disabled={isLoading || !agreeTerms}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Submit Registration
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Sign in link */}
              <p className="pt-4 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <button type="button" onClick={() => navigate("login")} className="font-semibold transition-colors hover:underline" style={{ color: "#C0522B" }}>
                  Sign In
                </button>
              </p>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
