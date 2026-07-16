//src/app/page.tsx
"use client";

import "@/lib/fetch-interceptor";
import { useEffect } from "react";
import { useAppStore } from "@/store/index";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ShieldAlert } from "lucide-react";
import LoginPage from "@/components/auth/login-page";
import RegisterPage from "@/components/auth/register-page";
import PendingApprovalPage from "@/components/auth/pending-approval-page";
import AdmissionPage from "@/components/auth/admission-page";
import DashboardView from "@/components/dashboard/dashboard-view";
import StudentAddView from "@/components/students/student-add";
import StudentListView from "@/components/students/student-list";
import TeacherListView from "@/components/teachers/teacher-list";
import SubjectListView from "@/components/subjects/subject-list";
import ClassListView from "@/components/classes/class-list";
import SessionListView from "@/components/sessions/session-list";
import ExamView from "@/components/exams/exam-view";
import ResultView from "@/components/results/result-view";
import GradingView from "@/components/results/grading-view";
import CardSettingsView from "@/components/settings/card-settings";
import BroadsheetView from "@/components/settings/broadsheet";
import RemarksView from "@/components/settings/remarks";
import SignaturesView from "@/components/settings/signatures";
import ClassPositionView from "@/components/position/class-position";
import SubjectPositionView from "@/components/position/subject-position";
import UserListView from "@/components/users/user-list";
import AssessmentSettingsView from "@/components/settings/assessment-settings";
import { SubscriptionPage } from "@/components/settings/subscription-page";
import { FinanceView } from "@/components/finance/finance-view";
import { ClassroomView } from "@/components/classroom/classroom-view";
import { DevSidebar } from "@/components/dev/dev-sidebar";
import { DevHeader } from "@/components/dev/dev-header";
import { DevDashboard } from "@/components/dev/dev-dashboard";
import { DevSchools } from "@/components/dev/dev-schools";
import { DevPlans } from "@/components/dev/dev-plans";
import { DevPaymentVerify } from "@/components/dev/dev-payment-verify";
import { DevSecurity } from "@/components/dev/dev-security";
import { DevActivityLog } from "@/components/dev/dev-activity-log";
import { DevSettings } from "@/components/dev/dev-settings";
import { DevSchoolDetail } from "@/components/dev/dev-school-detail";
import { DevSessions } from "@/components/dev/dev-sessions";
import ParentListView from "@/components/parents/parent-list";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { StudentDashboard } from "@/components/student/student-dashboard";
import { StudentHeader } from "@/components/student/student-header";
import { StudentResults } from "@/components/student/student-results";
import { StudentFees } from "@/components/student/student-fees";
import { StudentAssignments } from "@/components/student/student-assignments";
import { StudentAnnouncements } from "@/components/student/student-announcements";
import { TeacherSidebar } from "@/components/teacher/teacher-sidebar";
import { TeacherDashboard } from "@/components/teacher/teacher-dashboard";
import { TeacherClasses } from "@/components/teacher/teacher-classes";
import { TeacherScores } from "@/components/teacher/teacher-scores";
import { TeacherAssignments } from "@/components/teacher/teacher-assignments";
import { TeacherAnnouncements } from "@/components/teacher/teacher-announcements";
import { ParentSidebar } from "@/components/parent/parent-sidebar";
import { ParentDashboard } from "@/components/parent/parent-dashboard";
import { ParentResults } from "@/components/parent/parent-results";
import { ParentFees } from "@/components/parent/parent-fees";
import { ParentAnnouncements } from "@/components/parent/parent-announcements";
import { BudgetView } from "@/components/budgets/budget-view";
import { InventoryView } from "@/components/inventory/inventory-view";
import { VoucherView } from "@/components/vouchers/voucher-view";
import SessionSelectPage from "@/components/auth/session-select-page";
import SchoolProfilePage from "@/components/settings/school-profile";
import ScoreImportPage from "@/components/settings/score-import";

import { TeacherAiAssistant } from "@/components/teacher/teacher-ai-assistant";
import ProfileView from "@/components/settings/profile-view";


export default function Home() {
  const { currentPage, isAuthenticated, isSuperAdmin, isImpersonating, impersonatedTenantName, sidebarOpen, tenant, user, selectedSchoolId, stopImpersonation } = useAppStore();

  useEffect(() => {
    fetch("/api/auth/seed", { method: "POST" }).catch(() => { });
  }, []);

  // Auth pages
  if (currentPage === "login") return <LoginPage />;
  if (currentPage === "register") return <RegisterPage />;
  if (currentPage === "pending-approval") return <PendingApprovalPage />;
  if (currentPage === "admission") return <AdmissionPage />;

  // Protected pages
  if (!isAuthenticated) return <LoginPage />;

  // Session/Term selection (shown after login, before dashboard)
  if (currentPage === "session-select") return <SessionSelectPage />;

  // ============================
  // STUDENT PORTAL
  // ============================
  if ((user?.role || "").toUpperCase() === "STUDENT") {
    const renderStudentView = () => {
      switch (currentPage) {
        case "dashboard":
        case "student-dashboard":
          return <StudentDashboard />;
        case "student-results":
          return <StudentResults />;
        case "student-fees":
          return <StudentFees />;
        case "student-assignments":
          return <StudentAssignments />;
        case "student-announcements":
          return <StudentAnnouncements />;
        default:
          return <StudentDashboard />;
      }
    };

    return (
      <div className="flex min-h-screen bg-muted/30">
        <StudentSidebar />
        <div className={`flex flex-1 flex-col transition-all duration-300 ${sidebarOpen ? "lg:ml-[260px]" : "lg:ml-[68px]"}`}>
          <StudentHeader />
          <main className="flex-1 p-4 md:p-6">{renderStudentView()}</main>
          <footer className="border-t bg-white px-6 py-3 mt-auto">
            <p className="text-center text-xs text-muted-foreground">
              © {new Date().getFullYear()} {tenant?.name || "SIMS"} — Student Portal
            </p>
          </footer>
        </div>
      </div>
    );
  }

  // ============================
  // TEACHER PORTAL
  // ============================
  if ((user?.role || "").toUpperCase() === "TEACHER") {
    const renderTeacherView = () => {
      switch (currentPage) {
        case "dashboard":
          return <TeacherDashboard />;
        case "teacher-classes":
          return <TeacherClasses />;
        case "teacher-scores":
          return <TeacherScores />;
        case "teacher-assignments":
          return <TeacherAssignments />;
        case "teacher-announcements":
          return <TeacherAnnouncements />;
        case "teacher-add-student":
          return <StudentAddView />;
        case "teacher-students":
          return <StudentListView />;
        case "teacher-subjects":
          return <SubjectListView />;
        case "teacher-ai-assistant":
          return <TeacherAiAssistant />;
        case "teacher-profile":
          return <ProfileView />;
        case "teacher-results":
          return <ResultView />;
        default:
          return <TeacherDashboard />;
      }
    };

    return (
      <div className="flex min-h-screen">
        <TeacherSidebar />
        <div className={`flex flex-1 flex-col transition-all duration-300 ${sidebarOpen ? "lg:ml-[240px]" : "lg:ml-16"}`}>
          <main className="flex-1 p-4 md:p-6">{renderTeacherView()}</main>
          <footer className="border-t bg-white px-6 py-3 mt-auto">
            <p className="text-center text-xs text-muted-foreground">
              © {new Date().getFullYear()} {tenant?.name || "SIMS"} — Teacher Portal
            </p>
          </footer>
        </div>
      </div>
    );
  }

  // ============================
  // PARENT PORTAL
  // ============================
  if ((user?.role || "").toUpperCase() === "PARENT") {
    const renderParentView = () => {
      switch (currentPage) {
        case "dashboard":
          return <ParentDashboard />;
        case "parent-results":
          return <ParentResults />;
        case "parent-fees":
          return <ParentFees />;
        case "parent-announcements":
          return <ParentAnnouncements />;
        default:
          return <ParentDashboard />;
      }
    };

    return (
      <div className="flex min-h-screen">
        <ParentSidebar />
        <div className={`flex flex-1 flex-col transition-all duration-300 ${sidebarOpen ? "lg:ml-[240px]" : "lg:ml-16"}`}>
          <main className="flex-1 p-4 md:p-6">{renderParentView()}</main>
          <footer className="border-t bg-white px-6 py-3 mt-auto">
            <p className="text-center text-xs text-muted-foreground">
              © {new Date().getFullYear()} {tenant?.name || "SIMS"} — Parent Portal
            </p>
          </footer>
        </div>
      </div>
    );
  }

  // ============================
  // SUPER ADMIN / DEVELOPER DASHBOARD
  // ============================
  if (isSuperAdmin) {
    const renderDevView = () => {
      switch (currentPage) {
        case "dev-dashboard":
          return <DevDashboard />;
        case "dev-schools":
          return <DevSchools />;
        case "dev-plans":
          return <DevPlans />;
        case "dev-payments":
          return <DevPaymentVerify />;
        case "dev-sessions":
          return <DevSessions />;
        case "dev-school-detail":
          return selectedSchoolId ? <DevSchoolDetail schoolId={selectedSchoolId} /> : <DevDashboard />;
        case "dev-activity-log":
          return <DevActivityLog />;
        case "dev-security":
          return <DevSecurity />;
        case "dev-settings":
          return <DevSettings />;
        default:
          return <DevDashboard />;
      }
    };

    return (
      <div className="flex min-h-screen bg-muted/30">
        <DevSidebar />
        <div
          className={`flex flex-1 flex-col transition-all duration-300 ${sidebarOpen ? "lg:ml-[240px]" : "lg:ml-16"
            }`}
        >
          <DevHeader />
          <main className="flex-1 p-4 md:p-6">{renderDevView()}</main>
          <footer className="border-t border-slate-800/60 bg-slate-950/80 px-6 py-3 mt-auto">
            <p className="text-center text-xs text-slate-500">
              © {new Date().getFullYear()} SIMS — Platform Admin Dashboard
            </p>
          </footer>
        </div>
      </div>
    );
  }

  // ============================
  // SCHOOL ADMIN DASHBOARD
  // ============================
  const renderView = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardView />;
      case "student-add":
        return <StudentAddView />;
      case "students":
        return <StudentListView />;
      case "teachers":
        return <TeacherListView />;
      case "subjects":
        return <SubjectListView />;
      case "classes":
        return <ClassListView />;
      case "sessions":
        return <SessionListView />;
      case "exams":
        return <ExamView />;
      case "results":
        return <ResultView />;
      case "grading":
        return <GradingView />;
      case "card-settings":
        return <CardSettingsView />;
      case "broadsheet":
        return <BroadsheetView />;
      case "remarks":
        return <RemarksView />;
      case "signatures":
        return <SignaturesView />;
      case "class-position":
        return <ClassPositionView />;
      case "subject-position":
        return <SubjectPositionView />;
      case "users":
        return <UserListView />;
      case "parents":
        return <ParentListView />;
      case "assessment-settings":
        return <AssessmentSettingsView />;
      case "subscription":
        return <SubscriptionPage />;
      case "finance":
        return <FinanceView />;
      case "budgets":
        return <BudgetView />;
      case "inventory":
        return <InventoryView />;
      case "vouchers":
        return <VoucherView />;
      case "classroom":
        return <ClassroomView />;
      case "profile":
        return <ProfileView />;
      case "school-profile":
        return <SchoolProfilePage />;
      case "score-import":
        return <ScoreImportPage />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div
        className={`flex flex-1 flex-col transition-all duration-300 ${sidebarOpen ? "lg:ml-[240px]" : "lg:ml-16"
          }`}
      >
        {/* Impersonation Banner */}
        {isImpersonating && (
          <div className="flex items-center justify-between bg-indigo-600 px-4 py-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-white" />
              <span className="text-xs font-medium text-white">
                Impersonating: <strong>{impersonatedTenantName}</strong> — Full admin access enabled
              </span>
            </div>
            <button
              onClick={stopImpersonation}
              className="rounded-md bg-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/30 transition-colors"
            >
              Exit to Dev Dashboard
            </button>
          </div>
        )}
        <Header />
        <main className="flex-1 p-4 md:p-6">{renderView()}</main>
        <footer className="border-t bg-white px-6 py-3">
          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} {tenant?.name || "SIMS"} — Complete School Management
          </p>
        </footer>
      </div>
    </div>
  );
}