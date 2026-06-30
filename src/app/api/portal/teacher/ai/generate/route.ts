import { db } from "@/lib/db";
import { NextResponse } from "next/server";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

function getUserId(request: Request): string {
  return request.headers.get("x-user-id") || "";
}

const DAILY_LIMIT = parseInt(process.env.AI_DAILY_LIMIT || "20", 10);

async function getTodayUsage(tenantId: string, teacherId: string): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const activities = await db.teacherActivity.count({
    where: {
      tenantId,
      teacherId,
      action: "generate",
      createdAt: { gte: start },
    },
  });
  return activities;
}

function resolveProvider(): { name: string; key: string }[] {
  const providers: { name: string; key: string }[] = [];
  if (process.env.GROQ_API_KEY) {
    providers.push({ name: "groq", key: process.env.GROQ_API_KEY });
  }
  if (process.env.OPENAI_API_KEY) {
    providers.push({ name: "openai", key: process.env.OPENAI_API_KEY });
  }
  if (process.env.GEMINI_API_KEY) {
    providers.push({ name: "gemini", key: process.env.GEMINI_API_KEY });
  }
  return providers;
}

async function streamGroq(
  prompt: string,
  apiKey: string,
  controller: ReadableStreamDefaultController
): Promise<boolean> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are an expert Nigerian curriculum lesson plan writer. You create detailed, NERDC-aligned lesson notes for Nigerian schools. Always respond in pure JSON format, no markdown fences." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 16000,
      stream: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Groq ${res.status}: ${text.slice(0, 200)}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body from Groq");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      if (data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content || "";
        if (content) {
          controller.enqueue(new TextEncoder().encode(content));
        }
      } catch {
        // skip malformed chunks
      }
    }
  }
  return true;
}

async function streamOpenAI(
  prompt: string,
  apiKey: string,
  controller: ReadableStreamDefaultController
): Promise<boolean> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are an expert Nigerian curriculum lesson plan writer. You create detailed, NERDC-aligned lesson notes for Nigerian schools. Always respond in pure JSON format, no markdown fences." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 16000,
      stream: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${text.slice(0, 200)}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body from OpenAI");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      if (data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content || "";
        if (content) {
          controller.enqueue(new TextEncoder().encode(content));
        }
      } catch {
        // skip
      }
    }
  }
  return true;
}

async function streamGemini(
  prompt: string,
  apiKey: string,
  controller: ReadableStreamDefaultController
): Promise<boolean> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 16000 },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${text.slice(0, 200)}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body from Gemini");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      try {
        const parsed = JSON.parse(trimmed.slice(6));
        const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (content) {
          controller.enqueue(new TextEncoder().encode(content));
        }
      } catch {
        // skip
      }
    }
  }
  return true;
}

function generateFallbackContent(
  subject: string,
  className: string,
  syllabusText: string
): object[] {
  const lines = syllabusText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const weeks: object[] = [];
  for (let i = 0; i < 10 && i < lines.length; i++) {
    weeks.push({
      week: i + 1,
      topics: [lines[i] || `Topic ${i + 1}`],
      referenceMaterials: "Textbook and class notes",
      performanceObjectives: "Students should understand the topic covered this week.",
      previousKnowledge: "Prior lesson content.",
      instructionalMaterials: "Chalkboard, textbook, charts",
      presentation: [
        { step: 1, title: "Introduction", content: "Introduce the topic with real-life examples." },
        { step: 2, title: "Explanation", content: "Explain key concepts in detail." },
        { step: 3, title: "Demonstration", content: "Demonstrate with practical examples." },
        { step: 4, title: "Practice", content: "Students practice with guided exercises." },
        { step: 5, title: "Conclusion", content: "Summarize and give assignment." },
      ],
      evaluation: "Class discussion and written exercise.",
      assignment: "Complete exercises from the textbook.",
    });
  }
  return weeks;
}

function buildLessonNotesPrompt(
  subject: string,
  className: string,
  syllabusText: string,
  term: string,
  session: string
): string {
  return `You are an expert Nigerian curriculum lesson note writer. Generate a COMPLETE 10-week termly lesson plan.

SUBJECT: ${subject}
CLASS: ${className}
TERM: ${term}
SESSION: ${session}

SYLLABUS / SCHEME OF WORK (provided by teacher):
 ${syllabusText}

INSTRUCTIONS:
1. Create exactly 10 weeks of lesson notes (Week 1 to Week 10).
2. Weeks 11 and 12 are reserved for revision and examinations - do NOT include them.
3. Distribute the syllabus topics across the 10 weeks logically.
4. If a week has multiple topics, create separate presentation steps for each.
5. Each week MUST have this exact JSON structure:

{
  "weeks": [
    {
      "week": 1,
      "topics": ["Topic name"],
      "referenceMaterials": "Textbooks and materials",
      "performanceObjectives": "By the end of the lesson, students should be able to...",
      "previousKnowledge": "What students already know",
      "instructionalMaterials": "Teaching aids and materials",
      "presentation": [
        {"step": 1, "title": "Introduction", "content": "Detailed introduction..."},
        {"step": 2, "title": "Explanation", "content": "Detailed explanation..."},
        {"step": 3, "title": "Demonstration/Guided Practice", "content": "Detailed demonstration..."},
        {"step": 4, "title": "Practice/Activity", "content": "Detailed practice activities..."},
        {"step": 5, "title": "Conclusion/Summary", "content": "Detailed conclusion..."}
      ],
      "evaluation": "How to evaluate students' understanding",
      "assignment": "Homework/assignment for the week"
    }
  ]
}

CRITICAL RULES:
- Align ALL content with the NERDC (Nigerian Educational Research and Development Council) curriculum.
- Make content detailed and top-notch - this is a professional lesson note.
- Each presentation step should have at least 3-5 sentences of detailed content.
- Performance objectives should be specific and measurable.
- Instructional materials should be specific to the topic.
- Reference materials should include actual textbook titles where possible.
- Evaluation should include specific questions or assessment methods.
- Assignment should be specific and related to the week's topic.
- Respond with ONLY the JSON object, no markdown code fences, no explanation.
- The JSON must be valid and parseable.`;
}

export async function POST(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);

    if (!tenantId || !userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get teacherId from user
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { teacherId: true },
    });

    if (!user?.teacherId) {
      return new Response(JSON.stringify({ error: "Teacher not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const teacherId = user.teacherId;

    // Check daily limit
    const todayUsage = await getTodayUsage(tenantId, teacherId);
    if (todayUsage >= DAILY_LIMIT) {
      return new Response(
        JSON.stringify({ error: `Daily limit of ${DAILY_LIMIT} generations reached. Try again tomorrow.` }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await request.json();
    const { subject, className, syllabusText, term, session, type } = body;

    if (type === "lesson-notes") {
      // 10-week lesson notes generation
      if (!subject || !className || !syllabusText) {
        return new Response(
          JSON.stringify({ error: "Subject, class, and syllabus text are required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const prompt = buildLessonNotesPrompt(
        subject,
        className,
        syllabusText,
        term || "First Term",
        session || new Date().getFullYear().toString()
      );

      const providers = resolveProvider();

      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();

          // Send metadata first
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "meta",
                remaining: DAILY_LIMIT - todayUsage - 1,
                total: DAILY_LIMIT,
              }) + "\n"
            )
          );

          let success = false;

          for (const provider of providers) {
            try {
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    type: "status",
                    message: `Generating with ${provider.name}...`,
                  }) + "\n"
                )
              );

              if (provider.name === "groq") {
                await streamGroq(prompt, provider.key, controller);
              } else if (provider.name === "openai") {
                await streamOpenAI(prompt, provider.key, controller);
              } else if (provider.name === "gemini") {
                await streamGemini(prompt, provider.key, controller);
              }

              success = true;
              break;
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Unknown error";
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    type: "status",
                    message: `${provider.name} failed: ${msg}. Switching...`,
                  }) + "\n"
                )
              );
            }
          }

          if (!success) {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "status",
                  message: "All AI providers unavailable. Using template...",
                }) + "\n"
              )
            );
            const fallback = generateFallbackContent(subject, className, syllabusText);
            controller.enqueue(
              encoder.encode(JSON.stringify({ type: "data", content: { weeks: fallback } }) + "\n")
            );
          }

          controller.close();

          // Track usage (fire and forget)
          try {
            await db.teacherActivity.create({
              data: {
                tenantId,
                teacherId,
                action: "generate",
                points: 1,
                details: `Generated 10-week lesson notes for ${subject} - ${className}`,
              },
            });
          } catch {
            // tracking failure is non-critical
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Default: general lesson note generation
    const { topic, level } = body;
    if (!topic) {
      return new Response(
        JSON.stringify({ error: "Topic is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const generalPrompt = `Write a detailed Nigerian curriculum lesson note on: "${topic}" for ${level || "secondary school"} students.

Include:
1. Subject
2. Topic
3. Reference Materials
4. Performance Objectives (at least 3)
5. Previous Knowledge
6. Instructional Materials
7. Lesson Presentation (5 detailed steps: Introduction, Explanation, Demonstration, Practice, Conclusion)
8. Evaluation (specific questions)
9. Assignment

Align with NERDC curriculum standards. Be detailed and comprehensive.`;

    const providers = resolveProvider();

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: "meta",
              remaining: DAILY_LIMIT - todayUsage - 1,
              total: DAILY_LIMIT,
            }) + "\n"
          )
        );

        let success = false;

        for (const provider of providers) {
          try {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "status",
                  message: `Generating with ${provider.name}...`,
                }) + "\n"
              )
            );

            if (provider.name === "groq") {
              await streamGroq(generalPrompt, provider.key, controller);
            } else if (provider.name === "openai") {
              await streamOpenAI(generalPrompt, provider.key, controller);
            } else if (provider.name === "gemini") {
              await streamGemini(generalPrompt, provider.key, controller);
            }

            success = true;
            break;
          } catch {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "status",
                  message: `${provider.name} failed. Switching...`,
                }) + "\n"
              )
            );
          }
        }

        if (!success) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "status",
                message: "All providers unavailable.",
              }) + "\n"
            )
          );
          controller.enqueue(
            encoder.encode("Unable to generate content. Please try again later.")
          );
        }

        controller.close();

        try {
          await db.teacherActivity.create({
            data: {
              tenantId,
              teacherId,
              action: "generate",
              points: 1,
              details: `Generated lesson note on: ${topic}`,
            },
          });
        } catch {}
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// PATCH - Track usage for non-streaming actions
export async function PATCH(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    const body = await request.json();
    const { action, points, details } = body;

    if (!tenantId || !userId || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { teacherId: true },
    });

    if (!user?.teacherId) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    await db.teacherActivity.create({
      data: {
        tenantId,
        teacherId: user.teacherId,
        action,
        points: points || 0,
        details: details || "",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}