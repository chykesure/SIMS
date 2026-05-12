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
import { Menu, LogOut, User, ChevronDown } from 'lucide-react'

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
}

function getSectionForPage(page: string): string | null {
  const sectionMap: Record<string, string> = {
    'student-add': 'People',
    students: 'People',
    teachers: 'People',
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
    'class-position': 'Positioning',
    'subject-position': 'Positioning',
    users: 'Admin',
    finance: 'Finance',
    vouchers: 'Finance',
    inventory: 'Finance',
    budgets: 'Finance',
    subscription: 'Billing',
  }
  return sectionMap[page] ?? null
}

export function Header() {
  const { currentPage, toggleSidebar, sidebarOpen, user, tenant, navigate, logout } =
    useAppStore()

  const pageName = pageNameMap[currentPage] ?? 'Dashboard'
  const sectionName = getSectionForPage(currentPage)

  const userInitial = user?.username?.charAt(0).toUpperCase() ?? 'U'

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white px-4 md:px-6">
      {/* Hamburger menu */}
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0"
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
                <BreadcrumbLink href="#">{sectionName}</BreadcrumbLink>
              </BreadcrumbItem>
            </>
          )}
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{pageName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Mobile page title fallback */}
      <span className="text-sm font-medium text-foreground sm:hidden">
        {pageName}
      </span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User menu */}
      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 pl-2 pr-3"
            >
              <Avatar className="size-7">
                <AvatarImage src={user.imageUrl} alt={user.username} />
                <AvatarFallback className="bg-slate-900 text-xs text-white">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium md:inline">
                {user.username}
              </span>
              <ChevronDown className="hidden size-4 text-muted-foreground md:inline" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
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
    </header>
  )
}
