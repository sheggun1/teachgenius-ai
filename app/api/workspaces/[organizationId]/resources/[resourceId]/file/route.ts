import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, context: { params: Promise<{ organizationId: string; resourceId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const { organizationId, resourceId } = await context.params;
    const membership = await prisma.membership.findFirst({ where: { userId: user.id, organizationId, status: "ACTIVE" } });
    const admin = user.platformRole === "PLATFORM_ADMIN" || membership?.role === "SCHOOL_ADMIN";
    const resource = await prisma.resourceAsset.findFirst({ where: { id: resourceId, organizationId } });
    if (!resource) return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    if (!admin && resource.uploadedBy !== user.id && !(resource.visibility === "WORKSPACE" && resource.reviewStatus === "APPROVED" && membership?.status === "ACTIVE")) {
      return NextResponse.json({ error: "You do not have permission to download this resource" }, { status: 403 });
    }
    const safeName = resource.originalName.replace(/[\r\n"]/g, "_");
    return new NextResponse(new Uint8Array(resource.fileData), {
      headers: {
        "Content-Type": resource.mimeType,
        "Content-Length": String(resource.fileSize),
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Resource download failed:", error);
    return NextResponse.json({ error: "Unable to download resource" }, { status: 500 });
  }
}
