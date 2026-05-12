'use client'

import React from 'react'
import { useAppStore } from '@/store/index'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { Menu, LogOut, Shield, ChevronDown, Bell } from 'lucide-react'

const devPageNameMap: Record<string, string> = {
  'dev-dashboard': 'Platform Overview',
  'dev-schools': 'Schools',
  'dev-school-detail': 'School Detail',
  'dev-plans': 'Subscription Plans',
  'dev-payments': 'Payment Verification',
  'dev-activity-log': 'Activity Log',
  'dev-security': 'Security Monitor',
  'dev-settings': 'Settings',
}

function getDevSection(page: string): string | null {
  const map: Record<string, string> = {
    'dev-schools': 'Management',
    'dev-school-detail': 'Management',
    'dev-plans': 'Configuration',
    'dev-payments': 'Finance',
    'dev-activity-log': 'Monitoring',
    'dev-security': 'Monitoring',
    'dev-settings': 'Account',
  }
  return map[page] ?? null
}

export function DevHeader() {
  const { currentPage, toggleSidebar, user, navigate, logout } = useAppStore()

  const pageName = devPageNameMap[currentPage] ?? 'Dashboard'
  const sectionName = getDevSection(currentPage)
  const userInitial = user?.username?.charAt(0).toUpperCase() ?? 'S'

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-slate-800/80 bg-slate-950 px-4 md:px-6">
      {/* Hamburger menu (mobile + desktop) */}
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 text-slate-400 hover:bg-slate-800 hover:text-white"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        <Menu className="size-5" />
      </Button>

      {/* Breadcrumb */}
      <Breadcrumb className="hidden sm:flex">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              href="#"
              onClick={(e) => {
                e.preventDefault()
                navigate('dev-dashboard')
              }}
              className="text-slate-400 hover:text-white"
            >
              Admin
            </BreadcrumbLink>
          </BreadcrumbItem>
          {sectionName && (
            <>
              <BreadcrumbSeparator className="text-slate-600" />
              <BreadcrumbItem>
                <BreadcrumbLink href="#" className="text-slate-400 hover:text-white">
                  {sectionName}
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          )}
          <BreadcrumbSeparator className="text-slate-600" />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-slate-200 font-medium">{pageName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Mobile page title fallback */}
      <span className="text-sm font-medium text-slate-200 sm:hidden">
        {pageName}
      </span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Notification bell placeholder */}
      <Button
        variant="ghost"
        size="icon"
        className="relative text-slate-400 hover:bg-slate-800 hover:text-white"
      >
        <Bell className="size-4" />
      </Button>

      {/* User menu */}
      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 pl-2 pr-3 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <Avatar className="size-7">
                <AvatarImage src={user.imageUrl || undefined} alt={user.username} />
                <AvatarFallback className="bg-emerald-600 text-[10px] font-bold text-white">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium md:inline">
                {user.username}
              </span>
              <ChevronDown className="hidden size-3.5 text-slate-500 md:inline" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-52 bg-slate-900 border-slate-700 text-slate-200"
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium text-white">{user.username}</p>
                <p className="text-xs text-slate-400">{user.email}</p>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <Shield className="size-3 text-emerald-500" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                    Super Admin
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-700/50" />
            <DropdownMenuItem
              onClick={() => navigate('dev-dashboard')}
              className="cursor-pointer text-slate-300 focus:bg-slate-800 focus:text-white"
            >
              <Shield className="mr-2 size-4" />
              Dashboard
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-700/50" />
            <DropdownMenuItem
              onClick={logout}
              className="cursor-pointer text-red-400 focus:bg-red-950/50 focus:text-red-300"
            >
              <LogOut className="mr-2 size-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  )
}