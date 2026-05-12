'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Settings,
  User,
  Shield,
  Globe,
  Bell,
  Database,
  Mail,
  Palette,
  Save,
  Loader2,
  CheckCircle2,
  Server,
  Key,
  Clock,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/index'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

export function DevSettings() {
  const { user } = useAppStore()

  // Platform settings state
  const [platformName, setPlatformName] = useState('SchoolDesk')
  const [supportEmail, setSupportEmail] = useState('support@schooldesk.ng')
  const [platformUrl, setPlatformUrl] = useState('https://schooldesk.ng')
  const [saving, setSaving] = useState(false)

  // Profile state
  const [profileName, setProfileName] = useState(user?.username || 'SuperAdmin')
  const [profileEmail, setProfileEmail] = useState(user?.email || 'admin@schooldesk.ng')

  // Exchange rate state
  const [exchangeRate, setExchangeRate] = useState('1500')
  const [savingRate, setSavingRate] = useState(false)

  // Maintenance mode
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [savingMaintenance, setSavingMaintenance] = useState(false)

  // Simulated system info
  const systemInfo = [
    { label: 'Application', value: 'SchoolDesk v2.0.0' },
    { label: 'Framework', value: 'Next.js 16' },
    { label: 'Database', value: 'SQLite (Prisma ORM)' },
    { label: 'Runtime', value: 'Bun' },
    { label: 'Environment', value: 'Production' },
    { label: 'Last Deployed', value: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) },
  ]

  const handleSavePlatform = async () => {
    setSaving(true)
    await new Promise((r) => setTimeout(r, 800))
    setSaving(false)
    toast.success('Platform settings saved successfully')
  }

  const handleSaveRate = async () => {
    setSavingRate(true)
    await new Promise((r) => setTimeout(r, 600))
    setSavingRate(false)
    toast.success(`Exchange rate updated to ₦${Number(exchangeRate).toLocaleString()}/$1`)
  }

  const handleToggleMaintenance = async () => {
    setSavingMaintenance(true)
    await new Promise((r) => setTimeout(r, 600))
    setMaintenanceMode(!maintenanceMode)
    setSavingMaintenance(false)
    toast.success(maintenanceMode ? 'Maintenance mode disabled' : 'Maintenance mode enabled')
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={item}>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Settings className="size-6 text-slate-400" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Platform Settings
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            Manage platform configuration, admin profile, and system preferences
          </p>
        </div>
      </motion.div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Admin Profile Card */}
        <motion.div variants={item}>
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 ring-1 ring-emerald-100">
                  <User className="size-4 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Admin Profile</CardTitle>
                  <CardDescription className="text-xs">Your super admin account details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white">
                  <span className="text-lg font-bold">{profileName.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{profileName}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Shield className="size-3 text-emerald-500" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
                      Super Admin
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Display Name</Label>
                  <Input
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Email Address</Label>
                  <Input
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="h-9 text-sm"
                    type="email"
                  />
                </div>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                  onClick={() => toast.success('Profile updated successfully')}
                >
                  <Save className="size-3.5" />
                  Save Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Platform Configuration Card */}
        <motion.div variants={item}>
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 ring-1 ring-sky-100">
                  <Globe className="size-4 text-sky-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Platform Configuration</CardTitle>
                  <CardDescription className="text-xs">General platform settings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Palette className="size-3.5 text-slate-400" />
                    Platform Name
                  </Label>
                  <Input
                    value={platformName}
                    onChange={(e) => setPlatformName(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Mail className="size-3.5 text-slate-400" />
                    Support Email
                  </Label>
                  <Input
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    className="h-9 text-sm"
                    type="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <ExternalLink className="size-3.5 text-slate-400" />
                    Platform URL
                  </Label>
                  <Input
                    value={platformUrl}
                    onChange={(e) => setPlatformUrl(e.target.value)}
                    className="h-9 text-sm"
                    type="url"
                  />
                </div>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                  onClick={handleSavePlatform}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Exchange Rate Card */}
        <motion.div variants={item}>
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 ring-1 ring-amber-100">
                  <Key className="size-4 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Currency Exchange Rate</CardTitle>
                  <CardDescription className="text-xs">
                    USD to NGN conversion rate used across the platform
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="size-3.5 text-amber-500" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">
                    Live Conversion
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-amber-700">1 USD</span>
                  <span className="text-slate-400">=</span>
                  <span className="text-3xl font-bold text-slate-900">
                    ₦{Number(exchangeRate).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Exchange Rate (₦ per $1)</Label>
                <Input
                  type="number"
                  min="1"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  className="h-9 text-sm"
                />
                <p className="text-[10px] text-slate-400">
                  This rate is used to auto-convert USD prices to NGN in subscription plans
                </p>
              </div>

              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 gap-1.5"
                onClick={handleSaveRate}
                disabled={savingRate}
              >
                {savingRate ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5" />
                )}
                Update Rate
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Maintenance & Notifications Card */}
        <motion.div variants={item}>
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 ring-1 ring-rose-100">
                  <Bell className="size-4 text-rose-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Maintenance & Alerts</CardTitle>
                  <CardDescription className="text-xs">Platform health and notifications</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    maintenanceMode ? 'bg-rose-100' : 'bg-emerald-100'
                  )}>
                    <Server className={cn(
                      'size-5',
                      maintenanceMode ? 'text-rose-600' : 'text-emerald-600'
                    )} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Maintenance Mode</p>
                    <p className="text-xs text-slate-500">
                      {maintenanceMode
                        ? 'Platform is offline for all schools'
                        : 'Platform is running normally'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleMaintenance}
                  disabled={savingMaintenance}
                  className={cn(
                    'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
                    maintenanceMode ? 'bg-rose-500' : 'bg-emerald-500'
                  )}
                >
                  {savingMaintenance ? (
                    <Loader2 className="absolute inset-0 m-auto size-4 animate-spin text-white" />
                  ) : (
                    <span
                      className={cn(
                        'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform',
                        maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  )}
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  System Status
                </p>
                {[
                  { name: 'API Server', status: 'operational' },
                  { name: 'Database', status: 'operational' },
                  { name: 'Payment Gateway', status: 'operational' },
                  { name: 'Email Service', status: 'operational' },
                ].map((service) => (
                  <div key={service.name} className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">{service.name}</span>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5 text-emerald-500" />
                      <span className="text-[10px] font-medium text-emerald-600 capitalize">
                        {service.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* System Information Card - Full Width */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 ring-1 ring-violet-100">
                <Database className="size-4 text-violet-600" />
              </div>
              <div>
                <CardTitle className="text-base">System Information</CardTitle>
                <CardDescription className="text-xs">Platform runtime details and version info</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {systemInfo.map((info) => (
                <div
                  key={info.label}
                  className="flex items-center justify-between rounded-lg border bg-white p-3"
                >
                  <span className="text-xs text-slate-500">{info.label}</span>
                  <Badge variant="outline" className="text-[11px] font-medium bg-slate-50 text-slate-700 border-slate-200">
                    {info.value}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}