//src/components/teacher/teacher-ai-assistant.tsx
'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/index'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sparkles,
  BookOpen,
  FileText,
  Download,
  Share2,
  Trash2,
  Copy,
  Check,
  Loader2,
  Wand2,
  Trophy,
  Library,
  History,
  ChevronDown,
  Printer,
  Eye,
  Clock,
  Zap,
  Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { SyllabusGenerator } from './syllabus-generator'

// ─── Types ─────────────────────────────────────────────
interface ResourceData {
  id: string
  teacherId: string
  subject: string
  className: string
  topic: string
  resourceType: string
  term: string
  week: string
  content: string
  status: string
  pointsAwarded: number
  downloadCount: number
  createdAt: string
  teacherName: string
}

interface LeaderboardEntry {
  rank: number
  teacherId: string
  teacherName: string
  totalPoints: number
  totalActions: number
  badge: string
  badgeColor: string
}

// ─── Markdown Renderer (simple) ───────────────────────
function SimpleMarkdown({ content }: { content: string }) {
  if (!content) return null
  const lines = content.split('\n')
  return (
    <div className="prose prose-sm max-w-none">
      {lines.map((line, i) => {
        const trimmed = line.trim()
        if (!trimmed) return <br key={i} />
        if (trimmed.startsWith('### '))
          return <h3 key={i} className="text-base font-bold mt-4 mb-1">{trimmed.replace(/^###\s+/, '')}</h3>
        if (trimmed.startsWith('## '))
          return <h2 key={i} className="text-lg font-bold mt-5 mb-2 pb-1 border-b">{trimmed.replace(/^##\s+/, '')}</h2>
        if (trimmed.startsWith('# '))
          return <h1 key={i} className="text-xl font-bold mt-5 mb-2">{trimmed.replace(/^#\s+/, '')}</h1>
        if (/^\d+\.\s/.test(trimmed))
          return <p key={i} className="ml-4 my-0.5">{trimmed}</p>
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const text = trimmed.replace(/^[-*]\s+/, '')
          return <p key={i} className="ml-4 my-0.5 flex gap-2"><span className="text-muted-foreground">•</span> <span dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} /></p>
        }
        return <p key={i} className="my-0.5 leading-relaxed" dangerouslySetInnerHTML={{ __html: trimmed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
      })}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────
export function TeacherAiAssistant() {
  const { user, tenant } = useAppStore()
  const primaryColor = tenant?.primaryColor || '#821329'

  const [resourceType, setResourceType] = useState('lesson-note')
  const [subject, setSubject] = useState('')
  const [className, setClassName] = useState('')
  const [topic, setTopic] = useState('')
  const [term, setTerm] = useState('')
  const [week, setWeek] = useState('')

  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')
  const contentRef = useRef<HTMLDivElement>(null)

  const [myResources, setMyResources] = useState<ResourceData[]>([])
  const [libraryResources, setLibraryResources] = useState<ResourceData[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loadingResources, setLoadingResources] = useState(false)
  const [loadingLibrary, setLoadingLibrary] = useState(false)
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false)
  const [viewingResource, setViewingResource] = useState<ResourceData | null>(null)

  const [copied, setCopied] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [dailyLimit, setDailyLimit] = useState(20)
  const [dailyUsed, setDailyUsed] = useState(0)

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)


  const fetchMyResources = useCallback(async () => {
    setLoadingResources(true)
    try {
      const res = await fetch('/api/portal/teacher/ai/resources?action=mine', {
        headers: { 'x-tenant-id': tenant?.id || '', 'x-user-id': user?.id || '' },
      })
      const json = await res.json()
      if (json.success) setMyResources(json.data)
    } catch { /* silent */ }
    setLoadingResources(false)
  }, [tenant?.id, user?.id])

  const fetchDailyUsage = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/teacher/ai/resources?action=daily-usage`, {
        headers: { 'x-tenant-id': tenant?.id || '', 'x-user-id': user?.id || '' },
      })
      const json = await res.json()
      if (json.success) {
        setDailyLimit(json.dailyLimit)
        setDailyUsed(json.dailyUsed)
      }
    } catch { /* silent */ }
  }, [tenant?.id, user?.id])

  const fetchLibrary = async () => {
    setLoadingLibrary(true)
    try {
      const res = await fetch('/api/portal/teacher/ai/resources?action=library', {
        headers: { 'x-tenant-id': tenant?.id || '', 'x-user-id': user?.id || '' },
      })
      const json = await res.json()
      if (json.success) setLibraryResources(json.data)
    } catch { /* silent */ }
    setLoadingLibrary(false)
  }

  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true)
    try {
      const res = await fetch('/api/portal/teacher/ai/resources?action=leaderboard', {
        headers: { 'x-tenant-id': tenant?.id || '', 'x-user-id': user?.id || '' },
      })
      const json = await res.json()
      if (json.success) setLeaderboard(json.data)
    } catch { /* silent */ }
    setLoadingLeaderboard(false)
  }

  useEffect(() => {
    fetchMyResources()
    fetchDailyUsage()
  }, [fetchMyResources, fetchDailyUsage])

  const handleGenerate = async () => {
    if (!subject.trim() || !topic.trim()) {
      toast.error('Subject and Topic are required')
      return
    }
    setIsGenerating(true)
    setGeneratedContent('')
    setViewingResource(null)
    try {
      const res = await fetch('/api/portal/teacher/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant?.id || '',
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify({ resourceType, subject, className, topic, term, week }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Generation failed')
      }
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('No response stream')
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value, { stream: true })
        setGeneratedContent((prev) => prev + text)
      }
      toast.success('Content generated!')
      fetchDailyUsage()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSave = async (publish: boolean) => {
    if (!generatedContent.trim()) { toast.error('Nothing to save'); return }
    setIsSaving(true)
    try {
      const res = await fetch('/api/portal/teacher/ai/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenant?.id || '', 'x-user-id': user?.id || '' },
        body: JSON.stringify({ resourceType, subject, className, topic, term, week, content: generatedContent, action: publish ? 'publish' : 'save' }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(publish ? 'Published to School Library! +20 points' : 'Saved as draft! +5 points')
        fetchMyResources()
        fetchDailyUsage()
      } else { toast.error(json.message || 'Save failed') }
    } catch { toast.error('Network error') }
    finally { setIsSaving(false) }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent || viewingResource?.content || '')
      setCopied(true); toast.success('Copied to clipboard'); setTimeout(() => setCopied(false), 2000)
    } catch { toast.error('Failed to copy') }
  }

  const handleDownloadWord = async (resourceId: string) => {
    try {
      const resource = myResources.find((r) => r.id === resourceId) || libraryResources.find((r) => r.id === resourceId)
      if (resource) {
        await fetch('/api/portal/teacher/ai/resources', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenant?.id || '', 'x-user-id': user?.id || '' },
          body: JSON.stringify({ id: resourceId, action: 'download', originalTeacherId: resource.teacherId }),
        })
      }
      window.open(`/api/portal/teacher/ai/export?id=${resourceId}`, '_blank')
    } catch { toast.error('Download failed') }
  }

  const handlePrint = () => {
    const printContent = generatedContent || viewingResource?.content || ''
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<html><head><title>Print</title><style>body{font-family:'Segoe UI',sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.7;color:#1a1a1a}h1{font-size:20px}h2{font-size:17px;border-bottom:1px solid #ddd;padding-bottom:4px}h3{font-size:15px}@media print{body{margin:20px}}</style></head><body><div style="text-align:center;margin-bottom:30px;padding-bottom:20px;border-bottom:2px solid #333"><h1>${resourceType === 'exam-paper' ? 'EXAM PAPER' : 'LESSON NOTE'}</h1><p><strong>Subject:</strong> ${subject || viewingResource?.subject || ''}</p><p><strong>Class:</strong> ${className || viewingResource?.className || ''}</p><p><strong>Topic:</strong> <em>${topic || viewingResource?.topic || ''}</em></p></div>${printContent.split('\n').map(l => { const t = l.trim(); if (t.startsWith('## ')) return '<h2>' + t.replace(/^##\s+/, '') + '</h2>'; if (t.startsWith('### ')) return '<h3>' + t.replace(/^###\s+/, '') + '</h3>'; if (t.startsWith('# ')) return '<h1>' + t.replace(/^#\s+/, '') + '</h1>'; if (!t) return '<br>'; if (/^\d+\.\s/.test(t)) return '<p style="margin-left:20px">' + t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') + '</p>'; if (t.startsWith('- ') || t.startsWith('* ')) return '<p style="margin-left:20px">&bull; ' + t.replace(/^[-*]\s+/, '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') + '</p>'; return '<p>' + t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') + '</p>'; }).join('\n')}<script>window.onload=function(){window.print()}</script></body></html>`)
    win.document.close()
  }

  const handlePublish = async (id: string) => {
    try {
      const res = await fetch('/api/portal/teacher/ai/resources', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenant?.id || '', 'x-user-id': user?.id || '' },
        body: JSON.stringify({ id, action: 'publish' }),
      })
      const json = await res.json()
      if (json.success) { toast.success('Published! +15 points'); fetchMyResources() }
      else { toast.error(json.message || 'Failed') }
    } catch { toast.error('Network error') }
  }


  const handleDelete = async (id: string) => {
    setDeleteTarget(id)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const id = deleteTarget
    setDeleteTarget(null)
    try {
      const res = await fetch(`/api/portal/teacher/ai/resources?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': tenant?.id || '', 'x-user-id': user?.id || '' },
      })
      const json = await res.json()
      if (json.success) {
        const pts = json.pointsDeducted || 0
        toast.success(pts > 0 ? `Resource deleted. -${pts} points` : 'Resource deleted')
        fetchMyResources()
        fetchDailyUsage()
        if (viewingResource?.id === id) setViewingResource(null)
      } else {
        toast.error(json.message || 'Failed to delete')
      }
    } catch { toast.error('Failed to delete') }
  }

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return d }
  }

  // ─── View single resource ──────────────────────────
  if (viewingResource) {
    return (
      <div className="space-y-4 p-3 sm:p-6">
        <button onClick={() => setViewingResource(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronDown className="size-4 rotate-90" /> Back
        </button>
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <CardTitle className="text-lg sm:text-xl break-words">{viewingResource.topic}</CardTitle>
                <div className="mt-1 flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <span>{viewingResource.subject}</span>
                  {viewingResource.className && <span>&bull; {viewingResource.className}</span>}
                  <span>&bull; {viewingResource.resourceType === 'exam-paper' ? 'Exam Paper' : 'Lesson Note'}</span>
                </div>
                <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="size-3" />{formatDate(viewingResource.createdAt)}</span>
                  <span>by {viewingResource.teacherName}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button size="sm" variant="outline" className="gap-1" onClick={() => handleDownloadWord(viewingResource.id)}><Download className="size-3.5" /> Word</Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={handlePrint}><Printer className="size-3.5" /> PDF</Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={handleCopy}>{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? 'Copied' : 'Copy'}</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-white p-4 sm:p-6 max-h-[70vh] overflow-y-auto"><SimpleMarkdown content={viewingResource.content} /></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Main layout ───────────────────────────────────
  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Sparkles className="size-5 sm:size-6" style={{ color: primaryColor }} /> AI Assistant
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Generate lesson notes and exam papers instantly</p>
      </div>

      <Tabs defaultValue="create" className="space-y-4 sm:space-y-6">
        {/* Tabs - scrollable on mobile */}
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="inline-flex w-auto min-w-full sm:w-full sm:grid sm:grid-cols-5">
            <TabsTrigger value="create" className="gap-1 text-xs sm:text-sm whitespace-nowrap"><Wand2 className="size-3.5" /> Create</TabsTrigger>
            <TabsTrigger value="syllabus" className="gap-1 text-xs sm:text-sm whitespace-nowrap"><Upload className="size-3.5" /> Syllabus</TabsTrigger>
            <TabsTrigger value="my-resources" className="gap-1 text-xs sm:text-sm whitespace-nowrap" onClick={fetchMyResources}><History className="size-3.5" /> Resources</TabsTrigger>
            <TabsTrigger value="library" className="gap-1 text-xs sm:text-sm whitespace-nowrap" onClick={fetchLibrary}><Library className="size-3.5" /> Library</TabsTrigger>
            <TabsTrigger value="leaderboard" className="gap-1 text-xs sm:text-sm whitespace-nowrap" onClick={fetchLeaderboard}><Trophy className="size-3.5" /> Leaderboard</TabsTrigger>
          </TabsList>
        </div>

        {/* ─── Create Tab ──────────────────────────────── */}
        {/* ─── Syllabus Tab ──────────────────────────── */}
        <TabsContent value="syllabus" className="space-y-4 sm:space-y-6">
          <SyllabusGenerator dailyLimit={dailyLimit} dailyUsed={dailyUsed} />
        </TabsContent>
        <TabsContent value="create" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
            {/* Configure Card */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3"><CardTitle className="text-base">Configure</CardTitle></CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Type</Label>
                  <Select value={resourceType} onValueChange={setResourceType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lesson-note">Lesson Note</SelectItem>
                      <SelectItem value="exam-paper">Exam Paper</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Subject *</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Mathematics" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Class</Label>
                  <Input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="e.g. JSS 2, SSS 3" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Topic *</Label>
                  <Textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Photosynthesis, Quadratic Equations..." className="min-h-[70px] sm:min-h-[80px]" />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Term</Label>
                    <Select value={term} onValueChange={setTerm}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="First Term">First Term</SelectItem>
                        <SelectItem value="Second Term">Second Term</SelectItem>
                        <SelectItem value="Third Term">Third Term</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Week</Label>
                    <Input value={week} onChange={(e) => setWeek(e.target.value)} placeholder="e.g. Week 3" />
                  </div>
                </div>

                {/* Generate button + usage badge */}
                <div className="flex flex-col gap-2 pt-1">
                  <Button className="w-full gap-2 text-white" style={{ backgroundColor: primaryColor }} disabled={isGenerating || !subject.trim() || !topic.trim() || dailyUsed >= dailyLimit} onClick={handleGenerate}>
                    {isGenerating ? (<><Loader2 className="size-4 animate-spin" /> Generating...</>) : (<><Sparkles className="size-4" /> Generate with AI</>)}
                  </Button>
                  <div className="flex items-center justify-center">
                    <Badge variant={dailyUsed >= dailyLimit ? 'destructive' : 'secondary'} className="text-[11px]">
                      <Zap className="size-3 mr-1" />
                      {dailyUsed}/{dailyLimit} today
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Output Card */}
            <Card className="lg:col-span-3">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base shrink-0">{generatedContent ? 'Preview' : 'Output'}</CardTitle>
                  {generatedContent && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={handleCopy}>{copied ? <Check className="size-3" /> : <Copy className="size-3" />}{copied ? 'Copied' : 'Copy'}</Button>
                      <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={handlePrint}><Printer className="size-3" /> PDF</Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isGenerating ? (
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                ) : generatedContent ? (
                  <div ref={contentRef} className="rounded-lg border bg-white p-4 sm:p-5 max-h-[50vh] sm:max-h-[600px] overflow-y-auto text-sm">
                    <SimpleMarkdown content={generatedContent} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 sm:py-16 text-center">
                    <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-slate-100 mb-4">
                      <Sparkles className="size-7 sm:size-8 text-slate-300" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">Your generated content will appear here</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Fill in the form and click Generate</p>
                  </div>
                )}

                {/* Action buttons */}
                {generatedContent && !isGenerating && (
                  <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-2">
                    <Button variant="outline" className="w-full sm:w-auto gap-1.5" disabled={isSaving} onClick={() => handleSave(false)}>
                      {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <SaveIcon className="size-3.5" />}
                      {isSaving ? 'Saving...' : 'Save Draft (+5 pts)'}
                    </Button>
                    <Button className="w-full sm:w-auto gap-1.5 text-white" style={{ backgroundColor: primaryColor }} disabled={isSaving} onClick={() => handleSave(true)}>
                      {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Share2 className="size-3.5" />}
                      {isSaving ? 'Publishing...' : 'Publish to Library (+20 pts)'}
                    </Button>
                    <Button variant="outline" className="w-full sm:w-auto gap-1.5" onClick={handleGenerate}>
                      <Wand2 className="size-3.5" /> Regenerate
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── My Resources Tab ────────────────────────── */}
        <TabsContent value="my-resources">
          {loadingResources ? (
            <div className="grid gap-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : myResources.length === 0 ? (
            <div className="flex flex-col items-center py-12 sm:py-16">
              <FileText className="mb-3 size-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No resources yet. Generate your first one!</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {myResources.map((r) => (
                <Card key={r.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold truncate text-sm sm:text-base">{r.topic}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{r.subject} {r.className ? '&bull; ' + r.className : ''} &bull; {r.resourceType === 'exam-paper' ? 'Exam' : 'Lesson'}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="size-3" />{formatDate(r.createdAt)}</span>
                          <span className="flex items-center gap-1"><Download className="size-3" />{r.downloadCount}</span>
                          <Badge variant="secondary" className="text-[10px]">+{r.pointsAwarded} pts</Badge>
                        </div>
                      </div>
                      <Badge className={cn('shrink-0 text-[10px]', r.status === 'published' ? 'bg-emerald-100 text-emerald-700' : r.status === 'approved' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600')}>{r.status}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Button size="sm" variant="outline" className="flex-1 min-w-0 gap-1 text-xs" onClick={() => setViewingResource(r)}><Eye className="size-3" /> View</Button>
                      {r.status === 'draft' && (
                        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => handlePublish(r.id)}><Share2 className="size-3" /> Publish</Button>
                      )}
                      <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => handleDownloadWord(r.id)}><Download className="size-3" /></Button>
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(r.id)}><Trash2 className="size-3" /></Button>
                    </div>

                  </CardContent>
                </Card>
              ))}
            </div>

          )}
        </TabsContent>

        {/* ─── School Library Tab ──────────────────────── */}
        <TabsContent value="library">
          {loadingLibrary ? (
            <div className="grid gap-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : libraryResources.length === 0 ? (
            <div className="flex flex-col items-center py-12 sm:py-16">
              <Library className="mb-3 size-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No shared resources yet. Be the first to publish!</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {libraryResources.map((r) => (
                <Card key={r.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: primaryColor + '15' }}>
                        {r.resourceType === 'exam-paper' ? <FileText className="size-5" style={{ color: primaryColor }} /> : <BookOpen className="size-5" style={{ color: primaryColor }} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold truncate text-sm sm:text-base">{r.topic}</h3>
                        <p className="text-xs text-muted-foreground">{r.subject} {r.className ? '&bull; ' + r.className : ''}</p>
                        <p className="text-[11px] text-muted-foreground/70 mt-0.5">by {r.teacherName} &bull; {formatDate(r.createdAt)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-1.5">
                      <Button size="sm" variant="outline" className="flex-1 min-w-0 gap-1 text-xs" onClick={() => setViewingResource(r)}><Eye className="size-3" /> View</Button>
                      <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => handleDownloadWord(r.id)}><Download className="size-3" /> Download</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── Leaderboard Tab ─────────────────────────── */}
        <TabsContent value="leaderboard">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="size-5 text-amber-500" /> Top Educators This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingLeaderboard ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="mx-auto mb-2 size-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No activity this month yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((entry) => (
                    <div key={entry.teacherId} className={cn(
                      'flex items-center gap-2 sm:gap-3 rounded-xl p-2.5 sm:p-3 transition-colors',
                      entry.rank === 1 ? 'bg-amber-50 border border-amber-200' :
                        entry.rank === 2 ? 'bg-slate-50 border border-slate-200' :
                          entry.rank === 3 ? 'bg-orange-50 border border-orange-100' :
                            'hover:bg-slate-50'
                    )}>
                      <div className={cn(
                        'flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full text-xs sm:text-sm font-bold',
                        entry.rank === 1 ? 'bg-amber-400 text-white' :
                          entry.rank === 2 ? 'bg-slate-400 text-white' :
                            entry.rank === 3 ? 'bg-orange-400 text-white' :
                              'bg-slate-100 text-slate-500'
                      )}>{entry.rank}</div>
                      <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full text-[10px] sm:text-[11px] font-bold text-white" style={{ backgroundColor: primaryColor }}>
                        {entry.teacherName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{entry.teacherName}</p>
                        <p className="text-xs text-muted-foreground">{entry.totalActions} contributions</p>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <Badge className={cn('text-[10px] hidden sm:inline-flex', entry.badgeColor)}>{entry.badge}</Badge>
                        <span className="text-xs sm:text-sm font-bold tabular-nums">{entry.totalPoints} pts</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="size-5 text-red-600" />
              </div>
              <div>
                <p className="font-semibold">Delete Resource?</p>
                <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDelete}>
                <Loader2 className="size-4 animate-spin" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Save Icon (lucide fallback) ──────────────────────
function SaveIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
      <path d="M7 3v4a1 1 0 0 0 1 1h7" />
    </svg>
  )
}