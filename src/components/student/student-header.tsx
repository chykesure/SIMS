'use client'

import React, { useState } from 'react'
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Menu, LogOut, User, ChevronDown, Bell, KeyRound, GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import { ChangePasswordDialog } from '@/components/ui/change-password-dialog'

const pageNameMap: Record<string, string> = {
  'student-dashboard': 'Dashboard',
  'student-results': 'My Results',
  'student-fees': 'My Fees',
  'student-assignments': 'My Assignments',
  'student-announcements': 'Announcements',
  dashboard: 'Dashboard',
}

export function StudentHeader() {
  const { currentPage, sidebarOpen, user, tenant, navigate, logout, setSidebarOpen } =
    useAppStore()

  const isMobile = useIsMobile()
  const [passwordOpen, setPasswordOpen] = useState(false)

  const pageName = pageNameMap[currentPage] ?? 'Dashboard'
  const userInitial = user?.username?.charAt(0).toUpperCase() ?? 'S'
  const primaryColor = tenant?.primaryColor || '#821329'

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 md:h-16 md:px-6">
      {/* ── Hamburger menu (only on desktop, since mobile has floating hamburger) ── */}
      {!isMobile && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-9 w-9 md:h-10 md:w-10"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              <Menu className="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle sidebar</TooltipContent>
        </Tooltip>
      )}

      {/* ── Left spacer on mobile (for floating hamburger) ── */}
      {isMobile && <div className="w-10 shrink-0" />}

      {/* ── Breadcrumb (hidden on small mobile, shown sm+) ── */}
      <Breadcrumb className="hidden sm:flex flex-1 min-w-0">
        <BreadcrumbList className="flex-nowrap">
          <BreadcrumbItem>
            <BreadcrumbLink
              href="#"
              onClick={(e) => {
                e.preventDefault()
                navigate('student-dashboard')
              }}
            >
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-medium">{pageName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* ── Mobile page title fallback ── */}
      <h1 className="flex-1 text-sm font-semibold text-foreground truncate sm:hidden">
        {pageName}
      </h1>

      {/* ── Spacer (desktop) ── */}
      <div className="hidden sm:block flex-1" />

      {/* ── Right side actions ── */}
      <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
        {/* Student badge */}
        {!isMobile && (
          <div
            className="hidden md:flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
            style={{
              backgroundColor: `${primaryColor}12`,
              color: primaryColor,
            }}
          >
            <GraduationCap className="size-3.5" />
            Student
          </div>
        )}

        {/* User menu */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-slate-100 transition-colors">
                <Avatar className="size-7 md:size-8 border border-slate-200">
                  <AvatarImage src={user.imageUrl} alt={user.username} />
                  <AvatarFallback
                    className="text-xs font-semibold text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium text-foreground leading-tight">
                    {user.username}
                  </span>
                  <span className="text-[11px] text-muted-foreground leading-tight">
                    Student
                  </span>
                </div>
                <ChevronDown className="hidden md:block size-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 md:w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user.username}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setPasswordOpen(true)}
                className="cursor-pointer"
              >
                <KeyRound className="mr-2 size-4" />
                Change Password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                variant="destructive"
                className="cursor-pointer"
              >
                <LogOut className="mr-2 size-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Change Password Dialog */}
      {user && (
        <ChangePasswordDialog
          open={passwordOpen}
          onOpenChange={setPasswordOpen}
          userId={user.id}
          userName={user.username}
        />
      )}
    </header>
  )
}