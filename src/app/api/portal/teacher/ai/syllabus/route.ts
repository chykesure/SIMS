import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}
function getUserId(request: Request): string {
  return request.headers.get("x-user-id") || "";
}

type SyllabusData = {
  syllabusText: string;
  subject: string;
  className: string;
  term: string;
  session: string;
  duration: string;
};

function buildSyllabusPrompt(data: SyllabusData): string {
  const { syllabusText, subject, className, term, session, duration } = data;
  const meta = [
    className ? `Class: ${className}` : "",
    term ? `Term: ${term}` : "",
    session ? `Session: ${session}` : "",
    duration ? `Duration: ${duration}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  return `You are an expert curriculum planner and lesson note writer for Nigerian primary and secondary schools. Convert the teacher's uploaded termly scheme of work/syllabus into a structured 10-week lesson note.

**Subject:** ${subject}
 ${meta ? `**Context:** ${meta}\n` : ""}

## TEACHER'S SYLLABUS / SCHEME OF WORK:
 ${syllabusText}

## STRICT INSTRUCTIONS:

1. Analyse the uploaded scheme of work carefully and spread the content across exactly 10 weeks of active teaching. Weeks 11-12 are revision/exam and should NOT be included.

2. Preserve the sequence of topics. Where a topic is too broad, divide it into logical subtopics across multiple weeks. Where a week naturally contains multiple learning areas (especially English Language), include all relevant topics within that week.

3. For EVERY week (Week 1 through Week 10), generate a complete lesson note using EXACTLY this structure (use ## and ### headings):

### Week X
- **Date:** [editable placeholder or actual dates if provided]
- **Class:** ${className || "[class]"}
- **Subject:** ${subject}
- **Duration:** ${duration || "40 minutes"}
- **Topic:** [main topic]
- **Sub-Topic:** [sub-topic if applicable]
- **Reference Materials:** [relevant textbooks/materials]
- **Performance Objectives:** 3-5 bullet points starting with "By the end of the lesson, students should be able to..."
- **Previous Knowledge:** What students already know
- **Instructional Materials:** Teaching aids needed
- **Lesson Presentation:**
  - **Step 1: Introduction** (how to introduce the topic)
  - **Step 2: Topic/Subtopic One** (detailed teaching content with examples)
  - **Step 3: Topic/Subtopic Two** (where applicable, separate treatment)
  - **Step 4: Topic/Subtopic Three** (where applicable)
  - **Step 5: Class Discussion/Practice/Conclusion**
- **Evaluation:** 3-4 questions for assessment
- **Assignment:** Homework/task for students

4. CONTENT QUALITY:
- Write notes suitable for the specified class level
- Make explanations detailed enough for actual classroom teaching
- Include relevant Nigerian examples where appropriate
- Keep content curriculum-aligned (NERDC/WAEC/NECO)
- Ensure smooth progression from one week to the next
- For English Language weeks, treat Grammar, Vocabulary, Comprehension, Speech Work, Writing, Literature as separate steps

5. FORMAT: Output clean Markdown. Use ## for Week headers and ### for sub-sections. Use **bold** for field labels. Each week must be clearly separated.

Output ALL 10 weeks. Do not truncate or skip any week.`;
}

// --- OpenAI-compatible streamer (OpenAI + Groq) ---
async function streamCompatible(
  endpoint: string,
  apiKey: string,
  model: string,
  systemMsg: string,
  prompt: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
): Promise<boolean> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemMsg },
        { role: "user", content: prompt },
      ],
      max_tokens: 14000,
      temperature: 0.6,
      stream: true,
    }),
  });
  if (!res.ok) return false;
  const reader = res.body?.getReader();
  if (!reader) return false;
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const d = trimmed.slice(6);
      if (d === "[DONE]") break;
      try {
        const parsed = JSON.parse(d);
        const c = parsed.choices?.[0]?.delta?.content;
        if (c) controller.enqueue(encoder.encode(c));
      } catch { /* skip */ }
    }
  }
  return true;
}

// --- Gemini streamer ---
async function streamGemini(
  apiKey: string,
  prompt: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
): Promise<boolean> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 14000, temperature: 0.6 },
      }),
    }
  );
  if (!res.ok) return false;
  const reader = res.body?.getReader();
  if (!reader) return false;
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      try {
        const p = JSON.parse(trimmed.slice(6));
        const t = p.candidates?.[0]?.content?.parts?.[0]?.text;
        if (t) controller.enqueue(encoder.encode(t));
      } catch { /* skip */ }
    }
  }
  return true;
}

function streamWithFailover(prompt: string, data: SyllabusData): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const providers: Array<{ name: string; fn: () => Promise<boolean> }> = [];

      if (process.env.OPENAI_API_KEY) {
        const k = process.env.OPENAI_API_KEY;
        providers.push({
          name: "OpenAI",
          fn: () => streamCompatible("https://api.openai.com/v1/chat/completions", k, "gpt-4o-mini", "You are an expert Nigerian curriculum planner. Output clean Markdown only.", prompt, controller, encoder),
        });
      }
      if (process.env.GROQ_API_KEY) {
        const k = process.env.GROQ_API_KEY;
        providers.push({
          name: "Groq",
          fn: () => streamCompatible("https://api.groq.com/openai/v1/chat/completions", k, "llama-3.3-70b-versatile", "You are an expert Nigerian curriculum planner. Output clean Markdown only.", prompt, controller, encoder),
        });
      }
      if (process.env.GEMINI_API_KEY) {
        const k = process.env.GEMINI_API_KEY;
        providers.push({ name: "Gemini", fn: () => streamGemini(k, prompt, controller, encoder) });
      }

      let ok = false;
      for (let i = 0; i < providers.length; i++) {
        try {
          const success = await providers[i].fn();
          if (success) { ok = true; break; }
          if (i < providers.length - 1) controller.enqueue(encoder.encode(`\n*${providers[i].name} unavailable, switching...*\n\n`));
        } catch {
          if (i < providers.length - 1) controller.enqueue(encoder.encode(`\n*${providers[i].name} failed, switching...*\n\n`));
        }
      }

      if (!ok) {
        controller.enqueue(encoder.encode("*All AI providers unavailable. Please try again later.*\n"));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}

export async function POST(request: Request) {
  const tenantId = getTenantId(request);
  const userId = getUserId(request);
  const contentType = request.headers.get("content-type") || "";

  // ── FILE UPLOAD: extract text from docx/txt ──
  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

      const buffer = Buffer.from(await file.arrayBuffer());
      let text = "";

      if (file.name.endsWith(".docx")) {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
      } else if (file.name.endsWith(".txt") || file.name.endsWith(".md")) {
        text = buffer.toString("utf-8");
      } else {
        return NextResponse.json({ error: "Only .docx, .txt, and .md files are supported" }, { status: 400 });
      }

      return NextResponse.json({ success: true, text: text.trim(), fileName: file.name });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to extract text";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  // ── GENERATE 10-WEEK NOTES ──
  try {
    if (!tenantId || !userId) return NextResponse.json({ error: "Auth required" }, { status: 400 });

    const body = await request.json();
    const { syllabusText, subject, className, term, session, duration } = body;
    if (!syllabusText || !subject) return NextResponse.json({ error: "Syllabus and subject required" }, { status: 400 });

    const data: SyllabusData = { syllabusText, subject, className: className || "", term: term || "", session: session || "", duration: duration || "" };

    // Check daily limit
    const DAILY_LIMIT = parseInt(process.env.TEACHER_DAILY_AI_LIMIT || "20", 10);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await db.teacherActivity.count({
      where: { tenantId, teacherId: userId, action: "generate", createdAt: { gte: today } },
    });
    if (todayCount >= DAILY_LIMIT) {
      return NextResponse.json({ error: `Daily limit reached (${DAILY_LIMIT}/${DAILY_LIMIT}). Try tomorrow.`, dailyLimit: DAILY_LIMIT, dailyUsed: todayCount }, { status: 429 });
    }

    const prompt = buildSyllabusPrompt(data);
    return streamWithFailover(prompt, data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}