import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const curriculumSchema = z.object({
  title: z.string().trim().min(2).max(180),
  subjectName: z.string().trim().max(120).optional(),
  className: z.string().trim().max(120).optional(),
  extractedText: z.string().max(100000).optional(),
  topics: z.array(z.object({
    term: z.string().max(80).optional(),
    week: z.string().max(40).optional(),
    topic: z.string().trim().min(1).max(300),
    subtopic: z.string().max(300).optional(),
    learningObjectives: z.array(z.string().trim().min(1).max(500)).max(30).optional(),
    sortOrder: z.number().int().min(0).max(10000).optional(),
  })).min(1).max(500),
});

type RouteContext = { params: Promise<{ organizationId: string }> };

async function getMembership(userId: string, organizationId: string) {
  return prisma.membership.findFirst({
    where: { userId, organizationId, status: "ACTIVE" },
    include: { organization: { select: { type: true } } },
  });
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const { organizationId } = await context.params;
    const membership = await getMembership(user.id, organizationId);
    if (!membership && user.platformRole !== "PLATFORM_ADMIN") {
      return NextResponse.json({ error: "Workspace access denied" }, { status: 403 });
    }

    const curricula = await prisma.curriculumDocument.findMany({
      where: { organizationId },
      include: { versions: { orderBy: { versionNumber: "desc" }, include: { topics: { orderBy: { sortOrder: "asc" } } } } },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ curricula });
  } catch (error) {
    console.error("Curriculum listing failed:", error);
    return NextResponse.json({ error: "Unable to load curriculum" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const { organizationId } = await context.params;
    const membership = await getMembership(user.id, organizationId);
    if (!membership || !["SCHOOL_ADMIN", "TEACHER"].includes(membership.role)) {
      return NextResponse.json({ error: "Workspace access denied" }, { status: 403 });
    }

    const parsed = curriculumSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid curriculum data", details: parsed.error.flatten() }, { status: 400 });
    const input = parsed.data;

    const curriculum = await prisma.curriculumDocument.create({
      data: {
        organizationId,
        title: input.title,
        subjectName: input.subjectName,
        className: input.className,
        createdBy: user.id,
        status: "DRAFT",
        versions: {
          create: {
            versionNumber: 1,
            extractedText: input.extractedText,
            topics: {
              create: input.topics.map((topic, index) => ({
                term: topic.term,
                week: topic.week,
                topic: topic.topic,
                subtopic: topic.subtopic,
                learningObjectives: topic.learningObjectives ?? [],
                sortOrder: topic.sortOrder ?? index,
              })),
            },
          },
        },
      },
      include: { versions: { include: { topics: { orderBy: { sortOrder: "asc" } } } } },
    });
    return NextResponse.json({ success: true, curriculum }, { status: 201 });
  } catch (error) {
    console.error("Curriculum creation failed:", error);
    return NextResponse.json({ error: "Unable to save curriculum" }, { status: 500 });
  }
}
