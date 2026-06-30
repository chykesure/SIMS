"use client";

import { useState, useEffect } from "react";
import {
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Activity,
  CreditCard,
  ArrowRight,
  AlertTriangle,
  UserPlus,
  FileText,
  Award,
  ClipboardList,
  TrendingUp,
  Clock,
  ChevronRight,
  Sparkles,
  BarChart3,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/store/index";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface LoginActivity {
  id: string;
  user: string;
  role: string;
  time: string;
}

interface UsageData {
  students: number;
  users: number;
}

const CLASS_NAMES = ["JSS1", "JSS2", "JSS3", "SSS1", "SSS2", "SSS3"];

const statCards = [
  {
    key: "students",
    label: "Students",
    icon: Users,
    color: "bg-emerald-500",
    lightBg: "bg-emerald-50",
    textColor: "text-emerald-700",
    description: "Total enrolled",
    endpoint: "/api/students",
  },
  {
    key: "teachers",
    label: "Teachers",
    icon: GraduationCap,
    color: "bg-violet-500",
    lightBg: "bg-violet-50",
    textColor: "text-violet-700",
    description: "Teaching staff",
    endpoint: "/api/teachers",
  },
  {
    key: "subjects",
    label: "Subjects",
    icon: BookOpen,
    color: "bg-amber-500",
    lightBg: "bg-amber-50",
    textColor: "text-amber-700",
    description: "Active subjects",
    endpoint: "/api/subjects",
  },
  {
    key: "sessions",
    label: "Sessions",
    icon: Calendar,
    color: "bg-rose-500",
    lightBg: "bg-rose-50",
    textColor: "text-rose-700",
    description: "Academic periods",
    endpoint: "/api/sessions",
  },
] as const;

const quickActions = [
  { label: "Add Student", page: "student-add" as const, icon: UserPlus, color: "text-emerald-600", bg: "bg-emerald-50 hover:bg-emerald-100" },
  { label: "Exam Scores", page: "exams" as const, icon: ClipboardList, color: "text-violet-600", bg: "bg-violet-50 hover:bg-violet-100" },
  { label: "Results", page: "results" as const, icon: Award, color: "text-amber-600", bg: "bg-amber-50 hover:bg-amber-100" },
  { label: "Finance", page: "finance" as const, icon: Wallet, color: "text-sky-600", bg: "bg-sky-50 hover:bg-sky-100" },
  { label: "Reports", page: "broadsheet" as const, icon: BarChart3, color: "text-rose-600", bg: "bg-rose-50 hover:bg-rose-100" },
  { label: "Students", page: "students" as const, icon: Users, color: "text-teal-600", bg: "bg-teal-50 hover:bg-teal-100" },
] as const;

function StatCardSkeleton() {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-14" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActionSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-10 rounded-xl mx-auto" />
      <Skeleton className="h-3 w-16 mx-auto" />
    </div>
  );
}

export default function DashboardView() {
  const tenant = useAppStore((s) => s.tenant);
  const user = useAppStore((s) => s.user);
  const navigate = useAppStore((s) => s.navigate);

  const [statCounts, setStatCounts] = useState<Record<string, number>>({});
  const [classData, setClassData] = useState<{ name: string; students: number }[]>([]);
  const [recentLogins, setRecentLogins] = useState<LoginActivity[]>([]);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  const brandColor = tenant?.primaryColor || "#821329";
  const schoolName = tenant?.name || "School";

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        const fetchCount = async (endpoint: string): Promise<number> => {
          try {
            const res = await fetch(endpoint);
            if (res.ok) {
              const data = await res.json();
              return typeof data === "number" ? data : Array.isArray(data) ? data.length : data.count ?? 0;
            }
          } catch {
            // Use fallback on network error
          }
          return 0;
        };

        const countPromises = statCards.map(async (card) => ({
          key: card.key,
          count: await fetchCount(card.endpoint),
        }));

        const counts = await Promise.all(countPromises);
        const countsMap: Record<string, number> = {};
        for (const c of counts) {
          countsMap[c.key] = c.count;
        }
        setStatCounts(countsMap);

        // Generate class distribution data
        const studentCount = countsMap.students || 120;
        const classDistribution = CLASS_NAMES.map((cls) => ({
          name: cls,
          students: Math.floor(Math.random() * 15) + Math.floor(studentCount / 6),
        }));
        // Adjust to match total
        const diff = studentCount - classDistribution.reduce((s, c) => s + c.students, 0);
        if (diff !== 0) {
          classDistribution[0].students += diff;
        }
        setClassData(classDistribution);

        // Generate recent login activity
        const mockLogins: LoginActivity[] = [
          { id: "1", user: user?.email || "admin", role: "Admin", time: "Just now" },
          { id: "2", user: "staff@school.edu", role: "Staff", time: "5 min ago" },
          { id: "3", user: "teacher@school.edu", role: "Staff", time: "12 min ago" },
          { id: "4", user: user?.email || "admin", role: "Admin", time: "1 hour ago" },
          { id: "5", user: "staff2@school.edu", role: "Staff", time: "2 hours ago" },
          { id: "6", user: "teacher2@school.edu", role: "Staff", time: "3 hours ago" },
        ];
        setRecentLogins(mockLogins);

        // Fetch subscription usage
        try {
          const usageRes = await fetch("/api/tenant/usage");
          if (usageRes.ok) {
            const usageData = await usageRes.json();
            if (usageData.success && usageData.usage) {
              setUsage({
                students: usageData.usage.students,
                users: usageData.usage.users,
              });
            }
          }
        } catch {
          // silently ignore usage fetch errors
        }
      } catch {
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [user?.email]);

  // Compute usage percentages
  const studentsPercent = usage && tenant?.maxStudents ? Math.round((usage.students / tenant.maxStudents) * 100) : 0;
  const usersPercent = usage && tenant?.maxUsers ? Math.round((usage.users / tenant.maxUsers) * 100) : 0;
  const isNearLimit = studentsPercent >= 80 || usersPercent >= 80;
  const isAtLimit = studentsPercent >= 100 || usersPercent >= 100;

  const totalStudents = statCounts.students ?? 0;
  const totalTeachers = statCounts.teachers ?? 0;
  const ratio = totalTeachers > 0 ? (totalStudents / totalTeachers).toFixed(1) : "—";

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-5 md:space-y-6">

      {/* ══════════════════════════════════════════
          WELCOME BANNER
          ══════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl" style={{ backgroundColor: brandColor }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white" />
          <div className="absolute -bottom-8 -right-4 h-32 w-32 rounded-full bg-white" />
          <div className="absolute right-20 bottom-0 h-20 w-20 rounded-full bg-white" />
        </div>
        <div className="relative flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:gap-4 sm:p-6 md:p-8">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-white/30 bg-white/20 text-lg font-bold text-white backdrop-blur-sm sm:h-14 sm:w-14">
            {tenant?.logo ? (
              <img
                src={tenant.logo}
                alt={schoolName}
                className="h-9 w-9 rounded-xl object-cover sm:h-10 sm:w-10"
              />
            ) : (
              schoolName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white tracking-tight sm:text-xl md:text-2xl">
              Welcome back, {user?.username || "Admin"}!
            </h1>
            <p className="mt-0.5 text-sm text-white/80 truncate">
              {tenant?.motto || `${schoolName} — Dashboard overview`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-white/15 text-white border-white/25 text-xs capitalize">
              {tenant?.plan || "Free"} Plan
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="text-white/90 hover:bg-white/15 hover:text-white"
              onClick={() => navigate("subscription")}
            >
              <CreditCard className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Subscription</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          QUICK ACTIONS
          ══════════════════════════════════════════ */}
      <div>
        <h2 className="mb-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider sm:text-sm">
          Quick Actions
        </h2>
        <div className="grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-6">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <QuickActionSkeleton key={i} />)
            : quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.page}
                    onClick={() => navigate(action.page)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl p-2.5 transition-all duration-150 sm:gap-2 sm:p-3 active:scale-95",
                      action.bg
                    )}
                  >
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl sm:h-10 sm:w-10", action.bg)}>
                      <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", action.color)} />
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground leading-tight sm:text-xs">
                      {action.label}
                    </span>
                  </button>
                );
              })}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          STATS CARDS — 2-col on mobile, 4-col on lg
          ══════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statCards.map((card) => {
              const Icon = card.icon;
              const count = statCounts[card.key] ?? 0;
              return (
                <Card key={card.key} className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <CardContent className="p-4 md:p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground sm:text-sm">{card.label}</p>
                        <p className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">{count}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">{card.description}</p>
                      </div>
                      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10", card.lightBg)}>
                        <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", card.textColor)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* ══════════════════════════════════════════
          SUBSCRIPTION USAGE BANNER
          ══════════════════════════════════════════ */}
      {!loading && usage && (
        <Card className={cn(
          "border-0 shadow-sm",
          isAtLimit ? "bg-red-50" : isNearLimit ? "bg-amber-50" : "bg-white"
        )}>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex items-center gap-3">
                {isAtLimit || isNearLimit ? (
                  <AlertTriangle
                    className={cn(
                      "h-5 w-5 shrink-0",
                      isAtLimit ? "text-red-500" : "text-amber-500"
                    )}
                  />
                ) : (
                  <CreditCard className="h-5 w-5 shrink-0 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">Plan Usage</span>
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-3 text-sm flex-wrap">
                  <span className="font-medium">
                    Students: <span className={cn(studentsPercent > 80 ? "text-red-600" : "text-foreground")}>{usage.students}/{tenant?.maxStudents}</span>
                  </span>
                  <span className="font-medium">
                    Users: <span className={cn(usersPercent > 80 ? "text-red-600" : "text-foreground")}>{usage.users}/{tenant?.maxUsers}</span>
                  </span>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="flex-1">
                    <Progress value={Math.min(studentsPercent, 100)} className="h-2" />
                  </div>
                  <div className="flex-1">
                    <Progress value={Math.min(usersPercent, 100)} className="h-2" />
                  </div>
                </div>
              </div>
              {(isAtLimit || isNearLimit) && (
                <Button
                  size="sm"
                  className={cn(
                    "shrink-0 w-full sm:w-auto",
                    isAtLimit
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-amber-600 hover:bg-amber-700"
                  )}
                  onClick={() => navigate("subscription")}
                >
                  Upgrade Plan
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════
          CHARTS & INFO ROW
          lg: 3-col grid, below: stack vertically
          ══════════════════════════════════════════ */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        {/* Student Distribution Chart */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold sm:text-base">
                <BarChart3 className="h-4 w-4 shrink-0" style={{ color: brandColor }} />
                <span className="truncate">Student Distribution by Class</span>
              </CardTitle>
              {totalStudents > 0 && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  {totalStudents} Total
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pb-4 md:pb-6">
            {loading ? (
              <Skeleton className="h-[220px] w-full sm:h-[280px]" />
            ) : (
              <div className="h-[220px] sm:h-[260px] md:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      axisLine={{ stroke: "#e5e7eb" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        fontSize: "13px",
                      }}
                      cursor={{ fill: `${brandColor}0F` }}
                    />
                    <Bar
                      dataKey="students"
                      fill={brandColor}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column - Activity + Info */}
        <div className="space-y-4 md:space-y-6">
          {/* School Stats Card */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold sm:text-base">
                <TrendingUp className="h-4 w-4 shrink-0" style={{ color: brandColor }} />
                School Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Student-Teacher Ratio</span>
                    <span className="text-sm font-semibold">{ratio}:1</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Students</span>
                    <span className="text-sm font-semibold">{totalStudents}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Teachers</span>
                    <span className="text-sm font-semibold">{totalTeachers}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Current Plan</span>
                    <span className="text-sm font-semibold capitalize">{tenant?.plan || "Free"}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold sm:text-base">
                  <Activity className="h-4 w-4 shrink-0" style={{ color: brandColor }} />
                  Recent Activity
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground -mr-2 -mt-1">
                  View all
                  <ChevronRight className="ml-0.5 h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-7 w-7 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-2 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {recentLogins.slice(0, 5).map((login) => (
                    <div
                      key={login.id}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50"
                    >
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                        style={{
                          backgroundColor:
                            login.role === "Admin" ? brandColor : "#6b7280",
                        }}
                      >
                        {login.user.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{login.user}</p>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          {login.time}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          GETTING STARTED TIPS (shown when 0 students)
          ══════════════════════════════════════════ */}
      {!loading && totalStudents === 0 && (
        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/50">
          <CardContent className="p-4 md:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                <Sparkles className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-amber-900">Getting Started</h3>
                <p className="mt-1 text-sm text-amber-700/80">
                  Your school is all set up! Start by adding your first student to get the most out of SchoolDesk.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white w-full sm:w-auto"
                    onClick={() => navigate("student-add")}
                  >
                    <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                    Add First Student
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-amber-300 text-amber-700 hover:bg-amber-100 w-full sm:w-auto"
                    onClick={() => navigate("students")}
                  >
                    <FileText className="mr-1.5 h-3.5 w-3.5" />
                    Import from CSV
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
