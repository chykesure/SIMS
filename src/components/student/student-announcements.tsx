'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/index'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Megaphone,
  AlertCircle,
  Pin,
  BookOpen,
  Calendar,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Announcement {
  id: string
  title: string
  content: string
  pinned: boolean
  createdByName: string
  createdAt: string
  classroomName: string
  classroomSubject: string
  classroomSection: string
}

export function StudentAnnouncements() {
  const { tenant, user } = useAppStore()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const primaryColor = tenant?.primaryColor || '#821329'

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/portal/student/announcements', {
        headers: { 'x-user-id': user?.id || '' },
      })
      const json = await res.json()
      if (json.success) {
        setAnnouncements(json.data)
      } else {
        setError(json.message || 'Failed to load announcements')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchAnnouncements()
  }, [fetchAnnouncements])

  const pinnedAnnouncements = announcements.filter(a => a.pinned)
  const regularAnnouncements = announcements.filter(a => !a.pinned)

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDateShort = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={fetchAnnouncements} variant="outline" size="sm">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Announcements</h1>
          <p className="text-sm text-muted-foreground">
            Stay updated with the latest news and notices
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {announcements.length} total
        </Badge>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4 md:p-5">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : announcements.length > 0 ? (
        <div className="space-y-6">
          {/* Pinned Announcements */}
          {pinnedAnnouncements.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Pin className="h-4 w-4 text-amber-600" />
                <h2 className="text-sm font-semibold text-amber-600 uppercase tracking-wider">
                  Pinned
                </h2>
                <Badge variant="secondary" className="text-[10px]">
                  {pinnedAnnouncements.length}
                </Badge>
              </div>
              <div className="space-y-4">
                {pinnedAnnouncements.map(ann => (
                  <AnnouncementCard
                    key={ann.id}
                    announcement={ann}
                    primaryColor={primaryColor}
                    expanded={expandedId === ann.id}
                    onToggle={() => toggleExpand(ann.id)}
                    formatDate={formatDate}
                    formatDateShort={formatDateShort}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Regular Announcements */}
          {regularAnnouncements.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Recent
              </h2>
              <div className="space-y-4">
                {regularAnnouncements.map(ann => (
                  <AnnouncementCard
                    key={ann.id}
                    announcement={ann}
                    primaryColor={primaryColor}
                    expanded={expandedId === ann.id}
                    onToggle={() => toggleExpand(ann.id)}
                    formatDate={formatDate}
                    formatDateShort={formatDateShort}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Megaphone className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <p className="mt-4 text-sm font-medium text-muted-foreground">No announcements yet</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm">
              Announcements from your teachers and school administration will appear here
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function AnnouncementCard({
  announcement,
  primaryColor,
  expanded,
  onToggle,
  formatDate,
  formatDateShort,
}: {
  announcement: Announcement
  primaryColor: string
  expanded: boolean
  onToggle: () => void
  formatDate: (dateStr: string) => string
  formatDateShort: (dateStr: string) => string
}) {
  const isLongContent = announcement.content && announcement.content.length > 200

  return (
    <Card className={cn('transition-all', announcement.pinned && 'border-amber-200')}>
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
            style={{ backgroundColor: primaryColor }}
          >
            {announcement.pinned ? (
              <Pin className="h-4 w-4" />
            ) : (
              <Megaphone className="h-4 w-4" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3
                className="text-sm font-semibold cursor-pointer hover:underline"
                onClick={isLongContent ? onToggle : undefined}
              >
                {announcement.title}
              </h3>
              {announcement.pinned && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-[10px] hover:bg-amber-100">
                  Pinned
                </Badge>
              )}
            </div>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {announcement.createdByName}
              </span>
              {announcement.classroomSubject && (
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  {announcement.classroomSubject}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDateShort(announcement.createdAt)}
              </span>
            </div>

            {/* Content body */}
            {announcement.content && (
              <div className="mt-2">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {expanded || !isLongContent
                    ? announcement.content
                    : announcement.content.slice(0, 200) + '...'}
                </p>
                {isLongContent && (
                  <button
                    onClick={onToggle}
                    className="mt-1 text-xs font-medium hover:underline"
                    style={{ color: primaryColor }}
                  >
                    {expanded ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            )}

            {/* Full date on expand */}
            {expanded && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Posted on {formatDate(announcement.createdAt)}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
