'use client'

import React, { useState, useEffect } from 'react'
import { useAppStore, type PageView } from '@/store/index'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  LayoutDashboard,
  School,
  FileEdit,
  ClipboardList,
  Megaphone,
  LogOut,
  GraduationCap,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  KeyRound,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChangePasswordDialog } from '@/components/ui/change-password-dialog'

interface NavItem {
  label: string
  page: PageView
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { label: 'Dashboard', page: 'teacher-dashboard', icon: LayoutDashboard },
  { label: 'My Classes', page: 'teacher-classes', icon: School },
  { label: 'Score Entry', page: 'teacher-scores', icon: FileEdit },
  { label: 'Assignments', page: 'teacher-assignments', icon: ClipboardList },
  { label: 'Announcements', page: 'teacher-announcements', icon: Megaphone },
]

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
        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
        isActive
          ? 'text-white shadow-sm'
          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
        collapsed && 'justify-center px-2'
      )}
      style={
        isActive
          ? { backgroundColor: primaryColor }
          : undefined
      }
    >
      <Icon className={cn('size-4 shrink-0', collapsed ? 'size-5' : 'size-4')} />
      {!collapsed && <span>{item.label}</span>}
    </button>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    )
  }

  return button
}

export function TeacherSidebar() {
  const { currentPage, sidebarOpen, user, tenant, navigate, logout, setSidebarOpen, toggleSidebar } =
    useAppStore()
  const [isMobile, setIsMobile] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [sidebarOpen])

  const primaryColor = tenant?.primaryColor || '#821329'
  const schoolName = tenant?.name || 'SchoolDesk'
  const schoolLogo = tenant?.logo || null
  const teacherName = user?.username || 'Teacher'

  const handleNavigate = (page: PageView) => {
    navigate(page)
    if (isMobile) {
      setSidebarOpen(false)
    }
  }

  const handleLogout = () => {
    logout()
  }

  const collapsed = !sidebarOpen && !isMobile

  return (
    <>
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full flex-col bg-slate-950 border-r border-slate-800/80 transition-all duration-300 ease-in-out',
          isMobile
            ? sidebarOpen
              ? 'w-[280px] translate-x-0'
              : 'w-[280px] -translate-x-full'
            : sidebarOpen
              ? 'w-[240px] translate-x-0'
              : 'w-[64px] translate-x-0'
        )}
      >
        <div className="flex h-14 items-center gap-3 border-b border-slate-800/80 px-3">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white text-sm font-bold"
            style={{ backgroundColor: primaryColor }}
          >
            {schoolLogo ? (
              <img src={schoolLogo} alt={schoolName} className="h-6 w-6 rounded-md object-cover" />
            ) : (
              <GraduationCap className="h-4 w-4 text-white" />
            )}
          </div>

          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-semibold text-white">{schoolName}</p>
            </div>
          )}

          {isMobile && (
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-slate-400 hover:bg-slate-800 hover:text-white" onClick={() => setSidebarOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          )}

          {!isMobile && sidebarOpen && (
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-slate-400 hover:bg-slate-800 hover:text-white" onClick={toggleSidebar}>
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          )}
        </div>

        {!collapsed && (
          <div className="border-b border-slate-800/80 px-4 py-2.5">
            <p className="text-xs text-slate-500">Teacher Portal</p>
            <p className="truncate text-sm font-medium text-slate-300">{teacherName}</p>
          </div>
        )}

        <ScrollArea className="flex-1 px-2 py-3">
          <div className="space-y-1">
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Navigation
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

            <Separator className="my-2 bg-slate-800/60" />

            {/* Change Password */}
            <div className="space-y-1">
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setShowChangePassword(true)}
                      className="flex w-full items-center justify-center rounded-lg px-2 py-2 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
                    >
                      <KeyRound className="size-4 shrink-0" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Change Password</TooltipContent>
                </Tooltip>
              ) : (
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
                >
                  <KeyRound className="size-4 shrink-0" />
                  <span>Change Password</span>
                </button>
              )}
            </div>

            <Separator className="my-2 bg-slate-800/60" />

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

        {!isMobile && !sidebarOpen && (
          <div className="border-t border-slate-800/80 px-2 py-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={toggleSidebar} className="flex w-full items-center justify-center rounded-lg px-2 py-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">
                  <PanelLeftOpen className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            </Tooltip>
          </div>
        )}

        {!collapsed && (
          <div className="border-t border-slate-800/80 px-4 py-2.5">
            <p className="text-[11px] text-slate-600">
              &copy; {new Date().getFullYear()} {schoolName}
            </p>
          </div>
        )}
      </aside>

      <ChangePasswordDialog
        open={showChangePassword}
        onOpenChange={setShowChangePassword}
        userId={user?.id || ''}
        userName={user?.username}
      />
    </>
  )
}
