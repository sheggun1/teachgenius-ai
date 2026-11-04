import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const versionSchema = z.object({
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

type RouteContext = { params: Promise<{ organizationId: string; curriculumId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const { organizationId, curriculumId } = await context.params;

    const membership = await prisma.membership.findFirst({
      where: { userId: user.id, organizationId, status: "ACTIVE" },
    });
    if (!membership || !["SCHOOL_ADMIN", "TEACHER"].includes(membership.role)) {
      return NextResponse.json({ error: "Workspace access denied" }, { status: 403 });
    }

    const curriculum = await prisma.curriculumDocument.findFirst({
      where: { id: curriculumId, organizationId },
      include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
    });
    if (!curriculum) return NextResponse.json({ error: "Curriculum not found" }, { status: 404 });

    const parsed = versionSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid curriculum version", details: parsed.error.flatten() }, { status: 400 });

    const nextVersion = (curriculum.versions[0]?.versionNumber ?? 0) + 1;
    const version = await prisma.$transaction(async (tx) => {
      const created = await tx.curriculumVersion.create({
        data: {
          curriculumDocumentId: curriculumId,
          versionNumber: nextVersion,
          extractedText: parsed.data.extractedText,
          topics: {
            create: parsed.data.topics.map((topic, index) => ({
              term: topic.term,
              week: topic.week,
              topic: topic.topic,
              subtopic: topic.subtopic,
              learningObjectives: topic.learningObjectives ?? [],
              sortOrder: topic.sortOrder ?? index,
            })),
          },
        },
        include: { topics: { orderBy: { sortOrder: "asc" } } },
      });
      await tx.curriculumDocument.update({
        where: { id: curriculumId },
        data: { status: "DRAFT" },
      });
      return created;
    });

    return NextResponse.json({ success: true, version }, { status: 201 });
  } catch (error) {
    console.error("Curriculum version creation failed:", error);
    return NextResponse.json({ error: "Unable to create curriculum version" }, { status: 500 });
  }
}
