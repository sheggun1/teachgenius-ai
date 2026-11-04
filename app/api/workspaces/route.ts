import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const memberships = await prisma.membership.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      include: {
        organization: { select: { id: true, name: true, slug: true, type: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      workspaces: memberships.map((membership) => ({
        ...membership.organization,
        role: membership.role,
      })),
    });
  } catch (error) {
    console.error("Workspace lookup failed:", error);
    return NextResponse.json({ error: "Unable to load workspaces" }, { status: 500 });
  }
}
