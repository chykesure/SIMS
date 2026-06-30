'use client'

import React, { useState } from 'react'
import { useAppStore, type PageView } from '@/store/index'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  LayoutDashboard,
  Award,
  ClipboardList,
  Wallet,
  Megaphone,
  LogOut,
  GraduationCap,
  PanelLeftClose,
  PanelLeftOpen,
  KeyRound,
  Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import { ChangePasswordDialog } from '@/components/ui/change-password-dialog'

interface NavItem {
  label: string
  page: PageView
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { label: 'Dashboard', page: 'student-dashboard', icon: LayoutDashboard },
  { label: 'My Results', page: 'student-results', icon: Award },
  { label: 'My Assignments', page: 'student-assignments', icon: ClipboardList },
  { label: 'My Fees', page: 'student-fees', icon: Wallet },
  { label: 'Announcements', page: 'student-announcements', icon: Megaphone },
]

/* ────────────────────────────────────────────── */
/*  Nav Item Button                               */
/* ────────────────────────────────────────────── */

function NavItemButton({
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

  const button = (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-[7px] text-[13px] font-medium transition-all duration-200',
        collapsed && 'justify-center px-2',
        isActive
          ? 'text-white'
          : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
      )}
    >
      {isActive && !collapsed && (
        <span
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
          style={{ backgroundColor: primaryColor }}
        />
      )}
      <span
        className={cn(
          'shrink-0 transition-transform duration-200 group-hover:scale-110',
          collapsed ? 'size-5' : 'size-[18px]'
        )}
      >
        <Icon className={cn('size-full', isActive && 'drop-shadow-sm')} />
      </span>
      {!collapsed && <span className="truncate">{item.label}</span>}
      {isActive && (
        <span
          className="absolute inset-0 rounded-lg"
          style={{ backgroundColor: primaryColor, opacity: 0.2 }}
        />
      )}
    </button>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {item.label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return button
}

/* ────────────────────────────────────────────── */
/*  Main Student Sidebar Component                */
/* ────────────────────────────────────────────── */

export function StudentSidebar() {
  const { currentPage, sidebarOpen, user, tenant, navigate, logout, setSidebarOpen, toggleSidebar } =
    useAppStore()
  const isMobile = useIsMobile()
  const [showChangePassword, setShowChangePassword] = useState(false)

  const primaryColor = tenant?.primaryColor || '#821329'
  const schoolName = tenant?.name || 'Student Portal'
  const schoolLogo = tenant?.logo || null

  const collapsed = !sidebarOpen && !isMobile

  const handleNavigate = (page: PageView) => {
    navigate(page)
    if (isMobile) setSidebarOpen(false)
  }

  const handleLogout = () => {
    logout()
    if (isMobile) setSidebarOpen(false)
  }

  /* ─── Branding header ─── */
  const brandingHeader = (
    <div className="relative flex h-16 items-center gap-3 px-4">
      <span
        className="absolute left-0 right-0 top-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}80, transparent)` }}
      />
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-lg transition-transform duration-200 hover:scale-105"
        style={{
          backgroundColor: primaryColor,
          boxShadow: `0 4px 12px ${primaryColor}40`,
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
          <p className="truncate text-[10px] font-medium text-slate-400">
            Student Portal
          </p>
        </div>
      )}
    </div>
  )

  /* ─── Nav content ─── */
  const navContent = (
    <div className="space-y-0.5">
      <p className="px-3 pb-1 pt-3 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
        Menu
      </p>
      {navItems.map((item) => (
        <NavItemButton
          key={item.page}
          item={item}
          isActive={currentPage === item.page}
          onClick={() => handleNavigate(item.page)}
          collapsed={collapsed}
          primaryColor={primaryColor}
        />
      ))}

      <div className="mx-2 my-3 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* Student info when expanded */}
      {!collapsed && user && (
        <div className="mx-1 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
          <p className="text-[10px] font-medium text-slate-500">Logged in as</p>
          <p className="truncate text-sm font-medium text-slate-200">
            {user.username}
          </p>
          <p className="text-[11px] text-slate-500">
            {user.email}
          </p>
        </div>
      )}

      {/* Change Password */}
      {!collapsed && (
        <button
          onClick={() => setShowChangePassword(true)}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-[7px] text-[13px] font-medium text-slate-400 transition-all duration-200 hover:bg-white/[0.06] hover:text-white"
        >
          <KeyRound className="size-[18px] shrink-0" />
          <span>Change Password</span>
        </button>
      )}

      {collapsed && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setShowChangePassword(true)}
              className="flex w-full items-center justify-center rounded-lg px-2 py-2 text-slate-400 transition-all duration-200 hover:bg-white/[0.06] hover:text-white"
            >
              <KeyRound className="size-[18px]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">Change Password</TooltipContent>
        </Tooltip>
      )}
    </div>
  )

  /* ─── Logout button ─── */
  const logoutButton = collapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center rounded-lg px-2 py-2 text-slate-400 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="size-[18px]" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="font-medium">Logout</TooltipContent>
    </Tooltip>
  ) : (
    <button
      onClick={handleLogout}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-[7px] text-[13px] font-medium text-slate-400 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400"
    >
      <LogOut className="size-[18px] shrink-0" />
      <span>Logout</span>
    </button>
  )

  /* ─── Footer ─── */
  const footerContent = !collapsed && (
    <div className="border-t border-white/[0.06] px-4 py-3">
      <p className="text-[10px] font-medium text-slate-600">
        © {new Date().getFullYear()} {schoolName}
      </p>
    </div>
  )

  /* ══════════════════════════════════════════════
     MOBILE: Use Sheet (proper drawer with gesture)
     ══════════════════════════════════════════════ */
  if (isMobile) {
    return (
      <>
        {/* Floating hamburger */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed left-3 top-3 z-[60] flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-lg shadow-black/10 transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95"
            style={{ border: `2px solid ${primaryColor}20` }}
          >
            <Menu className="size-5" style={{ color: primaryColor }} />
          </button>
        )}

        {/* Sheet drawer */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent
            side="left"
            className="w-[280px] p-0 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 border-white/[0.06]"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <div className="flex h-full flex-col">
              {brandingHeader}
              <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <ScrollArea className="flex-1 px-3 py-2">
                {navContent}
              </ScrollArea>
              {/* Logout button — fixed at bottom */}
              <div className="px-3 py-2">
                {logoutButton}
              </div>
              {footerContent}
            </div>
          </SheetContent>
        </Sheet>

        {/* Change Password Dialog */}
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
    <>
      <aside
        className={cn(
          'fixed left-0 top-0 z-[70] flex h-full flex-col transition-all duration-300 ease-in-out',
          'bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900',
          'border-r border-white/[0.06]',
          'shadow-xl shadow-black/20',
          sidebarOpen
            ? 'w-[260px] translate-x-0'
            : 'w-[68px] translate-x-0'
        )}
      >
        {/* Branding */}
        {brandingHeader}

        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <ScrollArea className="flex-1 px-3 py-2">
          {navContent}
        </ScrollArea>

        {/* Logout button — fixed at bottom */}
        <div className="px-3 py-2">
          {logoutButton}
        </div>

        {/* Collapsed footer with expand button */}
        {!sidebarOpen && (
          <div className="border-t border-white/[0.06] px-2 py-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleSidebar}
                  className="flex w-full items-center justify-center rounded-lg py-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <PanelLeftOpen className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                Expand sidebar
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Desktop collapse button when expanded */}
        {sidebarOpen && (
          <div className="border-t border-white/[0.06] px-2 py-3">
            <button
              onClick={toggleSidebar}
              className="flex w-full items-center justify-center rounded-lg py-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <PanelLeftClose className="size-4" />
            </button>
          </div>
        )}

        {footerContent}
      </aside>

      {/* Change Password Dialog */}
      <ChangePasswordDialog
        open={showChangePassword}
        onOpenChange={setShowChangePassword}
        userId={user?.id || ''}
        userName={user?.username}
      />
    </>
  )
}