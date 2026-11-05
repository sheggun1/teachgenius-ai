import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ organizationId: string; resourceId: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const { organizationId, resourceId } = await context.params;
    const membership = await prisma.membership.findFirst({ where: { userId: user.id, organizationId, status: "ACTIVE" } });
    const admin = user.platformRole === "PLATFORM_ADMIN" || membership?.role === "SCHOOL_ADMIN";
    if (!admin) return NextResponse.json({ error: "Only a School Admin or Platform Admin can review resources" }, { status: 403 });
    const body = await request.json() as { action?: string; note?: string };
    if (!["APPROVE", "REJECT"].includes(body.action || "")) return NextResponse.json({ error: "Choose approve or reject" }, { status: 400 });
    const resource = await prisma.resourceAsset.findFirst({ where: { id: resourceId, organizationId } });
    if (!resource) return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    const updated = await prisma.resourceAsset.update({
      where: { id: resourceId },
      data: {
        reviewStatus: body.action === "APPROVE" ? "APPROVED" : "REJECTED",
        visibility: body.action === "APPROVE" ? "WORKSPACE" : "PRIVATE",
        reviewedBy: user.id, reviewedAt: new Date(), reviewNote: body.note?.trim().slice(0, 500) || null,
      },
      select: { id: true, reviewStatus: true, visibility: true, reviewNote: true },
    });
    return NextResponse.json({ success: true, resource: updated });
  } catch (error) {
    console.error("Resource review failed:", error);
    return NextResponse.json({ error: "Unable to update resource review" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const { organizationId, resourceId } = await context.params;
    const membership = await prisma.membership.findFirst({ where: { userId: user.id, organizationId, status: "ACTIVE" } });
    const resource = await prisma.resourceAsset.findFirst({ where: { id: resourceId, organizationId } });
    if (!resource) return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    const allowed = user.platformRole === "PLATFORM_ADMIN" || membership?.role === "SCHOOL_ADMIN" || resource.uploadedBy === user.id;
    if (!allowed) return NextResponse.json({ error: "You cannot delete this resource" }, { status: 403 });
    await prisma.resourceAsset.delete({ where: { id: resourceId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Resource deletion failed:", error);
    return NextResponse.json({ error: "Unable to delete resource" }, { status: 500 });
  }
}
