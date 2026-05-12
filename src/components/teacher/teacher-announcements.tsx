'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/index'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Megaphone,
  Plus,
  Pin,
  AlertCircle,
  Calendar,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ClassroomData {
  id: string
  name: string
}

interface AnnouncementData {
  id: string
  classroomId: string
  title: string
  content: string
  createdBy: string
  createdByName: string
  pinned: boolean
  createdAt: string
  classroom: { id: string; name: string }
}

export function TeacherAnnouncements() {
  const { user, tenant } = useAppStore()
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([])
  const [classrooms, setClassrooms] = useState<ClassroomData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createClassroomId, setCreateClassroomId] = useState('')
  const [createTitle, setCreateTitle] = useState('')
  const [createContent, setCreateContent] = useState('')
  const [createPinned, setCreatePinned] = useState(false)
  const [creating, setCreating] = useState(false)

  const primaryColor = tenant?.primaryColor || '#821329'

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/portal/teacher/announcements', {
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
    // Fetch classrooms for the create dialog
    fetch('/api/classrooms')
      .then((r) => r.json())
      .then((json) => {
        const data = json.success ? json.data : []
        setClassrooms(data)
      })
      .catch(() => {})
  }, [fetchAnnouncements])

  const handleCreate = async () => {
    if (!createClassroomId || !createTitle.trim()) {
      toast.error('Please select a classroom and enter a title')
      return
    }
    try {
      setCreating(true)
      const res = await fetch('/api/portal/teacher/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify({
          classroomId: createClassroomId,
          title: createTitle.trim(),
          content: createContent,
          pinned: createPinned,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Announcement created successfully')
        setCreateOpen(false)
        resetCreateForm()
        fetchAnnouncements()
      } else {
        toast.error(json.message || 'Failed to create announcement')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const resetCreateForm = () => {
    setCreateClassroomId('')
    setCreateTitle('')
    setCreateContent('')
    setCreatePinned(false)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <AlertCircle className="size-12 text-red-400" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={fetchAnnouncements}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Announcements</h1>
          <p className="text-sm text-muted-foreground">
            {announcements.length} announcement{announcements.length !== 1 ? 's' : ''} posted
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button
              className="gap-2 text-white"
              style={{ backgroundColor: primaryColor }}
            >
              <Plus className="size-4" />
              New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Announcement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Classroom *</Label>
                <Select value={createClassroomId} onValueChange={setCreateClassroomId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select classroom" />
                  </SelectTrigger>
                  <SelectContent>
                    {classrooms.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="Announcement title"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Content</Label>
                <Textarea
                  value={createContent}
                  onChange={(e) => setCreateContent(e.target.value)}
                  placeholder="Write your announcement here..."
                  className="min-h-[120px]"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCreatePinned(!createPinned)}
                  className={cn(
                    'flex h-5 w-9 items-center rounded-full transition-colors',
                    createPinned ? 'justify-end' : 'justify-start'
                  )}
                  style={{
                    backgroundColor: createPinned ? primaryColor : '#d1d5db',
                  }}
                >
                  <span className="mx-0.5 h-4 w-4 rounded-full bg-white shadow-sm" />
                </button>
                <Label className="text-sm">
                  Pin to top
                </Label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={creating}
                  className="gap-2 text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  {creating && <Loader2 className="size-4 animate-spin" />}
                  {creating ? 'Creating...' : 'Post Announcement'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Announcements list */}
      {announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <Megaphone className="mb-3 size-12 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">
            No announcements posted yet
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Click &ldquo;New Announcement&rdquo; to share an update with your class
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card
              key={announcement.id}
              className={cn(
                'overflow-hidden transition-all',
                announcement.pinned && 'border-l-4'
              )}
              style={
                announcement.pinned
                  ? { borderLeftColor: primaryColor }
                  : undefined
              }
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Megaphone className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{announcement.title}</h3>
                      {announcement.pinned && (
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 gap-1">
                          <Pin className="size-3" />
                          Pinned
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                      {announcement.content || 'No content'}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {formatDate(announcement.createdAt)}
                      </span>
                      <span>&middot;</span>
                      <span>{announcement.classroom?.name}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
