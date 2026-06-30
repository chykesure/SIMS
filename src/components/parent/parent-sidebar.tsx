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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LayoutDashboard,
  Award,
  Wallet,
  Megaphone,
  LogOut,
  GraduationCap,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  KeyRound,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { ChangePasswordDialog } from '@/components/ui/change-password-dialog'

interface NavItem {
  label: string
  page: PageView
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { label: 'Dashboard', page: 'parent-dashboard', icon: LayoutDashboard },
  { label: 'Results', page: 'parent-results', icon: Award },
  { label: 'Fees', page: 'parent-fees', icon: Wallet },
  { label: 'Announcements', page: 'parent-announcements', icon: Megaphone },
]

interface ChildOption {
  id: string
  fullname: string
  class: string
  imageUrl: string
}

export function ParentSidebar() {
  const {
    currentPage,
    sidebarOpen,
    user,
    tenant,
    navigate,
    logout,
    setSidebarOpen,
    toggleSidebar,
    selectedChildId,
    setSelectedChildId,
  } = useAppStore()

  const [isMobile, setIsMobile] = useState(false)
  const [children, setChildren] = useState<ChildOption[]>([])
  const [loading, setLoading] = useState(true)
  const [parentName, setParentName] = useState('')
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

  useEffect(() => {
    async function fetchParentData() {
      try {
        const res = await fetch('/api/portal/parent', {
          headers: { 'x-user-id': user?.id || '' },
        })
        if (res.ok) {
          const json = await res.json()
          if (json.success && json.data) {
            setParentName(json.data.parent.fullname)
            const kids = json.data.children || []
            setChildren(kids.map((c: { id: string; fullname: string; class: string; imageUrl: string }) => ({
              id: c.id,
              fullname: c.fullname,
              class: c.class,
              imageUrl: c.imageUrl,
            })))
            if (kids.length > 0 && !selectedChildId) {
              setSelectedChildId(kids[0].id)
            }
          }
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    if (user?.id) {
      fetchParentData()
    }
  }, [user?.id, selectedChildId, setSelectedChildId])

  const primaryColor = tenant?.primaryColor || '#821329'
  const schoolName = tenant?.name || 'SchoolDesk'
  const schoolLogo = tenant?.logo || null

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

        {/* Child selector */}
        {!collapsed && children.length > 1 && (
          <div className="px-3 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Users className="size-3.5 text-slate-500" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Select Child
              </span>
            </div>
            <Select
              value={selectedChildId || ''}
              onValueChange={(val) => setSelectedChildId(val)}
            >
              <SelectTrigger className="h-8 text-xs bg-slate-900 border-slate-700 text-white">
                <SelectValue placeholder="Select child..." />
              </SelectTrigger>
              <SelectContent>
                {children.map((child) => (
                  <SelectItem key={child.id} value={child.id} className="text-xs">
                    {child.fullname} — {child.class}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {collapsed && children.length > 1 && (
          <div className="flex justify-center py-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: primaryColor }}>
                  {children.length}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                {children.length} children linked
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        <Separator className="bg-slate-800/60" />

        <ScrollArea className="flex-1 px-2 py-3">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPage === item.page

              const button = (
                <button
                  key={item.page}
                  onClick={() => handleNavigate(item.page)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'text-white shadow-sm'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
                    collapsed && 'justify-center px-2'
                  )}
                  style={isActive ? { backgroundColor: primaryColor } : undefined}
                >
                  <Icon className={cn('size-4 shrink-0', collapsed ? 'size-5' : 'size-4')} />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              )

              if (collapsed) {
                return (
                  <Tooltip key={item.page}>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                )
              }

              return button
            })}

            <Separator className="my-2 bg-slate-800/60" />

            {/* Parent info */}
            {!collapsed && (
              <div className="px-3 py-2">
                <div className="flex items-center gap-3">
                  <Avatar className="size-8 shrink-0">
                    <AvatarImage src={user?.imageUrl} alt={parentName} />
                    <AvatarFallback className="bg-slate-800 text-xs text-white">
                      {parentName?.charAt(0)?.toUpperCase() || 'P'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium text-slate-300">
                      {parentName || (loading ? '' : 'Parent')}
                    </p>
                    {loading ? (
                      <Skeleton className="h-3 w-20 bg-slate-800 mt-0.5" />
                    ) : (
                      <p className="truncate text-[11px] text-slate-500">
                        Parent Portal
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

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

            {/* Logout */}
            <div className="space-y-1 pt-1">
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
