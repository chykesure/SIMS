"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  CreditCard,
  LogOut,
} from "lucide-react";
import { useAppStore } from "@/store/index";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SessionItem {
  id: string;
  sessionOne: string;
  sessionTwo: string;
  active: string;
}

export default function SessionSelectPage() {
  const { tenant, user, navigate, login } = useAppStore();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [loading, setLoading] = useState(true);
  const [proceeding, setProceeding] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"active" | "expired" | "pending" | "unknown">("unknown");
  const [paymentEvidence, setPaymentEvidence] = useState<{ id: string; status: string; createdAt: string } | null>(null);

  // Check plan status
  useEffect(() => {
    if (!tenant) return;

    const now = new Date();
    const planEnd = tenant.planEnd ? new Date(tenant.planEnd) : null;

    if (!planEnd || planEnd < now) {
      setPaymentStatus("expired");
    } else {
      // Check if there's pending payment evidence
      setPaymentStatus("active");
    }
  }, [tenant]);

  // Fetch sessions
  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await fetch("/api/sessions");
        if (res.ok) {
          const data = await res.json();
          const sessionList = Array.isArray(data) ? data : [];
          setSessions(sessionList);
          // Auto-select active session
          const active = sessionList.find((s: SessionItem) => s.active === "Yes");
          if (active) setSelectedSession(active.id);
        }
      } catch {
        toast.error("Failed to load sessions");
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, []);

  // Fetch payment evidence status
  useEffect(() => {
    async function fetchPaymentStatus() {
      try {
        const res = await fetch("/api/payment-evidence");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const latest = data[0];
            setPaymentEvidence({ id: latest.id, status: latest.status, createdAt: latest.createdAt });
            if (latest.status === "pending") {
              setPaymentStatus("pending");
            }
          }
        }
      } catch {
        // silent
      }
    }
    fetchPaymentStatus();
  }, []);

  const handleProceed = async () => {
    if (!selectedSession) {
      toast.error("Please select a session");
      return;
    }

    if (paymentStatus === "expired") {
      navigate("subscription");
      return;
    }

    setProceeding(true);
    try {
      // Verify access - check tenant status
      const res = await fetch("/api/auth/verify-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: selectedSession }),
      });
      const data = await res.json();

      if (data.success) {
        // Navigate to the correct dashboard based on role
        if (user?.role === "Student") {
          navigate("student-dashboard");
        } else if (user?.role === "Teacher") {
          navigate("teacher-dashboard");
        } else if (user?.role === "Parent") {
          navigate("parent-dashboard");
        } else {
          navigate("dashboard");
        }
      } else {
        toast.error(data.message || "Access denied. Please verify your subscription.");
      }
    } catch {
      // Fallback: just navigate to dashboard
      if (user?.role === "Student") navigate("student-dashboard");
      else if (user?.role === "Teacher") navigate("teacher-dashboard");
      else if (user?.role === "Parent") navigate("parent-dashboard");
      else navigate("dashboard");
    } finally {
      setProceeding(false);
    }
  };

  const handleLogout = () => {
    // Clear state and go to login
    useAppStore.getState().logout();
    navigate("login");
  };

  const selectedSessionData = sessions.find((s) => s.id === selectedSession);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-orange-50/30">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ backgroundColor: "#C0522B" }}>
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Select Academic Session</h1>
              <p className="text-xs text-slate-500">{tenant?.name || "School"}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-6"
        >
          {/* Welcome Card */}
          <Card className="text-center">
            <CardContent className="pt-8 pb-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-slate-900">
                Welcome, {user?.username || "User"}!
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Select your current academic session to continue.
              </p>
              <Badge variant="outline" className="mt-3 border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                {user?.role || "Admin"} Portal
              </Badge>
            </CardContent>
          </Card>

          {/* Subscription Status */}
          {paymentStatus === "expired" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-red-200 bg-red-50 p-4"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                <div>
                  <p className="text-sm font-semibold text-red-700">Subscription Expired</p>
                  <p className="mt-1 text-sm text-red-600">
                    Your subscription has expired. Please make a payment to continue using SchoolDesk.
                  </p>
                  <Button
                    size="sm"
                    className="mt-3 bg-red-600 text-white hover:bg-red-700"
                    onClick={() => navigate("subscription")}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Make Payment
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {paymentStatus === "pending" && paymentEvidence && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-amber-200 bg-amber-50 p-4"
            >
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                <div>
                  <p className="text-sm font-semibold text-amber-700">Payment Pending Verification</p>
                  <p className="mt-1 text-sm text-amber-600">
                    Your payment evidence was uploaded and is awaiting admin verification. You can still access the system while waiting.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {paymentStatus === "active" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                <div>
                  <p className="text-sm font-semibold text-emerald-700">Subscription Active</p>
                  <p className="mt-1 text-sm text-emerald-600">
                    Plan: <strong>{tenant?.plan || "basic"}</strong>
                    {tenant?.planEnd && (
                      <> &middot; Expires: <strong>{new Date(tenant.planEnd).toLocaleDateString()}</strong></>
                    )}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Session Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" />
                Academic Session
              </CardTitle>
              <CardDescription>
                Choose the session and term you want to work with.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="session">Session</Label>
                <Select value={selectedSession} onValueChange={setSelectedSession}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={sessions.length === 0 ? "No sessions created yet" : "Select session"} />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.sessionOne}/{s.sessionTwo}
                        {s.active === "Yes" && (
                          <Badge className="ml-2 bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0">Active</Badge>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSessionData && (
                  <p className="text-xs text-muted-foreground">
                    Selected: {selectedSessionData.sessionOne}/{selectedSessionData.sessionTwo}
                  </p>
                )}
              </div>

              <Button
                className="w-full text-white"
                style={{ backgroundColor: "#C0522B" }}
                disabled={!selectedSession || proceeding}
                onClick={handleProceed}
              >
                {proceeding ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</>
                ) : (
                  <>Continue to Dashboard <ChevronRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Quick info */}
          <p className="text-center text-xs text-slate-400">
            Your session selection will be remembered for this login session.
          </p>
        </motion.div>
      </main>
    </div>
  );
}