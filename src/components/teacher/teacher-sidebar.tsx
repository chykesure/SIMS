//src/components/teacher/teacher-sidebar.tsx
'use client'

import React from 'react'
import { useAppStore, type PageView } from '@/store/index'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  LayoutDashboard,
  School,
  FileEdit,
  ClipboardList,
  Megaphone,
  LogOut,
  GraduationCap,
  PanelLeftClose,
  PanelLeftOpen,
  KeyRound,
  Users,
  UserPlus,
  BookOpen,
  Menu,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import { ChangePasswordDialog } from '@/components/ui/change-password-dialog'

/* ────────────────────────────────────────────── */
/*  Navigation Data                               */
/* ────────────────────────────────────────────── */

interface NavItem {
  label: string
  page: PageView
  icon: React.ComponentType<{ className?: string }>
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Main',
    items: [{ label: 'Dashboard', page: 'teacher-dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'People',
    items: [
      { label: 'Add Student', page: 'teacher-add-student', icon: UserPlus },
      { label: 'Students', page: 'teacher-students', icon: Users },
    ],
  },
  {
    title: 'Academics',
    items: [
      { label: 'My Classes', page: 'teacher-classes', icon: School },
      { label: 'Subjects', page: 'teacher-subjects', icon: BookOpen },
      { label: 'Score Entry', page: 'teacher-scores', icon: FileEdit },
      { label: 'AI Assistant', page: 'teacher-ai-assistant', icon: Sparkles },
      { label: 'Assignments', page: 'teacher-assignments', icon: ClipboardList },
      { label: 'Announcements', page: 'teacher-announcements', icon: Megaphone },
    ],
  },
]

/* ────────────────────────────────────────────── */
/*  Single Nav Button                             */
/* ────────────────────────────────────────────── */

function NavButton({
  item,
  isActive,
  onClick,
  collapsed,
  primaryColor,
}: {
  item: NavItem
  isActive: boolean
  onClick: () => void
  collapsed: boolean
  primaryColor: string
}) {
  const Icon = item.icon

  const btn = (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex w-full items-center gap-3 rounded-xl px-3 py-[9px] text-[13px] font-medium transition-all duration-200 outline-none',
        'focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950',
        collapsed && 'justify-center px-2 gap-0',
        isActive
          ? 'text-white'
          : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-100'
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
          'relative z-10 shrink-0 transition-transform duration-200 group-hover:scale-110',
          collapsed ? 'size-5' : 'size-[18px]'
        )}
        style={isActive ? { color: primaryColor } : undefined}
      >
        <Icon className={cn('size-full transition-colors duration-200', isActive && 'drop-shadow-sm')} />
      </span>
      {!collapsed && <span className="relative z-10 truncate">{item.label}</span>}
    </button>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{btn}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">{item.label}</TooltipContent>
      </Tooltip>
    )
  }

  return btn
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
  group: NavGroup
  currentPage: PageView
  navigate: (page: PageView) => void
  collapsed: boolean
  primaryColor: string
}) {
  if (collapsed) {
    return (
      <>
        <div className="my-2 mx-3 border-t border-white/[0.06]" />
        {group.items.map((item) => (
          <NavButton
            key={item.page}
            item={item}
            isActive={currentPage === item.page}
            onClick={() => navigate(item.page)}
            collapsed
            primaryColor={primaryColor}
          />
        ))}
      </>
    )
  }

  return (
    <div className="mb-1">
      <p className="flex items-center gap-2 px-3 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 select-none">
        {group.title}
      </p>
      <ul className="space-y-0.5">
        {group.items.map((item) => (
          <li key={item.page}>
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
  )
}

/* ────────────────────────────────────────────── */
/*  Main Sidebar Component                        */
/* ────────────────────────────────────────────── */

export function TeacherSidebar() {
  const {
    currentPage,
    sidebarOpen,
    user,
    tenant,
    navigate,
    logout,
    setSidebarOpen,
    toggleSidebar,
  } = useAppStore()

  const isMobile = useIsMobile()
  const primaryColor = tenant?.primaryColor || '#821329'
  const schoolName = tenant?.name || 'SchoolDesk'
  const schoolLogo = tenant?.logo || null
  const teacherName = user?.username || 'Teacher'
  const collapsed = !sidebarOpen && !isMobile
  const [showChangePassword, setShowChangePassword] = React.useState(false)

  const handleNavigate = (page: PageView) => {
    navigate(page)
    if (isMobile) setSidebarOpen(false)
  }

  const handleLogout = () => {
    logout()
    if (isMobile) setSidebarOpen(false)
  }

  /* ─── Branding Header ─── */
  const brandingHeader = (
    <div className="relative flex h-16 items-center gap-3 px-4 shrink-0">
      <span
        className="absolute left-0 right-0 top-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}60, transparent)` }}
      />
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-lg transition-transform duration-200 hover:scale-105"
        style={{ backgroundColor: primaryColor, boxShadow: `0 4px 14px ${primaryColor}35` }}
      >
        {schoolLogo ? (
          <img src={schoolLogo} alt={schoolName} className="h-7 w-7 rounded-lg object-cover" />
        ) : (
          <GraduationCap className="h-5 w-5 text-white" />
        )}
      </div>
      {!collapsed && (
        <div className="flex-1 overflow-hidden">
          <p className="truncate text-[13px] font-bold tracking-wide text-white">{schoolName}</p>
          <p className="truncate text-[10px] font-medium text-slate-500">Teacher Portal</p>
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
  )

  /* ─── User Profile Footer ─── */
  const profileFooter = (
    <div className="shrink-0 border-t border-white/[0.06] p-3 space-y-1">
      {!collapsed && (
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white/[0.03]">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
            style={{ backgroundColor: primaryColor }}
          >
            {teacherName.split(' ').map((n) => n[0]).join('').slice(0, 2) ?? 'T'}
          </div>
          <div className="overflow-hidden min-w-0">
            <p className="truncate text-[13px] font-medium text-white">{teacherName}</p>
            <p className="truncate text-[11px] text-slate-500">Teacher</p>
          </div>
        </div>
      )}

      {/* Change Password */}
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setShowChangePassword(true)}
              className="flex w-full items-center justify-center rounded-xl px-2 py-2.5 text-slate-500 transition-all duration-200 hover:bg-white/[0.06] hover:text-slate-300"
            >
              <KeyRound className="size-[18px]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">Change Password</TooltipContent>
        </Tooltip>
      ) : (
        <button
          onClick={() => setShowChangePassword(true)}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-slate-500 transition-all duration-200 hover:bg-white/[0.06] hover:text-slate-300"
        >
          <KeyRound className="size-[18px] shrink-0" />
          <span>Change Password</span>
        </button>
      )}

      {/* Logout */}
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
          <TooltipContent side="right" className="font-medium">Logout</TooltipContent>
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

      {/* Expand button (collapsed only) */}
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
          <TooltipContent side="right" className="font-medium">Expand sidebar</TooltipContent>
        </Tooltip>
      )}

      {!collapsed && (
        <p className="text-center text-[10px] font-medium text-slate-600 pt-1">
          &copy; {new Date().getFullYear()} {schoolName}
        </p>
      )}
    </div>
  )

  /* ══════════════════════════════════════════════
     MOBILE: Sheet drawer with floating hamburger
     ══════════════════════════════════════════════ */
  if (isMobile) {
    return (
      <>
        {/* Floating hamburger button */}
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
              <ScrollArea className="flex-1 px-3 py-2">
                <div className="space-y-0.5">
                  {NAV_GROUPS.map((group) => (
                    <NavGroupSection
                      key={group.title}
                      group={group}
                      currentPage={currentPage}
                      navigate={handleNavigate}
                      collapsed={false}
                      primaryColor={primaryColor}
                    />
                  ))}
                </div>
              </ScrollArea>
              {profileFooter}
            </div>
          </SheetContent>
        </Sheet>

        <ChangePasswordDialog
          open={showChangePassword}
          onOpenChange={setShowChangePassword}
          userId={user?.id || ''}
          userName={user?.username}
        />
      </>
    )
  }

  /* ══════════════════════════════════════════════
     DESKTOP: Collapsible panel
     ══════════════════════════════════════════════ */
  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-[70] flex h-full flex-col overflow-hidden transition-all duration-300 ease-in-out',
        'bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900',
        'border-r border-white/[0.06]',
        'shadow-xl shadow-black/20',
        sidebarOpen ? 'w-[260px]' : 'w-[68px]'
      )}
    >
      {brandingHeader}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent shrink-0" />
      <ScrollArea className="flex-1 px-3 py-2">
        <div className="space-y-0.5">
          {NAV_GROUPS.map((group) => (
            <NavGroupSection
              key={group.title}
              group={group}
              currentPage={currentPage}
              navigate={handleNavigate}
              collapsed={collapsed}
              primaryColor={primaryColor}
            />
          ))}
        </div>
      </ScrollArea>
      {profileFooter}

      <ChangePasswordDialog
        open={showChangePassword}
        onOpenChange={setShowChangePassword}
        userId={user?.id || ''}
        userName={user?.username}
      />
    </aside>
  )
}