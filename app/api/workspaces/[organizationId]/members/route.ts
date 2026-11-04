import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const memberSchema = z.object({
  email: z.string().trim().email().max(254),
  role: z.enum(["TEACHER", "STUDENT"]),
});

type RouteContext = { params: Promise<{ organizationId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const { organizationId } = await context.params;

    const membership = await prisma.membership.findFirst({
      where: { userId: user.id, organizationId, status: "ACTIVE" },
      include: { organization: true },
    });
    if (!membership || (membership.role !== "SCHOOL_ADMIN" && user.platformRole !== "PLATFORM_ADMIN")) {
      return NextResponse.json({ error: "You are not allowed to manage this workspace" }, { status: 403 });
    }
    if (membership.organization.type !== "SCHOOL") {
      return NextResponse.json({ error: "Member management is only available for school workspaces" }, { status: 400 });
    }

    const parsed = memberSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid member details", details: parsed.error.flatten() }, { status: 400 });
    const memberUser = await prisma.userProfile.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (!memberUser) return NextResponse.json({ error: "No registered user has this email yet" }, { status: 404 });

    const result = await prisma.membership.upsert({
      where: { userId_organizationId: { userId: memberUser.id, organizationId } },
      create: { userId: memberUser.id, organizationId, role: parsed.data.role, status: "ACTIVE" },
      update: { role: parsed.data.role, status: "ACTIVE" },
      select: { id: true, userId: true, organizationId: true, role: true, status: true },
    });
    return NextResponse.json({ success: true, membership: result }, { status: 201 });
  } catch (error) {
    console.error("Workspace member update failed:", error);
    return NextResponse.json({ error: "Unable to add workspace member" }, { status: 500 });
  }
}
