import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const requestSchema = z.object({
  organizationId: z.string().uuid(),
  curriculumTopicId: z.string().uuid(),
  type: z.enum(["LESSON_NOTE", "LESSON_PLAN", "EXAMINATION", "QUIZ", "ASSIGNMENT", "REVISION_NOTE"]),
  title: z.string().trim().max(180).optional(),
  additionalInstructions: z.string().trim().max(2000).optional(),
});

const generatedContentSchema = z.object({
  title: z.string().min(1).max(180),
  topic: z.string().min(1).max(300),
  learningObjectives: z.array(z.string()).max(30),
  sections: z.array(z.object({
    heading: z.string().min(1).max(180),
    body: z.string().min(1).max(12000),
  })).min(1).max(30),
  assessmentQuestions: z.array(z.object({
    question: z.string().min(1).max(3000),
    answer: z.string().max(3000).optional(),
    marks: z.number().min(0).max(100).optional(),
  })).max(100),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid generation request", details: parsed.error.flatten() }, { status: 400 });
    const input = parsed.data;

    const membership = await prisma.membership.findFirst({
      where: { userId: user.id, organizationId: input.organizationId, status: "ACTIVE" },
    });
    if (!membership || !["SCHOOL_ADMIN", "TEACHER"].includes(membership.role)) {
      return NextResponse.json({ error: "You do not have permission to generate documents in this workspace" }, { status: 403 });
    }

    const topicRecord = await prisma.curriculumTopic.findUnique({
      where: { id: input.curriculumTopicId },
      include: { version: { include: { document: true } } },
    });
    if (
      !topicRecord ||
      topicRecord.version.document.organizationId !== input.organizationId ||
      topicRecord.version.document.status !== "PUBLISHED" ||
      !topicRecord.version.approvedAt
    ) {
      return NextResponse.json({
        error: "This topic is not part of a published, approved curriculum. Ask a school administrator to publish the curriculum first.",
      }, { status: 409 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "AI generation is not configured yet. Add OPENAI_API_KEY to Render environment variables." }, { status: 503 });

    const curriculumContext = {
      subject: topicRecord.version.document.subjectName,
      class: topicRecord.version.document.className,
      term: topicRecord.term,
      week: topicRecord.week,
      topic: topicRecord.topic,
      subtopic: topicRecord.subtopic,
      learningObjectives: topicRecord.learningObjectives,
      sourceText: topicRecord.version.extractedText,
    };

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "You are an educational content generator.",
              "Use only the supplied approved curriculum topic, subtopic, objectives, and source text.",
              "Do not add, invent, broaden, or substitute topics, learning objectives, or curriculum coverage.",
              "If the source does not provide enough information for a requested detail, state that limitation in a section instead of inventing curriculum facts.",
              "Return only valid JSON with keys: title, topic, learningObjectives, sections, assessmentQuestions.",
              "sections must be an array of objects with heading and body.",
              "assessmentQuestions must be an array of objects with question and optional answer and marks.",
            ].join(" "),
          },
          {
            role: "user",
            content: JSON.stringify({
              documentType: input.type,
              requestedTitle: input.title,
              additionalInstructions: input.additionalInstructions,
              approvedCurriculum: curriculumContext,
              outputRequirements: "Create a clear, age-appropriate, editable teaching document. Keep every section within the approved topic and objectives.",
            }),
          },
        ],
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!aiResponse.ok) {
      const detail = await aiResponse.text();
      console.error("AI provider error:", aiResponse.status, detail.slice(0, 1000));
      return NextResponse.json({ error: "The AI provider could not complete the request" }, { status: 502 });
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content;
    if (typeof rawContent !== "string") return NextResponse.json({ error: "The AI returned an empty response" }, { status: 502 });

    let decoded: unknown;
    try {
      decoded = JSON.parse(rawContent);
    } catch {
      return NextResponse.json({ error: "The AI returned invalid structured content. Please try again." }, { status: 502 });
    }
    const validated = generatedContentSchema.safeParse(decoded);
    if (!validated.success) {
      console.error("AI output validation failed:", validated.error.flatten());
      return NextResponse.json({ error: "The AI response did not meet the document format requirements" }, { status: 502 });
    }

    const finalContent = validated.data as Prisma.InputJsonValue;
    const title = input.title || validated.data.title;
    const document = await prisma.$transaction(async (tx) => {
      const created = await tx.generatedDocument.create({
        data: {
          ownerUserId: user.id,
          organizationId: input.organizationId,
          type: input.type,
          title,
          subjectName: topicRecord.version.document.subjectName,
          className: topicRecord.version.document.className,
          topic: topicRecord.topic,
          content: finalContent,
          curriculumVersionId: topicRecord.version.id,
        },
      });
      await tx.documentVersion.create({
        data: { documentId: created.id, versionNumber: 1, content: finalContent, editedBy: user.id },
      });
      return created;
    });

    return NextResponse.json({
      success: true,
      document,
      curriculum: {
        documentId: topicRecord.version.document.id,
        versionId: topicRecord.version.id,
        versionNumber: topicRecord.version.versionNumber,
        topic: topicRecord.topic,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("AI document generation failed:", error);
    return NextResponse.json({ error: "Unable to generate the document" }, { status: 500 });
  }
}
