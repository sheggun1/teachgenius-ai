import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ organizationId: string; curriculumId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const { organizationId, curriculumId } = await context.params;

    const anyMembership = await prisma.membership.findFirst({
      where: { userId: user.id, organizationId },
      select: { role: true, status: true },
    });
    if (anyMembership?.status === "SUSPENDED") {
      return NextResponse.json({ error: "Your access to this workspace has been suspended" }, { status: 403 });
    }
    const membership = anyMembership?.status === "ACTIVE" ? anyMembership : null;
    const canPublish = user.platformRole === "PLATFORM_ADMIN" || membership?.role === "SCHOOL_ADMIN";
    if (!canPublish) {
      return NextResponse.json({
        error: "Only a School Admin or Platform Admin can approve and publish curriculum. Teachers can submit topics for review.",
      }, { status: 403 });
    }

    const curriculum = await prisma.curriculumDocument.findFirst({
      where: { id: curriculumId, organizationId },
      include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
    });
    if (!curriculum || curriculum.versions.length === 0) {
      return NextResponse.json({ error: "Curriculum or version not found" }, { status: 404 });
    }

    const published = await prisma.$transaction(async (tx) => {
      await tx.curriculumVersion.update({
        where: { id: curriculum.versions[0].id },
        data: { approvedAt: new Date() },
      });
      return tx.curriculumDocument.update({
        where: { id: curriculumId },
        data: { status: "PUBLISHED" },
      });
    });
    return NextResponse.json({ success: true, curriculum: published });
  } catch (error) {
    console.error("Curriculum publish failed:", error);
    return NextResponse.json({ error: "Unable to publish curriculum" }, { status: 500 });
  }
}
