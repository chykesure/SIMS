'use client'

import React, { useState, useRef, useCallback } from 'react'
import { useAppStore } from '@/store/index'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Upload, Sparkles, FileText, ChevronDown, ChevronRight, Loader2, Save, Trash2, Download, Printer, Copy, Check, Zap, BookOpen, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface WeekData {
  week: number
  content: string
  expanded: boolean
  saved: boolean
  resourceId?: string
}

export function SyllabusGenerator({ dailyLimit, dailyUsed }: { dailyLimit: number; dailyUsed: number }) {
  const { user, tenant } = useAppStore()
  const primaryColor = tenant?.primaryColor || '#821329'
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Upload state
  const [syllabusText, setSyllabusText] = useState('')
  const [fileName, setFileName] = useState('')
  const [subject, setSubject] = useState('')
  const [className, setClassName] = useState('')
  const [term, setTerm] = useState('')
  const [session, setSession] = useState('')
  const [duration, setDuration] = useState('40 minutes')
  const [uploading, setUploading] = useState(false)

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')
  const [weeks, setWeeks] = useState<WeekData[]>([])
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1]))

  // Edit state
  const [editedWeeks, setEditedWeeks] = useState<Record<number, string>>({})
  const [savingWeek, setSavingWeek] = useState<number | null>(null)

  // Parse weeks from generated markdown
  const parseWeeks = (text: string): WeekData[] => {
    const parts = text.split(/(?=### Week \d+)/i)
    const result: WeekData[] = []
    for (const part of parts) {
      const match = part.match(/###\s*Week\s*(\d+)/i)
      if (match) {
        const weekNum = parseInt(match[1])
        if (weekNum >= 1 && weekNum <= 10) {
          result.push({ week: weekNum, content: part.trim(), expanded: false, saved: false })
        }
      }
    }
    return result
  }

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/portal/teacher/ai/syllabus', {
        method: 'POST',
        headers: { 'x-tenant-id': tenant?.id || '', 'x-user-id': user?.id || '' },
        body: formData,
      })
      const json = await res.json()
      if (json.success) {
        setSyllabusText(json.text)
        setFileName(json.fileName)
        toast.success(`Extracted text from ${json.fileName}`)
      } else {
        toast.error(json.error || 'Failed to read file')
      }
    } catch {
      toast.error('Upload failed')
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Handle generate
  const handleGenerate = async () => {
    if (!syllabusText.trim() || !subject.trim()) {
      toast.error('Syllabus text and Subject are required')
      return
    }
    if (dailyUsed >= dailyLimit) {
      toast.error('Daily AI limit reached')
      return
    }

    setIsGenerating(true)
    setGeneratedContent('')
    setWeeks([])
    setEditedWeeks({})
    setExpandedWeeks(new Set([1]))

    try {
      const res = await fetch('/api/portal/teacher/ai/syllabus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenant?.id || '', 'x-user-id': user?.id || '' },
        body: JSON.stringify({ syllabusText, subject, className, term, session, duration }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Generation failed')
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('No response stream')

      let fullText = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        fullText += chunk
        setGeneratedContent(fullText)
      }

      // Parse into weeks
      const parsed = parseWeeks(fullText)
      if (parsed.length > 0) {
        setWeeks(parsed)
        toast.success(`${parsed.length} weeks generated!`)
      } else {
        toast.success('Content generated! Could not auto-split into weeks.')
        setGeneratedContent(fullText)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setIsGenerating(false)
    }
  }

  // Toggle week expand/collapse
  const toggleWeek = (weekNum: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev)
      if (next.has(weekNum)) next.delete(weekNum)
      else next.add(weekNum)
      return next
    })
  }

  // Edit week content
  const updateWeekContent = (weekNum: number, content: string) => {
    setEditedWeeks((prev) => ({ ...prev, [weekNum]: content }))
  }

  // Save individual week
  const handleSaveWeek = async (week: WeekData) => {
    const content = editedWeeks[week.week] || week.content
    // Extract topic from content
    const topicMatch = content.match(/\*\*Topic:\*\*\s*(.+)/i)
    const topic = topicMatch ? topicMatch[1].trim().replace(/\*\*/g, '') : `Week ${week.week} - ${subject}`

    setSavingWeek(week.week)
    try {
      const res = await fetch('/api/portal/teacher/ai/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenant?.id || '', 'x-user-id': user?.id || '' },
        body: JSON.stringify({
          resourceType: 'lesson-note',
          subject,
          className,
          topic,
          term,
          week: `Week ${week.week}`,
          content,
          action: 'save',
        }),
      })
      const json = await res.json()
      if (json.success) {
        setWeeks((prev) => prev.map((w) => w.week === week.week ? { ...w, saved: true, resourceId: json.data?.id } : w))
        toast.success(`Week ${week.week} saved! +5 points`)
      } else {
        toast.error(json.message || 'Save failed')
      }
    } catch {
      toast.error('Network error')
    }
    setSavingWeek(null)
  }

  // Copy all content
  const handleCopyAll = async () => {
    const text = weeks.length > 0
      ? weeks.sort((a, b) => a.week - b.week).map((w) => editedWeeks[w.week] || w.content).join('\n\n---\n\n')
      : generatedContent
    try {
      await navigator.clipboard.writeText(text)
      toast.success('All content copied!')
    } catch {
      toast.error('Copy failed')
    }
  }

  // Print all
  const handlePrintAll = () => {
    const text = weeks.length > 0
      ? weeks.sort((a, b) => a.week - b.week).map((w) => editedWeeks[w.week] || w.content).join('\n\n---\n\n')
      : generatedContent
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<html><head><title>${subject} - Lesson Notes</title><style>body{font-family:'Segoe UI',sans-serif;max-width:900px;margin:40px auto;padding:0 20px;line-height:1.7;color:#1a1a1a}h2{font-size:18px;border-bottom:2px solid #333;padding-bottom:4px;margin-top:30px}h3{font-size:15px}p{margin:6px 0}@media print{body{margin:20px}}</style></head><body>${text.replace(/###/g, '<h2>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/- /g, '&bull; ')}<script>window.onload=function(){window.print()}</script></body></html>`)
    win.document.close()
  }

  // Upload form (shown when no content generated yet)
  if (!generatedContent && !isGenerating) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="size-5" style={{ color: primaryColor }} />
              Upload Syllabus / Scheme of Work
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File upload area */}
            <div
              className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept=".docx,.txt,.md" className="hidden" onChange={handleFileUpload} />
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Extracting text...</p>
                </div>
              ) : fileName ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="size-8 text-emerald-600" />
                  <p className="text-sm font-medium">{fileName}</p>
                  <p className="text-xs text-muted-foreground">Click to replace</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="size-8 text-muted-foreground/40" />
                  <p className="text-sm font-medium">Click to upload your syllabus</p>
                  <p className="text-xs text-muted-foreground">.docx, .txt, or .md files</p>
                </div>
              )}
            </div>

            {/* Metadata fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Subject *</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Literature in English" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Class</Label>
                <Input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="e.g. SS3" />
              </div>
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
                <Label className="text-sm">Academic Session</Label>
                <Input value={session} onChange={(e) => setSession(e.target.value)} placeholder="e.g. 2025/2026" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Duration per Lesson</Label>
                <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 40 minutes" />
              </div>
            </div>

            {/* Syllabus text area (if uploaded or manual paste) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Syllabus / Scheme of Work *</Label>
                {fileName && (
                  <button onClick={() => { setSyllabusText(''); setFileName('') }} className="text-xs text-muted-foreground hover:text-red-500 flex items-center gap-1">
                    <X className="size-3" /> Clear
                  </button>
                )}
              </div>
              <Textarea
                value={syllabusText}
                onChange={(e) => setSyllabusText(e.target.value)}
                placeholder="Paste your termly scheme of work here, or upload a file above..."
                className="min-h-[150px] sm:min-h-[200px] text-sm"
              />
            </div>

            {/* Generate button */}
            <div className="flex flex-col gap-2 pt-1">
              <Button
                className="w-full gap-2 text-white"
                style={{ backgroundColor: primaryColor }}
                disabled={isGenerating || !syllabusText.trim() || !subject.trim() || dailyUsed >= dailyLimit}
                onClick={handleGenerate}
              >
                {isGenerating ? <><Loader2 className="size-4 animate-spin" /> Generating 10-Week Notes...</> : <><Sparkles className="size-4" /> Generate 10-Week Lesson Notes</>}
              </Button>
              <div className="flex items-center justify-center">
                <Badge variant={dailyUsed >= dailyLimit ? 'destructive' : 'secondary'} className="text-[11px]">
                  <Zap className="size-3 mr-1" />{dailyUsed}/{dailyLimit} today
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Generating state
  if (isGenerating) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2"><Sparkles className="size-5" style={{ color: primaryColor }} /> Generating 10-Week Notes...</h2>
          <Badge variant="secondary" className="text-xs animate-pulse">Streaming...</Badge>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Generated state — show 10 weeks
  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <BookOpen className="size-5" style={{ color: primaryColor }} />
            {subject} — 10-Week Lesson Notes
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">{className ? `${className} • ` : ''}{term}{session ? ` • ${session}` : ''}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="gap-1" onClick={handleCopyAll}><Copy className="size-3.5" /> Copy All</Button>
          <Button size="sm" variant="outline" className="gap-1" onClick={handlePrintAll}><Printer className="size-3.5" /> Print All</Button>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => { setGeneratedContent(''); setWeeks([]); setEditedWeeks({}) }}><Trash2 className="size-3.5" /> New</Button>
        </div>
      </div>

      {/* Weeks display */}
      {weeks.length > 0 ? (
        <div className="space-y-3">
          {weeks.sort((a, b) => a.week - b.week).map((week) => {
            const isExpanded = expandedWeeks.has(week.week)
            const content = editedWeeks[week.week] || week.content

            return (
              <Card key={week.week} className={cn('transition-shadow', isExpanded && 'shadow-md')}>
                {/* Week header — clickable to expand/collapse */}
                <button
                  className="w-full flex items-center gap-3 p-3 sm:p-4 text-left hover:bg-muted/30 rounded-t-xl transition-colors"
                  onClick={() => toggleWeek(week.week)}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: primaryColor }}>
                    {week.week}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base truncate">
                      {content.match(/\*\*Topic:\*\*\s*(.+)/i)?.[1]?.replace(/\*\*/g, '').trim() || `Week ${week.week}`}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {content.match(/\*\*Sub-Topic:\*\*\s*(.+)/i)?.[1]?.replace(/\*\*/g, '').trim() || ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {week.saved && <Check className="size-4 text-emerald-500" />}
                    {isExpanded ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
                  </div>
                </button>

                {/* Week content — editable when expanded */}
                {isExpanded && (
                  <CardContent className="pt-0 pb-4 px-3 sm:px-4">
                    <Textarea
                      value={content}
                      onChange={(e) => updateWeekContent(week.week, e.target.value)}
                      className="min-h-[400px] sm:min-h-[500px] text-sm font-mono leading-relaxed"
                    />
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" className="gap-1" style={{ backgroundColor: primaryColor }} disabled={savingWeek === week.week} onClick={() => handleSaveWeek(week)}>
                        {savingWeek === week.week ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                        {week.saved ? 'Update' : 'Save'} Week {week.week}
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      ) : (
        /* Fallback: single content block if parsing failed */
        <Card>
          <CardContent className="p-4 sm:p-6">
            <p className="text-sm text-muted-foreground mb-3">Content generated but could not auto-split into weeks. You can copy or print the full content below:</p>
            <Textarea
              value={generatedContent}
              onChange={(e) => setGeneratedContent(e.target.value)}
              className="min-h-[500px] text-sm font-mono"
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}