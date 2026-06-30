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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Menu, LogOut, User, ChevronDown, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'

const pageNameMap: Record<string, string> = {
  dashboard: 'Dashboard',
  'student-add': 'Add Student',
  students: 'Student List',
  teachers: 'Teachers',
  subjects: 'Subjects',
  classes: 'Classes',
  sessions: 'Sessions',
  exams: 'Exams',
  results: 'Results',
  grading: 'Grading',
  'card-settings': 'Report Card Settings',
  broadsheet: 'Broadsheet',
  'assessment-settings': 'Assessment Settings',
  remarks: 'Remarks',
  signatures: 'Signatures',
  'class-position': 'Class Position',
  'subject-position': 'Subject Position',
  users: 'Users',
  profile: 'Profile',
  login: 'Login',
  signup: 'Sign Up',
  finance: 'Finance Manager',
  vouchers: 'Vouchers',
  inventory: 'Inventory',
  budgets: 'Budgets',
  subscription: 'Subscription & Plan',
  classroom: 'Classroom',
  'school-profile': 'School Profile',
  'score-import': 'Score Import',
  parents: 'Parents',
  'admission-list': 'Admissions',
}

function getSectionForPage(page: string): string | null {
  const sectionMap: Record<string, string> = {
    'student-add': 'People',
    students: 'People',
    teachers: 'People',
    parents: 'People',
    subjects: 'Academics',
    classes: 'Academics',
    sessions: 'Academics',
    exams: 'Academics',
    results: 'Academics',
    grading: 'Academics',
    'card-settings': 'Records',
    broadsheet: 'Records',
    'assessment-settings': 'Settings',
    remarks: 'Settings',
    signatures: 'Settings',
    'school-profile': 'Settings',
    'score-import': 'Settings',
    'class-position': 'Positioning',
    'subject-position': 'Positioning',
    users: 'Admin',
    finance: 'Finance',
    vouchers: 'Finance',
    inventory: 'Finance',
    budgets: 'Finance',
    subscription: 'Billing',
    classroom: 'Classroom',
    'admission-list': 'Admissions',
  }
  return sectionMap[page] ?? null
}

export function Header() {
  const { currentPage, toggleSidebar, sidebarOpen, user, tenant, navigate, logout } =
    useAppStore()

  const isMobile = useIsMobile()

  const pageName = pageNameMap[currentPage] ?? 'Dashboard'
  const sectionName = getSectionForPage(currentPage)
  const userInitial = user?.username?.charAt(0).toUpperCase() ?? 'U'
  const primaryColor = tenant?.primaryColor || '#821329'

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 md:h-16 md:px-6">
      {/* ── Hamburger menu ── */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-9 w-9 md:h-10 md:w-10"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <Menu className="size-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Toggle sidebar</TooltipContent>
      </Tooltip>

      {/* ── Breadcrumb (hidden on small mobile, shown sm+) ── */}
      <Breadcrumb className="hidden sm:flex flex-1 min-w-0">
        <BreadcrumbList className="flex-nowrap">
          <BreadcrumbItem>
            <BreadcrumbLink
              href="#"
              onClick={(e) => {
                e.preventDefault()
                navigate('dashboard')
              }}
            >
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
          {sectionName && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <span className="text-muted-foreground">{sectionName}</span>
              </BreadcrumbItem>
            </>
          )}
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
        {/* Notification bell */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-slate-100 hover:text-foreground transition-colors md:h-10 md:w-10">
              <Bell className="size-[18px] md:size-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Notifications</TooltipContent>
        </Tooltip>

        {/* Plan badge (hidden on very small screens) */}
        {!isMobile && tenant?.plan && (
          <div
            className="hidden md:flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
            style={{
              backgroundColor: `${primaryColor}12`,
              color: primaryColor,
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: primaryColor }} />
            {tenant.plan}
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
                    {user.role}
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
                onClick={() => navigate('profile')}
                className="cursor-pointer"
              >
                <User className="mr-2 size-4" />
                Profile
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
    </header>
  )
}
