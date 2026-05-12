import { db } from "@/lib/db";

export interface PlanFeature {
  id: string;
  label: string;
  description?: string;
}

export interface PlanConfig {
  planKey: string;
  name: string;
  subtitle: string;
  priceUSD: number;
  priceNGN: number;
  validityDays: number;
  maxStudents: number;
  maxUsers: number;
  features: PlanFeature[];
  isActive: boolean;
  sortOrder: number;
}

export interface PlanDisplay {
  id: string;
  name: string;
  subtitle: string;
  price: string;
  period: string;
  icon: string;
  color: string;
  features: string[];
  cta: string;
  popular: boolean;
  priceNGN: number;
  priceUSD: number;
  validityDays: number;
  maxStudents: number;
  maxUsers: number;
}

// Hardcoded fallback plans (used if DB is empty)
const FALLBACK_PLANS: PlanConfig[] = [
  {
    planKey: "basic",
    name: "Basic",
    subtitle: "For small schools",
    priceUSD: 13,
    priceNGN: 20000,
    validityDays: 90,
    maxStudents: 50,
    maxUsers: 3,
    features: [
      { id: "f1", label: "Up to 50 students" },
      { id: "f2", label: "Up to 3 admin users" },
      { id: "f3", label: "Student & teacher management" },
      { id: "f4", label: "Basic exam & result tracking" },
      { id: "f5", label: "Simple report cards" },
      { id: "f6", label: "Email notifications" },
    ],
    isActive: true,
    sortOrder: 1,
  },
  {
    planKey: "intermediate",
    name: "Intermediate",
    subtitle: "For growing schools",
    priceUSD: 23,
    priceNGN: 35000,
    validityDays: 90,
    maxStudents: 200,
    maxUsers: 15,
    features: [
      { id: "f1", label: "Up to 200 students" },
      { id: "f2", label: "Up to 15 admin users" },
      { id: "f3", label: "Advanced score analytics" },
      { id: "f4", label: "Custom assessment settings" },
      { id: "f5", label: "Broadsheet & class position" },
      { id: "f6", label: "Termly report cards with remarks" },
      { id: "f7", label: "Priority email support" },
    ],
    isActive: true,
    sortOrder: 2,
  },
  {
    planKey: "premium",
    name: "Premium",
    subtitle: "For established schools",
    priceUSD: 27,
    priceNGN: 40000,
    validityDays: 90,
    maxStudents: 500,
    maxUsers: 100,
    features: [
      { id: "f1", label: "Up to 500 students" },
      { id: "f2", label: "Up to 100 admin users" },
      { id: "f3", label: "Full analytics dashboard" },
      { id: "f4", label: "Custom school branding" },
      { id: "f5", label: "Finance management" },
      { id: "f6", label: "Digital classroom" },
      { id: "f7", label: "Dedicated support" },
      { id: "f8", label: "Data export (Excel/PDF)" },
    ],
    isActive: true,
    sortOrder: 3,
  },
  {
    planKey: "growth",
    name: "Growth",
    subtitle: "For large school networks",
    priceUSD: 33,
    priceNGN: 50000,
    validityDays: 90,
    maxStudents: 999999,
    maxUsers: 999999,
    features: [
      { id: "f1", label: "Unlimited students" },
      { id: "f2", label: "Up to 999 admin users" },
      { id: "f3", label: "Multi-campus support" },
      { id: "f4", label: "API access" },
      { id: "f5", label: "Staff performance tracking" },
      { id: "f6", label: "Custom integrations" },
      { id: "f7", label: "Account manager" },
      { id: "f8", label: "White-label options" },
      { id: "f9", label: "SLA guarantee" },
    ],
    isActive: true,
    sortOrder: 4,
  },
];

// Icon/color mapping for plan display
const PLAN_META: Record<string, { icon: string; color: string }> = {
  basic: { icon: "Zap", color: "border-slate-200" },
  intermediate: { icon: "Star", color: "border-sky-200" },
  premium: { icon: "Crown", color: "border-amber-200" },
  growth: { icon: "Shield", color: "border-emerald-200" },
};

// Fetch plans from DB (server-side only)
export async function getPlansFromDB(): Promise<PlanConfig[]> {
  try {
    const plans = await db.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    if (plans.length === 0) return FALLBACK_PLANS;

    return plans.map((p) => ({
      planKey: p.planKey,
      name: p.name,
      subtitle: p.subtitle || "",
      priceUSD: p.priceUSD,
      priceNGN: p.priceNGN,
      validityDays: p.validityDays,
      maxStudents: p.maxStudents,
      maxUsers: p.maxUsers,
      features: typeof p.features === "string" ? JSON.parse(p.features) : (p.features as PlanFeature[]),
      isActive: p.isActive,
      sortOrder: p.sortOrder,
    }));
  } catch {
    return FALLBACK_PLANS;
  }
}

// Get plans formatted for the landing page (client-side compatible)
export async function getDisplayPlans(): Promise<PlanDisplay[]> {
  const plans = await getPlansFromDB();

  return plans.map((p) => {
    const meta = PLAN_META[p.planKey] || PLAN_META.basic;
    return {
      id: p.planKey,
      name: p.name,
      subtitle: p.subtitle,
      price: `\u20A6${p.priceNGN.toLocaleString()}`,
      period: `/${Math.round(p.validityDays / 30)} months`,
      icon: meta.icon,
      color: meta.color,
      features: p.features.map((f) => f.label),
      cta: `Start ${p.name} Plan`,
      popular: p.planKey === "premium",
      priceNGN: p.priceNGN,
      priceUSD: p.priceUSD,
      validityDays: p.validityDays,
      maxStudents: p.maxStudents,
      maxUsers: p.maxUsers,
    };
  });
}

// Get plan limits by student count
export function getPlanForStudentCount(count: number): string {
  if (count <= 50) return "basic";
  if (count <= 200) return "intermediate";
  if (count <= 500) return "premium";
  return "growth";
}

// Get plan price in NGN for display
export function formatPriceNGN(amount: number): string {
  return `\u20A6${amount.toLocaleString()}`;
}

export { FALLBACK_PLANS, PLAN_META };