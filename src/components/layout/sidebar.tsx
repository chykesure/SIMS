"use client";

import React, { useState, useEffect } from "react";
import { useAppStore, type PageView } from "@/store/index";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  LayoutDashboard,
  UserPlus,
  Users,
  BookOpen,
  School,
  Calendar,
  FileText,
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
  ChevronDown,
  SlidersHorizontal,
  CreditCard,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Wallet,
  DoorOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  page: PageView;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title: string;
  items?: NavItem[];
  item?: NavItem;
}

const navSections: NavSection[] = [
  {
    title: "Main",
    item: { label: "Dashboard", page: "dashboard", icon: LayoutDashboard },
  },
  {
    title: "People",
    items: [
      { label: "Add Student", page: "student-add", icon: UserPlus },
      { label: "Student List", page: "students", icon: Users },
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
      { label: "Report Card Settings", page: "card-settings", icon: Settings },
      { label: "Broadsheet", page: "broadsheet", icon: Table },
    ],
  },
  {
    title: "Settings",
    items: [
      { label: "Assessment Settings", page: "assessment-settings", icon: SlidersHorizontal },
      { label: "Remarks", page: "remarks", icon: MessageSquare },
      { label: "Signatures", page: "signatures", icon: PenTool },
    ],
  },
  {
    title: "Billing",
    item: { label: "Subscription & Plan", page: "subscription", icon: CreditCard },
  },
  {
    title: "Finance",
    item: { label: "Finance", page: "finance", icon: Wallet },
  },
  {
    title: "Classroom",
    item: { label: "Classroom", page: "classroom", icon: DoorOpen },
  },
  {
    title: "Positioning",
    items: [
      { label: "Class Position", page: "class-position", icon: Trophy },
      { label: "Subject Position", page: "subject-position", icon: Medal },
    ],
  },
];

const adminSection: NavSection = {
  title: "Admin",
  items: [
    { label: "Users", page: "users", icon: UserCog },
  ],
};

function NavItemButton({
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

  const button = (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
        isActive
          ? "text-white shadow-sm"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
        collapsed && "justify-center px-2"
      )}
      style={isActive ? { backgroundColor: primaryColor } : undefined}
    >
      <Icon className={cn("size-4 shrink-0", collapsed ? "size-5" : "size-4")} />
      {!collapsed && <span>{item.label}</span>}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return button;
}

function NavSectionDropdown({
  section,
  currentPage,
  navigate,
  collapsed,
  defaultOpen,
  primaryColor,
}: {
  section: NavSection;
  currentPage: PageView;
  navigate: (page: PageView) => void;
  collapsed: boolean;
  defaultOpen?: boolean;
  primaryColor: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen ?? false);
  const hasDropdown = !!section.items && section.items.length > 0;
  const sectionPages = section.items?.map((i) => i.page) ?? [];
  const isSectionActive = sectionPages.includes(currentPage);

  if (collapsed) {
    return (
      <div className="space-y-1">
        <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {section.title}
        </p>
        {section.items?.map((item) => (
          <NavItemButton
            key={item.label}
            item={item}
            isActive={currentPage === item.page}
            onClick={() => navigate(item.page)}
            collapsed
            primaryColor={primaryColor}
          />
        ))}
      </div>
    );
  }

  if (!hasDropdown && section.item) {
    return (
      <div className="space-y-1">
        <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {section.title}
        </p>
        <NavItemButton
          item={section.item}
          isActive={currentPage === section.item.page}
          onClick={() => navigate(section.item!.page)}
          collapsed={false}
          primaryColor={primaryColor}
        />
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="space-y-1">
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isSectionActive
                ? "text-slate-200"
                : "text-slate-500 hover:text-slate-300"
            )}
          >
            <span className="flex-1 text-left text-xs font-medium uppercase tracking-wider">
              {section.title}
            </span>
            <ChevronDown
              className={cn(
                "size-3.5 shrink-0 text-slate-600 transition-transform duration-200",
                isOpen && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-0.5">
            {section.items?.map((item) => (
              <NavItemButton
                key={item.label}
                item={item}
                isActive={currentPage === item.page}
                onClick={() => navigate(item.page)}
                collapsed={false}
                primaryColor={primaryColor}
              />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function Sidebar() {
  const { currentPage, sidebarOpen, user, tenant, navigate, logout, setSidebarOpen, toggleSidebar } =
    useAppStore();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [sidebarOpen]);

  const primaryColor = tenant?.primaryColor || "#821329";
  const schoolName = tenant?.name || "School Manager";
  const schoolLogo = tenant?.logo || null;

  const handleNavigate = (page: PageView) => {
    navigate(page);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const collapsed = !sidebarOpen && !isMobile;

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full flex-col bg-slate-950 border-r border-slate-800/80 transition-all duration-300 ease-in-out",
          isMobile
            ? sidebarOpen
              ? "w-[280px] translate-x-0"
              : "w-[280px] -translate-x-full"
            : sidebarOpen
              ? "w-[240px] translate-x-0"
              : "w-[64px] translate-x-0"
        )}
      >
        {/* Header with branding */}
        <div className="flex h-14 items-center gap-3 border-b border-slate-800/80 px-3">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white text-sm font-bold"
            style={{ backgroundColor: primaryColor }}
          >
            {schoolLogo ? (
              <img
                src={schoolLogo}
                alt={schoolName}
                className="h-6 w-6 rounded-md object-cover"
              />
            ) : (
              <GraduationCap className="h-4 w-4 text-white" />
            )}
          </div>

          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-semibold text-white">
                {schoolName}
              </p>
            </div>
          )}

          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-slate-400 hover:bg-slate-800 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          {!isMobile && sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-slate-400 hover:bg-slate-800 hover:text-white"
              onClick={toggleSidebar}
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-2 py-3">
          <div className="space-y-1">
            {navSections.map((section) => (
              <NavSectionDropdown
                key={section.title}
                section={section}
                currentPage={currentPage}
                navigate={handleNavigate}
                collapsed={collapsed}
                defaultOpen={
                  section.items?.some((i) => i.page === currentPage) ?? false
                }
                primaryColor={primaryColor}
              />
            ))}

            <Separator className="my-2 bg-slate-800/60" />

            {/* Admin section - only show for Admin role */}
            {user?.role === "Admin" && (
              <>
                <NavSectionDropdown
                  section={adminSection}
                  currentPage={currentPage}
                  navigate={handleNavigate}
                  collapsed={collapsed}
                  defaultOpen={currentPage === "users"}
                  primaryColor={primaryColor}
                />
                <Separator className="my-2 bg-slate-800/60" />
              </>
            )}

            {/* Logout */}
            <div className="space-y-1 pt-2">
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center justify-center rounded-lg px-2 py-2 text-sm text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                      <LogOut className="size-4 shrink-0" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Logout</TooltipContent>
                </Tooltip>
              ) : (
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  <LogOut className="size-4 shrink-0" />
                  <span>Logout</span>
                </button>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Footer - expand button when collapsed */}
        {!isMobile && !sidebarOpen && (
          <div className="border-t border-slate-800/80 px-2 py-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleSidebar}
                  className="flex w-full items-center justify-center rounded-lg px-2 py-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                >
                  <PanelLeftOpen className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Footer when expanded */}
        {!collapsed && (
          <div className="border-t border-slate-800/80 px-4 py-2.5">
            <p className="text-[11px] text-slate-600">
              © {new Date().getFullYear()} {schoolName}
            </p>
          </div>
        )}
      </aside>
    </>
  );
}