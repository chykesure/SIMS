// src/components/layout/sidebar.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useAppStore, type PageView } from "@/store/index";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  UserPlus,
  Users,
  BookOpen,
  School,
  Calendar,
  FileText,
  FileSpreadsheet,
  Award,
  BarChart3,
  Settings,
  Table,
  MessageSquare,
  PenTool,
  Trophy,
  Medal,
  UserCog,
  LogOut,
  GraduationCap,
  SlidersHorizontal,
  CreditCard,
  PanelLeftClose,
  PanelLeftOpen,
  Wallet,
  DoorOpen,
  Menu,
  ChevronRight,
  Sparkles,
  Shield,
  Package,
  Receipt,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

/* ────────────────────────────────────────────── */
/*  Navigation Data                               */
/* ────────────────────────────────────────────── */

interface NavItem {
  label: string;
  page: PageView;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Main",
    items: [{ label: "Dashboard", page: "dashboard", icon: LayoutDashboard }],
  },
  {
    title: "People",
    items: [
      { label: "Add Student", page: "student-add", icon: UserPlus },
      { label: "Students", page: "students", icon: Users },
      { label: "Teachers", page: "teachers", icon: GraduationCap },
    ],
  },
  {
    title: "Academics",
    items: [
      { label: "Subjects", page: "subjects", icon: BookOpen },
      { label: "Classes", page: "classes", icon: School },
      { label: "Sessions", page: "sessions", icon: Calendar },
      { label: "Exams", page: "exams", icon: FileText },
      { label: "Results", page: "results", icon: Award },
      { label: "Grading", page: "grading", icon: BarChart3 },
    ],
  },
  {
    title: "Records",
    items: [
      { label: "Report Card", page: "card-settings", icon: Settings },
      { label: "Broadsheet", page: "broadsheet", icon: Table },
    ],
  },
  {
    title: "Settings",
    items: [
      { label: "School Profile", page: "school-profile", icon: Settings },
      { label: "Score Import", page: "score-import", icon: FileSpreadsheet },
      { label: "Assessment", page: "assessment-settings", icon: SlidersHorizontal },
      { label: "Remarks", page: "remarks", icon: MessageSquare },
      { label: "Signatures", page: "signatures", icon: PenTool },
    ],
  },
  {
    title: "Positioning",
    items: [
      { label: "Class Position", page: "class-position", icon: Trophy },
      { label: "Subject Position", page: "subject-position", icon: Medal },
    ],
  },
  {
    title: "Finance",
    items: [{ label: "Finance", page: "finance", icon: Wallet }],
  },
  {
    title: "Classroom",
    items: [{ label: "Classroom", page: "classroom", icon: DoorOpen }],
  },
  {
    title: "Billing",
    items: [{ label: "Subscription", page: "subscription", icon: CreditCard }],
  },
];

const ADMIN_ITEMS: NavItem[] = [
  { label: "Users", page: "users", icon: UserCog },
];

const BURSAR_ITEMS: NavItem[] = [
  { label: "Finance", page: "finance", icon: Wallet },
  { label: "Budgets", page: "budgets", icon: BarChart3 },
  { label: "Inventory", page: "inventory", icon: Package },
  { label: "Vouchers", page: "vouchers", icon: Receipt },
];

const CLASS_TEACHER_ITEMS: NavItem[] = [
  { label: "My Students", page: "teacher-students", icon: Users },
  { label: "Attendance", page: "attendance", icon: ClipboardCheck },
];

/* ────────────────────────────────────────────── */
/*  Single Nav Item                               */
/* ────────────────────────────────────────────── */

function NavButton({
  item,
  isActive,
  onClick,
  collapsed,
  primaryColor,
}: {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
  collapsed: boolean;
  primaryColor: string;
}) {
  const Icon = item.icon;

  const btn = (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-xl px-3 py-[9px] text-[13px] font-medium transition-all duration-200 outline-none",
        "focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950",
        collapsed && "justify-center px-2 gap-0",
        isActive
          ? "text-white"
          : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-100"
      )}
    >
      {isActive && (
        <span
          className="absolute inset-0 rounded-xl transition-colors duration-200"
          style={{ backgroundColor: primaryColor, opacity: 0.18 }}
        />
      )}

      {isActive && !collapsed && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 h-[18px] w-[3px] rounded-r-full"
          style={{ backgroundColor: primaryColor }}
        />
      )}

      <span
        className={cn(
          "relative z-10 shrink-0 transition-transform duration-200 group-hover:scale-110",
          collapsed ? "size-5" : "size-[18px]"
        )}
        style={isActive ? { color: primaryColor } : undefined}
      >
        <Icon
          className={cn(
            "size-full transition-colors duration-200",
            isActive && "drop-shadow-sm"
          )}
        />
      </span>

      {!collapsed && (
        <span className="relative z-10 truncate">{item.label}</span>
      )}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{btn}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return btn;
}

/* ────────────────────────────────────────────── */
/*  Grouped Nav Section                           */
/* ────────────────────────────────────────────── */

function NavGroupSection({
  group,
  currentPage,
  navigate,
  collapsed,
  primaryColor,
}: {
  group: NavGroup;
  currentPage: PageView;
  navigate: (page: PageView) => void;
  collapsed: boolean;
  primaryColor: string;
}) {
  if (collapsed) {
    return (
      <>
        <div className="my-2 mx-3 border-t border-white/[0.06]" />
        {group.items.map((item) => (
          <NavButton
            key={item.label}
            item={item}
            isActive={currentPage === item.page}
            onClick={() => navigate(item.page)}
            collapsed
            primaryColor={primaryColor}
          />
        ))}
      </>
    );
  }

  return (
    <div className="mb-1">
      <p className="flex items-center gap-2 px-3 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 select-none">
        {group.title}
      </p>
      <ul className="space-y-0.5">
        {group.items.map((item) => (
          <li key={item.label}>
            <NavButton
              item={item}
              isActive={currentPage === item.page}
              onClick={() => navigate(item.page)}
              collapsed={false}
              primaryColor={primaryColor}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ────────────────────────────────────────────── */
/*  Shared scrollable nav content                */
/* ────────────────────────────────────────────── */

function SidebarContent({
  currentPage,
  navigate,
  collapsed,
  primaryColor,
  user,
}: {
  currentPage: PageView;
  navigate: (page: PageView) => void;
  collapsed: boolean;
  primaryColor: string;
  user: { username?: string; role?: string; roles?: string[] } | null;
}) {
  const userRoles = user?.roles ?? [];
  const isAdmin = user?.role === "Admin" || userRoles.includes("ADMIN") || userRoles.includes("Admin");
  const isBursar = Array.isArray(userRoles) && (userRoles.includes("BURSAR") || userRoles.includes("Bursar"));
  const isClassTeacher = Array.isArray(userRoles) && (userRoles.includes("CLASS_TEACHER") || userRoles.includes("Class_Teacher"));

  // Remove default Finance group if user is a Bursar
  const filteredGroups = NAV_GROUPS.filter(
    (g) => !(g.title === "Finance" && isBursar)
  );

  // Build role-based sections
  const roleSections: NavGroup[] = [];
  if (isAdmin) roleSections.push({ title: "Admin", items: ADMIN_ITEMS });
  if (isBursar) roleSections.push({ title: "Finance", items: BURSAR_ITEMS });
  if (isClassTeacher) roleSections.push({ title: "Class Teacher", items: CLASS_TEACHER_ITEMS });

  // Insert role sections after "Records" (index 3)
  const allGroups = [...filteredGroups];
  allGroups.splice(3, 0, ...roleSections);

  return (
    <ScrollArea className="h-full px-3 py-2">
      <div className="space-y-0.5">
        {allGroups.map((group) => (
          <NavGroupSection
            key={group.title}
            group={group}
            currentPage={currentPage}
            navigate={navigate}
            collapsed={collapsed}
            primaryColor={primaryColor}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

/* ────────────────────────────────────────────── */
/*  Main Sidebar Component                        */
/* ────────────────────────────────────────────── */

export function Sidebar() {
  const {
    currentPage,
    sidebarOpen,
    user,
    tenant,
    navigate,
    logout,
    setSidebarOpen,
    toggleSidebar,
  } = useAppStore();

  const isMobile = useIsMobile();

  const primaryColor = tenant?.primaryColor || "#821329";
  const schoolName = tenant?.name || "School Manager";
  const schoolLogo = tenant?.logo || null;
  const collapsed = !sidebarOpen && !isMobile;

  const handleNavigate = (page: PageView) => {
    navigate(page);
    if (isMobile) setSidebarOpen(false);
  };

  const handleLogout = () => {
    logout();
    if (isMobile) setSidebarOpen(false);
  };

  /* ─── Branding Header ─── */
  const brandingHeader = (
    <div className="relative flex h-16 items-center gap-3 px-4 shrink-0">
      <span
        className="absolute left-0 right-0 top-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}60, transparent)`,
        }}
      />

      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-lg transition-transform duration-200 hover:scale-105"
        style={{
          backgroundColor: primaryColor,
          boxShadow: `0 4px 14px ${primaryColor}35`,
        }}
      >
        {schoolLogo ? (
          <img
            src={schoolLogo}
            alt={schoolName}
            className="h-7 w-7 rounded-lg object-cover"
          />
        ) : (
          <GraduationCap className="h-5 w-5 text-white" />
        )}
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-hidden">
          <p className="truncate text-[13px] font-bold tracking-wide text-white">
            {schoolName}
          </p>
          <p className="truncate text-[10px] font-medium text-slate-500">
            School Management
          </p>
        </div>
      )}

      {sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-slate-300"
        >
          <PanelLeftClose className="size-4" />
        </button>
      )}
    </div>
  );

  /* ─── User Profile Footer ─── */
  const profileFooter = (
    <div className="shrink-0 border-t border-white/[0.06] p-3 space-y-1">
      {!collapsed && (
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white/[0.03]">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
            style={{ backgroundColor: primaryColor }}
          >
            {user?.username
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2) ?? "U"}
          </div>
          <div className="overflow-hidden min-w-0">
            <p className="truncate text-[13px] font-medium text-white">
              {user?.username ?? "User"}
            </p>
            <p className="truncate text-[11px] text-slate-500">
              {user?.role ?? "Admin"}
            </p>
          </div>
        </div>
      )}

      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center rounded-xl px-2 py-2.5 text-slate-500 transition-all duration-200 hover:bg-red-500/[0.08] hover:text-red-400"
            >
              <LogOut className="size-[18px]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            Logout
          </TooltipContent>
        </Tooltip>
      ) : (
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-slate-500 transition-all duration-200 hover:bg-red-500/[0.08] hover:text-red-400"
        >
          <LogOut className="size-[18px] shrink-0" />
          <span>Logout</span>
        </button>
      )}

      {collapsed && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={toggleSidebar}
              className="flex w-full items-center justify-center rounded-xl py-2 text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-slate-300"
            >
              <PanelLeftOpen className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            Expand sidebar
          </TooltipContent>
        </Tooltip>
      )}

      {!collapsed && (
        <p className="text-center text-[10px] font-medium text-slate-600 pt-1">
          &copy; {new Date().getFullYear()} {schoolName}
        </p>
      )}
    </div>
  );

  /* ══════════════════════════════════════════════
     MOBILE: Sheet drawer
     ══════════════════════════════════════════════ */
  if (isMobile) {
    return (
      <>
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed left-3 top-3 z-[60] flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-lg shadow-black/10 transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95"
            style={{ border: `2px solid ${primaryColor}20` }}
          >
            <Menu className="size-5" style={{ color: primaryColor }} />
          </button>
        )}

        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent
            side="left"
            className="w-[280px] p-0 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 border-white/[0.06]"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <div className="flex h-full flex-col overflow-hidden">
              {brandingHeader}
              <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent shrink-0" />
              <SidebarContent
                currentPage={currentPage}
                navigate={handleNavigate}
                collapsed={false}
                primaryColor={primaryColor}
                user={user}
              />
              {profileFooter}
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  /* ══════════════════════════════════════════════
     DESKTOP: Collapsible panel
     ══════════════════════════════════════════════ */
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-[70] flex h-full flex-col overflow-hidden transition-all duration-300 ease-in-out",
        "bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900",
        "border-r border-white/[0.06]",
        "shadow-xl shadow-black/20",
        sidebarOpen ? "w-[260px]" : "w-[68px]"
      )}
    >
      {brandingHeader}

      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent shrink-0" />

      <SidebarContent
        currentPage={currentPage}
        navigate={handleNavigate}
        collapsed={collapsed}
        primaryColor={primaryColor}
        user={user}
      />

      {profileFooter}
    </aside>
  );
}