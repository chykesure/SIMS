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
  | "exam-score-entry";

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  imageUrl?: string;
  tenantId?: string | null;
  studentId?: string | null;
  teacherId?: string | null;
  parentId?: string | null;
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
  user: User | null;
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
  setPendingSchoolName: (name: string | null) => void;
  viewSchoolDetail: (schoolId: string) => void;
  setSelectedSession: (sessionId: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: "login",
  isAuthenticated: false,
  isSuperAdmin: false,
  user: null,
  tenant: null,
  sidebarOpen: false,
  pendingSchoolName: null,
  selectedSchoolId: null,
  selectedSession: null,

  navigate: (page) => set({ currentPage: page }),

  login: (user) =>
    set({
      user,
      isAuthenticated: true,
      currentPage: user.role === "SuperAdmin" ? "dev-dashboard" : "session-select",
    }),

  logout: () =>
    set({
      user: null,
      tenant: null,
      isAuthenticated: false,
      isSuperAdmin: false,
      currentPage: "login",
      selectedSession: null,
      pendingSchoolName: null,
      selectedSchoolId: null,
    }),

  setTenant: (tenant) => set({ tenant }),

  setSuperAdmin: (value) =>
    set({
      isSuperAdmin: value,
      currentPage: value ? "dev-dashboard" : "dashboard",
    }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setPendingSchoolName: (name) => set({ pendingSchoolName: name }),

  viewSchoolDetail: (schoolId) =>
    set({ selectedSchoolId: schoolId, currentPage: "dev-school-detail" }),

  setSelectedSession: (sessionId) => set({ selectedSession: sessionId }),
}));