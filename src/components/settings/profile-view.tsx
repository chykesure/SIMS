"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/store/index";
import { toast } from "sonner";
import {
  User,
  Mail,
  Shield,
  Building2,
  Calendar,
  KeyRound,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  MailWarning,
  Save,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function ProfileView() {
  const { user, tenant } = useAppStore();
  const primaryColor = tenant?.primaryColor || "#821329";
  const userInitial = user?.username?.charAt(0).toUpperCase() ?? "U";
  const userId = user?.id || "";
  const tenantId = tenant?.id || "";

  // ── Recovery email state ──
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoverySaved, setRecoverySaved] = useState(false);

  // ── Password change state ──
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Fetch recovery email on mount
  useEffect(() => {
    if (!userId) return;
    async function fetchRecovery() {
      try {
        const params = new URLSearchParams({ userId });
        if (tenantId) params.set("tenantId", tenantId);
        const res = await fetch(`/api/auth/get-recovery-email?${params}`);
        if (res.ok) {
          const data = await res.json();
          if (data.recoveryEmail) setRecoveryEmail(data.recoveryEmail);
        }
      } catch { /* ignore */ }
    }
    fetchRecovery();
  }, [userId, tenantId]);

  async function handleSaveRecoveryEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!recoveryEmail.trim()) {
      toast.error("Recovery email is required");
      return;
    }
    setRecoveryLoading(true);
    try {
      const res = await fetch("/api/auth/save-recovery-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          tenantId,
          recoveryEmail: recoveryEmail.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to save recovery email");
        return;
      }
      setRecoverySaved(true);
      toast.success("Recovery email saved!");
      setTimeout(() => setRecoverySaved(false), 3000);
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setRecoveryLoading(false);
    }
  }

  function resetPasswordForm() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setPasswordSuccess(false);
    setShowPasswordForm(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();

    if (!currentPassword) {
      toast.error("Current password is required");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (currentPassword === newPassword) {
      toast.error("New password must be different from current password");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Failed to change password");
        return;
      }

      setPasswordSuccess(true);
      toast.success("Password changed successfully!");
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* ── Profile Header Card ── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Avatar
              className="size-24 border-4 shadow-md"
              style={{ borderColor: primaryColor }}
            >
              <AvatarImage src={user?.imageUrl} alt={user?.username} />
              <AvatarFallback
                className="text-2xl font-bold text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {userInitial}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-bold text-foreground">
                {user?.username || "User"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {user?.email || "No email"}
              </p>
              <div className="flex items-center gap-2 mt-3 justify-center sm:justify-start">
                <Badge
                  variant="secondary"
                  className="font-medium"
                  style={{
                    backgroundColor: `${primaryColor}15`,
                    color: primaryColor,
                  }}
                >
                  <Shield className="size-3 mr-1" />
                  {user?.role || "Unknown Role"}
                </Badge>
                {user?.roles && user.roles.length > 0 && (
                  <div className="flex gap-1">
                    {user.roles
                      .filter((r) => r.toUpperCase() !== (user?.role || "").toUpperCase())
                      .map((role) => (
                        <Badge key={role} variant="outline" className="text-xs">
                          {role}
                        </Badge>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Account Details Card ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="size-4" />
            Account Details
          </CardTitle>
          <CardDescription>
            Your account information and school details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <User className="size-3" />
                Username
              </Label>
              <div className="flex h-10 items-center rounded-md border border-input bg-muted/50 px-3 text-sm">
                {user?.username || "—"}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Mail className="size-3" />
                Email Address
              </Label>
              <div className="flex h-10 items-center rounded-md border border-input bg-muted/50 px-3 text-sm">
                {user?.email || "—"}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Shield className="size-3" />
                Role
              </Label>
              <div className="flex h-10 items-center rounded-md border border-input bg-muted/50 px-3 text-sm">
                {user?.role || "—"}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Building2 className="size-3" />
                School / Tenant
              </Label>
              <div className="flex h-10 items-center rounded-md border border-input bg-muted/50 px-3 text-sm">
                {tenant?.name || "—"}
              </div>
            </div>

            {tenant?.plan && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="size-3" />
                  Current Plan
                </Label>
                <div className="flex h-10 items-center rounded-md border border-input bg-muted/50 px-3 text-sm">
                  {tenant.plan}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                User ID
              </Label>
              <div className="flex h-10 items-center rounded-md border border-input bg-muted/50 px-3 text-sm font-mono text-xs">
                {user?.id || "—"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Recovery Email Card ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MailWarning className="size-4" />
            Recovery Email
          </CardTitle>
          <CardDescription>
            This email will be used to send you a password reset code if you forget your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveRecoveryEmail} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recovery-email">Recovery Email Address</Label>
              <div className="flex gap-2">
                <Input
                  id="recovery-email"
                  type="email"
                  placeholder="e.g. yourname@gmail.com"
                  value={recoveryEmail}
                  onChange={(e) => { setRecoveryEmail(e.target.value); setRecoverySaved(false); }}
                  required
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={recoveryLoading || recoverySaved}
                  className="gap-2 shrink-0"
                  style={{ backgroundColor: primaryColor }}
                >
                  {recoveryLoading ? (
                    <><Loader2 className="size-4 animate-spin" />Saving...</>
                  ) : recoverySaved ? (
                    <><CheckCircle2 className="size-4" />Saved</>
                  ) : (
                    <><Save className="size-4" />Save</>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use a personal email you can access even if you lose your school login credentials.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Change Password Card ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="size-4" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your account password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showPasswordForm ? (
            <Button
              onClick={() => setShowPasswordForm(true)}
              className="gap-2"
              style={{ backgroundColor: primaryColor }}
            >
              <Lock className="size-4" />
              Change Password
            </Button>
          ) : passwordSuccess ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div
                className="flex size-14 items-center justify-center rounded-full"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <CheckCircle2 className="size-8" style={{ color: primaryColor }} />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold">Password Updated!</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your password has been changed successfully.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={resetPasswordForm}
                className="mt-2"
              >
                Done
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={handleChangePassword} className="space-y-4">
                {/* Current Password */}
                <div className="space-y-2">
                  <Label htmlFor="profile-currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="profile-currentPassword"
                      type={showCurrent ? "text" : "password"}
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showCurrent ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Separator />

                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="profile-newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="profile-newPassword"
                      type={showNew ? "text" : "password"}
                      placeholder="Enter new password (min 6 chars)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showNew ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="profile-confirmPassword">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="profile-confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirm ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-destructive">
                      Passwords do not match
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetPasswordForm}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="gap-2"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Lock className="size-4" />
                        Update Password
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}