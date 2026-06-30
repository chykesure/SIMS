// ── Centralized Plan Configuration ─────────────────────────────────
// Single source of truth for plan limits, features, and pricing.

export type PlanId = 'basic' | 'intermediate' | 'premium' | 'growth'

export interface PlanFeature {
  id: string
  label: string
  description: string
}

export interface PlanConfig {
  id: PlanId
  name: string
  subtitle: string
  priceUSD: number
  priceNGN: number
  priceLabel: string
  maxStudents: number
  maxUsers: number
  durationDays: number
  features: PlanFeature[]
  iconBg: string
  headerBg: string
  borderColor: string
  badgeClass: string
  popular: boolean
}

// ── Plan definitions ──────────────────────────────────────────────

export const PLANS: Record<PlanId, PlanConfig> = {
  basic: {
    id: 'basic',
    name: 'Basic',
    subtitle: 'For small schools',
    priceUSD: 13,
    priceNGN: 20000,
    priceLabel: '/termly',
    maxStudents: 50,
    maxUsers: 3,
    durationDays: 90,
    features: [
      { id: 'students', label: 'Student & Teacher Management', description: 'Add and manage students and teachers' },
      { id: 'exams', label: 'Basic Exam & Result Tracking', description: 'Enter scores and generate simple results' },
      { id: 'report-cards', label: 'Simple Report Cards', description: 'Print basic report cards' },
      { id: 'notifications', label: 'Email Notifications', description: 'Receive email alerts' },
    ],
    iconBg: 'bg-slate-100',
    headerBg: 'bg-slate-50',
    borderColor: 'border-slate-200',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    popular: false,
  },
  intermediate: {
    id: 'intermediate',
    name: 'Intermediate',
    subtitle: 'For growing schools',
    priceUSD: 23,
    priceNGN: 35000,
    priceLabel: '/termly',
    maxStudents: 200,
    maxUsers: 15,
    durationDays: 90,
    features: [
      { id: 'students', label: 'Student & Teacher Management', description: 'Add and manage students and teachers' },
      { id: 'exams', label: 'Basic Exam & Result Tracking', description: 'Enter scores and generate simple results' },
      { id: 'report-cards', label: 'Simple Report Cards', description: 'Print basic report cards' },
      { id: 'notifications', label: 'Email Notifications', description: 'Receive email alerts' },
      { id: 'analytics', label: 'Advanced Score Analytics', description: 'Broadsheet and detailed analysis' },
      { id: 'assessments', label: 'Custom Assessment Settings', description: 'Configure CA and exam weightings' },
      { id: 'positions', label: 'Broadsheet & Class Position', description: 'View broadsheet and class rankings' },
      { id: 'remarks', label: 'Termly Report Cards with Remarks', description: 'Teacher and principal remarks' },
      { id: 'finance', label: 'Finance Manager', description: 'Track school fees and payments' },
      { id: 'support', label: 'Priority Email Support', description: 'Faster response times' },
    ],
    iconBg: 'bg-sky-100',
    headerBg: 'bg-sky-50/70',
    borderColor: 'border-sky-200',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
    popular: false,
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    subtitle: 'For established schools',
    priceUSD: 27,
    priceNGN: 40000,
    priceLabel: '/termly',
    maxStudents: 500,
    maxUsers: 100,
    durationDays: 90,
    features: [
      { id: 'students', label: 'Student & Teacher Management', description: 'Add and manage students and teachers' },
      { id: 'exams', label: 'Basic Exam & Result Tracking', description: 'Enter scores and generate simple results' },
      { id: 'report-cards', label: 'Simple Report Cards', description: 'Print basic report cards' },
      { id: 'notifications', label: 'Email Notifications', description: 'Receive email alerts' },
      { id: 'analytics', label: 'Advanced Score Analytics', description: 'Broadsheet and detailed analysis' },
      { id: 'assessments', label: 'Custom Assessment Settings', description: 'Configure CA and exam weightings' },
      { id: 'positions', label: 'Broadsheet & Class Position', description: 'View broadsheet and class rankings' },
      { id: 'remarks', label: 'Termly Report Cards with Remarks', description: 'Teacher and principal remarks' },
      { id: 'finance', label: 'Finance Manager', description: 'Track school fees and payments' },
      { id: 'support', label: 'Priority Email Support', description: 'Faster response times' },
      { id: 'dashboard-analytics', label: 'Full Analytics Dashboard', description: 'Comprehensive school analytics' },
      { id: 'branding', label: 'Custom School Branding', description: 'Customize logo, colors, and theme' },
      { id: 'digital-classroom', label: 'Digital Classroom', description: 'Virtual classrooms and resources' },
      { id: 'export', label: 'Data Export (Excel/PDF)', description: 'Export data in multiple formats' },
    ],
    iconBg: 'bg-amber-100',
    headerBg: 'bg-gradient-to-b from-amber-50/50 to-transparent',
    borderColor: 'border-amber-300',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    popular: true,
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    subtitle: 'For large school networks',
    priceUSD: 33,
    priceNGN: 50000,
    priceLabel: '/termly',
    maxStudents: 999999,
    maxUsers: 999999,
    durationDays: 90,
    features: [
      { id: 'students', label: 'Unlimited Students', description: 'No student limit' },
      { id: 'users', label: 'Unlimited Admin Users', description: 'No user limit' },
      { id: 'exams', label: 'Exam & Result Tracking', description: 'Enter scores and generate results' },
      { id: 'report-cards', label: 'Report Cards', description: 'Professional termly report cards' },
      { id: 'notifications', label: 'Email Notifications', description: 'Receive email alerts' },
      { id: 'analytics', label: 'Advanced Score Analytics', description: 'Broadsheet and detailed analysis' },
      { id: 'assessments', label: 'Custom Assessment Settings', description: 'Configure CA and exam weightings' },
      { id: 'positions', label: 'Broadsheet & Class Position', description: 'View broadsheet and class rankings' },
      { id: 'remarks', label: 'Report Cards with Remarks', description: 'Teacher and principal remarks' },
      { id: 'finance', label: 'Finance Manager', description: 'Track school fees and payments' },
      { id: 'support', label: 'Dedicated Support', description: 'Direct phone support channel' },
      { id: 'dashboard-analytics', label: 'Full Analytics Dashboard', description: 'Comprehensive school analytics' },
      { id: 'branding', label: 'Custom School Branding', description: 'Customize logo, colors, and theme' },
      { id: 'digital-classroom', label: 'Digital Classroom', description: 'Virtual classrooms and resources' },
      { id: 'export', label: 'Data Export (Excel/PDF)', description: 'Export data in multiple formats' },
      { id: 'multi-campus', label: 'Multi-Campus Support', description: 'Manage multiple school campuses' },
      { id: 'api', label: 'API Access', description: 'REST API for integrations' },
      { id: 'account-manager', label: 'Account Manager', description: 'Dedicated account manager' },
      { id: 'sla', label: 'SLA Guarantee', description: 'Service level agreement' },
    ],
    iconBg: 'bg-emerald-100',
    headerBg: 'bg-gradient-to-b from-emerald-50/50 to-transparent',
    borderColor: 'border-emerald-300',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    popular: false,
  },
}

// ── Feature-to-page mapping ───────────────────────────────────────

export const FEATURE_PAGE_MAP: Record<string, PlanId> = {
  'broadsheet': 'intermediate',
  'class-position': 'intermediate',
  'subject-position': 'intermediate',
  'assessment-settings': 'intermediate',
  'remarks': 'intermediate',
  'signatures': 'intermediate',
}

const PLAN_TIER: Record<PlanId, number> = {
  basic: 0,
  intermediate: 1,
  premium: 2,
  growth: 3,
}

// ── Helper functions ──────────────────────────────────────────────

export function hasFeatureAccess(currentPlan: string | undefined | null, requiredPage: string): boolean {
  const plan = (currentPlan?.toLowerCase() || 'basic') as PlanId
  const requiredTier = FEATURE_PAGE_MAP[requiredPage]
  if (!requiredTier) return true
  return PLAN_TIER[plan] >= PLAN_TIER[requiredTier]
}

export function getPlanConfig(planId: string | undefined | null): PlanConfig {
  const id = (planId?.toLowerCase() || 'basic') as PlanId
  return PLANS[id] || PLANS.basic
}

export function formatPlanLimit(value: number): string {
  return value >= 999999 ? 'Unlimited' : value.toLocaleString()
}

export function formatPlanPrice(planId: PlanId): string {
  const plan = PLANS[planId]
  if (plan.priceNGN === 0) return 'Free'
  return `₦${plan.priceNGN.toLocaleString()} / term`
}

export function getRestrictedPages(currentPlan: string | undefined | null): string[] {
  const plan = (currentPlan?.toLowerCase() || 'basic') as PlanId
  const tier = PLAN_TIER[plan]
  return Object.entries(FEATURE_PAGE_MAP)
    .filter(([_, required]) => tier < PLAN_TIER[required as PlanId])
    .map(([page]) => page)
}
