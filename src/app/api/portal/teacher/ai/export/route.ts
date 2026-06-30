//src/app/api/portal/teacher/ai/export/route.ts
import { NextResponse } from "next/server";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";
import { db } from "@/lib/db";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || "";
}

export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !tenantId) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const resource = await db.aiResource.findFirst({ where: { id, tenantId } });
    if (!resource) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Increment download count
    await db.aiResource.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    });

    // Parse markdown into paragraphs
    const lines = resource.content.split("\n");
    const paragraphs: Paragraph[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) {
        paragraphs.push(new Paragraph({ text: "" }));
        continue;
      }

      // ## Heading 2
      if (trimmed.startsWith("## ")) {
        const text = trimmed.replace(/^##\s+/, "");
        paragraphs.push(
          new Paragraph({
            text,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
          })
        );
        continue;
      }

      // ### Heading 3
      if (trimmed.startsWith("### ")) {
        const text = trimmed.replace(/^###\s+/, "");
        paragraphs.push(
          new Paragraph({
            text,
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 },
          })
        );
        continue;
      }

      // Bold lines (like **Section A: ...**)
      if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
        const text = trimmed.replace(/\*\*/g, "");
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text, bold: true, size: 24 })],
            spacing: { before: 200, after: 80 },
          })
        );
        continue;
      }

      // Numbered list items (1. 2. 3.)
      if (/^\d+\.\s/.test(trimmed)) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: trimmed, size: 22 }),
            ],
            numbering: { reference: "default-numbering", level: 0 },
            spacing: { before: 40, after: 40 },
          })
        );
        continue;
      }

      // Bullet points
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const text = trimmed.replace(/^[-*]\s+/, "");
        // Handle inline bold
        const parts = text.split(/(\*\*[^*]+\*\*)/g);
        const children: TextRun[] = parts.map((part) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return new TextRun({ text: part.replace(/\*\*/g, ""), bold: true, size: 22 });
          }
          return new TextRun({ text: part, size: 22 });
        });
        paragraphs.push(
          new Paragraph({
            children,
            bullet: { level: 0 },
            spacing: { before: 40, after: 40 },
          })
        );
        continue;
      }

      // Regular paragraph
      const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
      const children: TextRun[] = parts.map((part) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return new TextRun({ text: part.replace(/\*\*/g, ""), bold: true, size: 22 });
        }
        return new TextRun({ text: part, size: 22 });
      });
      paragraphs.push(
        new Paragraph({
          children,
          spacing: { before: 60, after: 60 },
        })
      );
    }

    const doc = new Document({
      numbering: {
        config: [
          {
            reference: "default-numbering",
            levels: [
              {
                level: 0,
                format: "decimal" as const,
                text: "%1.",
                alignment: AlignmentType.START,
              },
            ],
          },
        ],
      },
      sections: [
        {
          properties: {
            page: {
              margin: { top: 720, bottom: 720, left: 720, right: 720 },
            },
          },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: `${resource.resourceType === "exam-paper" ? "EXAM PAPER" : "LESSON NOTE"}`,
                  bold: true,
                  size: 36,
                  color: "1a1a1a",
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `Subject: `, bold: true, size: 26, color: "555" }),
                new TextRun({ text: resource.subject, size: 26 }),
              ],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `Class: `, bold: true, size: 26, color: "555" }),
                new TextRun({ text: resource.className || "—", size: 26 }),
              ],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `Topic: `, bold: true, size: 26, color: "555" }),
                new TextRun({ text: resource.topic, size: 26, italics: true }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Generated by ${resource.teacherName} — ${new Date(resource.createdAt).toLocaleDateString()}`,
                  size: 18,
                  color: "999",
                  italics: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),
            ...paragraphs,
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    const filename = `${resource.resourceType === "exam-paper" ? "Exam" : "Lesson"}_${resource.subject}_${resource.className || "General"}.docx`
      .replace(/[^a-zA-Z0-9_.]/g, "_");

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}