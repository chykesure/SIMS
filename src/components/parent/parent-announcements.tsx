'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/index'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Megaphone,
  Pin,
  AlertCircle,
  Clock,
  User,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AnnouncementData {
  id: string
  title: string
  content: string
  pinned: boolean
  createdBy: string
  createdByName: string
  classroom: {
    id: string
    name: string
    section: string
    subject: string
  } | null
  createdAt: string
  updatedAt: string
}

export function ParentAnnouncements() {
  const { tenant } = useAppStore()
  const primaryColor = tenant?.primaryColor || '#821329'

  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const res = await fetch('/api/portal/parent/announcements')
      if (!res.ok) throw new Error('Failed to load announcements')
      const json = await res.json()
      if (json.success) {
        setAnnouncements(json.data.announcements || [])
      } else {
        throw new Error(json.message || 'Failed to load')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnnouncements()
  }, [fetchAnnouncements])

  function formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  function formatRelativeTime(dateStr: string): string {
    try {
      const now = new Date()
      const date = new Date(dateStr)
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays < 7) return `${diffDays}d ago`
      return formatDate(dateStr)
    } catch {
      return dateStr
    }
  }

  const pinnedAnnouncements = announcements.filter((a) => a.pinned)
  const regularAnnouncements = announcements.filter((a) => !a.pinned)

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Announcements</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Stay updated with the latest school news
          </p>
        </div>
        {announcements.length > 0 && (
          <Badge variant="outline" className="text-xs">
            {announcements.length} announcement{announcements.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="size-12 text-red-400 mb-4" />
          <p className="text-lg font-medium text-foreground">{error}</p>
        </div>
      )}

      {/* Content */}
      {!loading && !error && announcements.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <Megaphone className="size-12 text-slate-300 mb-4" />
          <p className="text-lg font-medium text-foreground">No Announcements</p>
          <p className="text-sm text-muted-foreground mt-1">
            There are no announcements at this time
          </p>
        </div>
      )}

      {/* Pinned announcements */}
      {!loading && !error && pinnedAnnouncements.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Pin className="size-3" />
            Pinned
          </h2>
          {pinnedAnnouncements.map((announcement) => (
            <Card
              key={announcement.id}
              className="border-l-4"
              style={{ borderLeftColor: primaryColor }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-sm font-semibold text-foreground">
                        {announcement.title}
                      </h3>
                      <Badge
                        className="text-[10px] px-1.5 py-0"
                        style={{ backgroundColor: primaryColor, color: '#fff' }}
                      >
                        Pinned
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                      {announcement.content}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-[11px] text-muted-foreground flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <User className="size-3" />
                        {announcement.createdByName || 'School Admin'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatRelativeTime(announcement.createdAt)}
                      </span>
                      {announcement.classroom && (
                        <span className="inline-flex items-center gap-1">
                          <BookOpen className="size-3" />
                          {announcement.classroom.name}
                          {announcement.classroom.section ? ` (${announcement.classroom.section})` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <Pin className="size-4 shrink-0 mt-0.5" style={{ color: primaryColor }} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Regular announcements */}
      {!loading && !error && regularAnnouncements.length > 0 && (
        <div className="space-y-3">
          {pinnedAnnouncements.length > 0 && (
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Recent
            </h2>
          )}
          <div className="grid gap-3">
            {regularAnnouncements.map((announcement) => (
              <Card key={announcement.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground mb-1">
                        {announcement.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                        {announcement.content}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-[11px] text-muted-foreground flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <User className="size-3" />
                          {announcement.createdByName || 'School Admin'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3" />
                          {formatRelativeTime(announcement.createdAt)}
                        </span>
                        {announcement.classroom && (
                          <span className="inline-flex items-center gap-1">
                            <BookOpen className="size-3" />
                            {announcement.classroom.name}
                            {announcement.classroom.section ? ` (${announcement.classroom.section})` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
