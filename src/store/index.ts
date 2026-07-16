import { create } from "zustand";

export type PageView =
  | "login"
  | "register"
  | "pending-approval"
  | "admission"
  | "session-select"
  | "subscription"
  | "dashboard"
  | "students"
  | "student-add"
  | "teachers"
  | "subjects"
  | "classes"
  | "sessions"
  | "exams"
  | "results"
  | "grading"
  | "card-settings"
  | "broadsheet"
  | "remarks"
  | "signatures"
  | "class-position"
  | "subject-position"
  | "users"
  | "parents"
  | "assessment-settings"
  | "finance"
  | "budgets"
  | "inventory"
  | "vouchers"
  | "classroom"
  | "profile"
  | "school-profile"
  | "dev-dashboard"
  | "dev-schools"
  | "dev-school-detail"
  | "dev-plans"
  | "dev-payments"
  | "dev-sessions"
  | "dev-activity-log"
  | "dev-security"
  | "dev-settings"
  | "student-dashboard"
  | "student-results"
  | "student-fees"
  | "student-assignments"
  | "student-announcements"
  | "teacher-dashboard"
  | "teacher-classes"
  | "teacher-scores"
  | "teacher-assignments"
  | "teacher-announcements"
  | "parent-dashboard"
  | "parent-results"
  | "parent-fees"
  | "parent-announcements"
  | "admission-list"
  | "exam-score-entry"
  | "score-import"
  | "teacher-add-student"
  | "teacher-students"
  | "teacher-ai-assistant"
  | "teacher-subjects"
  | "teacher-profile"
  | "teacher-results"
  | "attendance";

const VALID_PAGES = new Set<string>([
  "login", "register", "pending-approval", "admission", "session-select",
  "subscription", "dashboard", "students", "student-add", "teachers",
  "subjects", "classes", "sessions", "exams", "results", "grading",
  "card-settings", "broadsheet", "remarks", "signatures", "class-position",
  "subject-position", "users", "parents", "assessment-settings", "finance",
  "budgets", "inventory", "vouchers", "classroom", "profile",
  "dev-dashboard", "dev-schools", "dev-school-detail", "dev-plans",
  "dev-payments", "dev-sessions", "dev-activity-log", "dev-security",
  "dev-settings", "student-dashboard", "student-results", "student-fees",
  "student-assignments", "student-announcements", "teacher-dashboard",
  "teacher-classes", "teacher-scores", "teacher-assignments",
  "teacher-announcements", "parent-dashboard", "parent-results",
  "parent-fees", "parent-announcements", "admission-list", "exam-score-entry",
  "teacher-announcements", "teacher-add-student", "teacher-students",
  "teacher-subjects", "teacher-profile", "teacher-ai-assistant", "parent-dashboard", "parent-results", "teacher-results",
]);

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  roles?: string[];  // NEW: multi-role support from UserRole table
  imageUrl?: string;
  tenantId?: string | null;
  studentId?: string | null;
  teacherId?: string | null;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  motto?: string;
  primaryColor?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  state?: string;
  status: string;
  plan?: string;
  maxStudents?: number;
  maxUsers?: number;
  planStart?: string;
  planEnd?: string;
}

interface AppState {
  currentPage: PageView;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isImpersonating: boolean;
  impersonatedTenantName: string | null;
  user: User | null;
  savedDevUser: User | null;
  tenant: Tenant | null;
  sidebarOpen: boolean;
  pendingSchoolName: string | null;
  selectedSchoolId: string | null;
  selectedSession: string | null;

  navigate: (page: PageView) => void;
  login: (user: User) => void;
  logout: () => void;
  setTenant: (tenant: Tenant) => void;
  setSuperAdmin: (value: boolean) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setPendingSchoolName: (name: string | null) => void;
  viewSchoolDetail: (schoolId: string) => void;
  setSelectedSession: (sessionId: string) => void;
  hydrateFromUrl: () => void;
  startImpersonation: (user: User, tenant: Tenant, sessionId?: string | null) => void;
  stopImpersonation: () => void;
}

// Read the page from URL on init
function getPageFromUrl(): PageView {
  if (typeof window === "undefined") return "login";
  const params = new URLSearchParams(window.location.search);
  const page = params.get("p");
  if (page && VALID_PAGES.has(page)) {
    return page as PageView;
  }
  return "login";
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: getPageFromUrl(),
  isAuthenticated: false,
  isSuperAdmin: false,
  isImpersonating: false,
  impersonatedTenantName: null,
  user: null,
  savedDevUser: null,
  tenant: null,
  sidebarOpen: false,
  pendingSchoolName: null,
  selectedSchoolId: null,
  selectedSession: null,

  navigate: (page) => {
    // Update browser URL without reload
    const url = page === "login"
      ? window.location.pathname
      : `${window.location.pathname}?p=${page}`;
    window.history.pushState({}, "", url);

    set({ currentPage: page });
  },

  login: (user) => {
    const targetPage = user.role === "SuperAdmin"
      ? "dev-dashboard"
      : user.role === "STUDENT"
        ? "student-dashboard"
        : "session-select";
    const url = `${window.location.pathname}?p=${targetPage}`;
    window.history.pushState({}, "", url);

    set({
      user,
      isAuthenticated: true,
      currentPage: targetPage,
    });
  },

  logout: () => {
    window.history.pushState({}, "", window.location.pathname);
    set({
      user: null,
      tenant: null,
      isAuthenticated: false,
      isSuperAdmin: false,
      isImpersonating: false,
      impersonatedTenantName: null,
      savedDevUser: null,
      currentPage: "login",
      selectedSession: null,
      pendingSchoolName: null,
      selectedSchoolId: null,
    });
  },

  setTenant: (tenant) => set({ tenant }),

  setSuperAdmin: (value) => {
    const targetPage = value ? "dev-dashboard" : "dashboard";
    const url = `${window.location.pathname}?p=${targetPage}`;
    window.history.pushState({}, "", url);
    set({ isSuperAdmin: value, currentPage: targetPage });
  },

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setPendingSchoolName: (name) => set({ pendingSchoolName: name }),

  viewSchoolDetail: (schoolId) => {
    const url = `${window.location.pathname}?p=dev-school-detail`;
    window.history.pushState({}, "", url);
    set({ selectedSchoolId: schoolId, currentPage: "dev-school-detail" });
  },

  setSelectedSession: (sessionId) => set({ selectedSession: sessionId }),

  startImpersonation: (user, tenant, sessionId) => {
    const url = `${window.location.pathname}?p=dashboard`;
    window.history.pushState({}, "", url);
    set((state) => ({
      savedDevUser: state.user,
      user,
      tenant,
      isImpersonating: true,
      impersonatedTenantName: tenant.name,
      isSuperAdmin: false,
      currentPage: "dashboard",
      selectedSession: sessionId || null,
    }));
  },

  stopImpersonation: () => {
    const url = `${window.location.pathname}?p=dev-dashboard`;
    window.history.pushState({}, "", url);
    set((state) => ({
      user: state.savedDevUser,
      savedDevUser: null,
      tenant: null,
      isImpersonating: false,
      impersonatedTenantName: null,
      isSuperAdmin: true,
      currentPage: "dev-dashboard",
      selectedSession: null,
    }));
  },

  hydrateFromUrl: () => {
    set({ currentPage: getPageFromUrl() });
  },
}));