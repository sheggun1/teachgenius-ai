import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.enum(["SUSPEND_USER", "REACTIVATE_USER"]), userId: z.string().uuid(), reason: z.string().trim().max(500).optional() }),
  z.object({ action: z.enum(["SUSPEND_MEMBERSHIP", "REACTIVATE_MEMBERSHIP"]), membershipId: z.string().uuid(), reason: z.string().trim().max(500).optional() }),
  z.object({ action: z.literal("CREATE_WORKSPACE"), name: z.string().trim().min(2).max(120), type: z.enum(["SCHOOL", "EDUCATION_ORGANIZATION"]), adminUserId: z.string().uuid().optional() }),
]);

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  if (user.platformRole !== "PLATFORM_ADMIN") return { error: NextResponse.json({ error: "Platform administrator access required" }, { status: 403 }) };
  return { user };
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const [users, organizations, auditLogs] = await Promise.all([
      prisma.userProfile.findMany({
        orderBy: { createdAt: "desc" }, take: 100,
        select: { id: true, displayName: true, email: true, platformRole: true, accountStatus: true, createdAt: true,
          memberships: { select: { id: true, role: true, status: true, organization: { select: { id: true, name: true, type: true } } }, orderBy: { createdAt: "asc" } } },
      }),
      prisma.organization.findMany({
        orderBy: { createdAt: "desc" }, take: 100,
        select: { id: true, name: true, slug: true, type: true, createdAt: true,
          memberships: { select: { id: true, userId: true, role: true, status: true, user: { select: { displayName: true, email: true } } }, orderBy: { createdAt: "asc" } },
          _count: { select: { memberships: true, curricula: true, documents: true } } },
      }),
      prisma.platformAdminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 20,
        include: { } }),
    ]);
    return NextResponse.json({
      users: users.map(u => ({ ...u, createdAt: u.createdAt.toISOString() })),
      organizations: organizations.map(o => ({ ...o, createdAt: o.createdAt.toISOString() })),
      auditLogs: auditLogs.map(a => ({ id: a.id, action: a.action, targetUserId: a.targetUserId, organizationId: a.organizationId, details: a.details, createdAt: a.createdAt.toISOString() })),
    });
  } catch (error) {
    console.error("Platform management read failed:", error);
    return NextResponse.json({ error: "Unable to load platform management data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const parsed = actionSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid management request", details: parsed.error.flatten() }, { status: 400 });
    const input = parsed.data;
    const actorId = auth.user.id;

    if (input.action === "SUSPEND_USER" || input.action === "REACTIVATE_USER") {
      const target = await prisma.userProfile.findUnique({ where: { id: input.userId }, select: { id: true, platformRole: true, accountStatus: true } });
      if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
      if (input.action === "SUSPEND_USER") {
        if (target.id === actorId) return NextResponse.json({ error: "You cannot suspend your own platform administrator account" }, { status: 400 });
        if (target.platformRole === "PLATFORM_ADMIN") {
          const activeAdmins = await prisma.userProfile.count({ where: { platformRole: "PLATFORM_ADMIN", accountStatus: "ACTIVE" } });
          if (activeAdmins <= 1) return NextResponse.json({ error: "The last active Platform Admin cannot be suspended" }, { status: 409 });
        }
      }
      await prisma.$transaction(async tx => {
        await tx.userProfile.update({ where: { id: target.id }, data: { accountStatus: input.action === "SUSPEND_USER" ? "SUSPENDED" : "ACTIVE" } });
        if (input.action === "SUSPEND_USER") await tx.authSession.updateMany({ where: { userId: target.id, revokedAt: null }, data: { revokedAt: new Date() } });
        await tx.platformAdminAuditLog.create({ data: { actorUserId: actorId, targetUserId: target.id, action: input.action, details: { reason: input.reason || null } } });
      });
      return NextResponse.json({ success: true, message: input.action === "SUSPEND_USER" ? "Platform account suspended" : "Platform account reactivated" });
    }

    if (input.action === "SUSPEND_MEMBERSHIP" || input.action === "REACTIVATE_MEMBERSHIP") {
      const membership = await prisma.membership.findUnique({ where: { id: input.membershipId }, include: { user: { select: { platformRole: true, accountStatus: true } }, organization: { select: { name: true } } } });
      if (!membership) return NextResponse.json({ error: "Workspace membership not found" }, { status: 404 });
      if (input.action === "SUSPEND_MEMBERSHIP" && membership.role === "SCHOOL_ADMIN" && membership.status === "ACTIVE") {
        const admins = await prisma.membership.count({ where: { organizationId: membership.organizationId, role: "SCHOOL_ADMIN", status: "ACTIVE" } });
        if (admins <= 1) return NextResponse.json({ error: "The last active School Admin membership cannot be suspended" }, { status: 409 });
      }
      await prisma.$transaction(async tx => {
        await tx.membership.update({ where: { id: membership.id }, data: { status: input.action === "SUSPEND_MEMBERSHIP" ? "SUSPENDED" : "ACTIVE" } });
        await tx.platformAdminAuditLog.create({ data: { actorUserId: actorId, targetUserId: membership.userId, organizationId: membership.organizationId, action: input.action, details: { reason: input.reason || null, workspace: membership.organization.name } } });
      });
      return NextResponse.json({ success: true, message: input.action === "SUSPEND_MEMBERSHIP" ? "Workspace access suspended" : "Workspace access reactivated" });
    }

    const slugBase = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "workspace";
    const slug = slugBase + "-" + randomUUID().slice(0, 8);
    const created = await prisma.$transaction(async tx => {
      const organization = await tx.organization.create({ data: { name: input.name, slug, type: input.type } });
      if (input.adminUserId) {
        const admin = await tx.userProfile.findUnique({ where: { id: input.adminUserId }, select: { id: true, accountStatus: true } });
        if (!admin || admin.accountStatus !== "ACTIVE") throw new Error("Selected workspace administrator is unavailable");
        await tx.membership.create({ data: { userId: admin.id, organizationId: organization.id, role: "SCHOOL_ADMIN", status: "ACTIVE" } });
      }
      await tx.platformAdminAuditLog.create({ data: { actorUserId: actorId, organizationId: organization.id, action: "CREATE_WORKSPACE", details: { name: input.name, type: input.type, adminUserId: input.adminUserId || null } } });
      return organization;
    });
    return NextResponse.json({ success: true, workspace: created }, { status: 201 });
  } catch (error) {
    console.error("Platform management action failed:", error);
    return NextResponse.json({ error: error instanceof Error && error.message === "Selected workspace administrator is unavailable" ? error.message : "Unable to complete the requested action" }, { status: 500 });
  }
}
