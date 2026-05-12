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
  CreditCard,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  Receipt,
  Activity,
  Lock,
  Settings,
  Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  page: PageView
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { label: 'Platform Overview', page: 'dev-dashboard', icon: LayoutDashboard },
  { label: 'Schools', page: 'dev-schools', icon: School },
  { label: 'Payment Verification', page: 'dev-payments', icon: Receipt },
  { label: 'Subscription Plans', page: 'dev-plans', icon: CreditCard },
  { label: 'Session Management', page: 'dev-sessions', icon: Calendar },
  { label: 'Activity Log', page: 'dev-activity-log', icon: Activity },
  { label: 'Security', page: 'dev-security', icon: Lock },
  { label: 'Settings', page: 'dev-settings', icon: Settings },
]

function NavItemButton({
  item,
  isActive,
  onClick,
  collapsed,
}: {
  item: NavItem
  isActive: boolean
  onClick: () => void
  collapsed: boolean
}) {
  const Icon = item.icon

  const button = (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
        isActive
          ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25'
          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
        collapsed && 'justify-center px-2'
      )}
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

export function DevSidebar() {
  const { currentPage, sidebarOpen, navigate, setSidebarOpen, toggleSidebar } =
    useAppStore()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 768)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [sidebarOpen])

  const handleNavigate = (page: PageView) => {
    navigate(page)
    if (isMobile) {
      setSidebarOpen(false)
    }
  }

  const collapsed = !sidebarOpen && !isMobile

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
        {/* Header with branding */}
        <div className="flex h-14 items-center gap-3 border-b border-slate-800/80 px-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Shield className="h-4 w-4" />
          </div>

          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-semibold text-white">
                SchoolDesk
              </p>
              <p className="truncate text-[10px] text-slate-500">
                Platform Admin
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
            <p className={cn(
              'pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500',
              collapsed ? 'px-2' : 'px-3'
            )}>
              Platform
            </p>
            {navItems.map((item) => (
              <NavItemButton
                key={item.page}
                item={item}
                isActive={currentPage === item.page}
                onClick={() => handleNavigate(item.page)}
                collapsed={collapsed}
              />
            ))}
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

        {!collapsed && (
          <div className="border-t border-slate-800/80 px-4 py-2.5">
            <p className="text-[11px] text-slate-600">
              SchoolDesk Platform Admin
            </p>
          </div>
        )}
      </aside>
    </>
  )
}