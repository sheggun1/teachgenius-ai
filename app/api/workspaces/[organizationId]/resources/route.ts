import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ResourceCategory, ResourceReviewStatus, ResourceVisibility } from "@prisma/client";
import pdf from "pdf-parse";
import mammoth from "mammoth";

export const runtime = "nodejs";
const MAX_BYTES = 8 * 1024 * 1024;
const allowed = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/csv", "image/jpeg", "image/png"
]);

async function extractText(buffer: Buffer, mime: string, name: string) {
  try {
    if (mime === "application/pdf") return (await pdf(buffer)).text.slice(0, 100000);
    if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || name.toLowerCase().endsWith(".docx")) {
      return (await mammoth.extractRawText({ buffer })).value.slice(0, 100000);
    }
    if (mime === "text/plain" || mime === "text/csv") return buffer.toString("utf8").slice(0, 100000);
  } catch (error) {
    console.error("Resource text extraction failed:", error);
  }
  return null;
}

export async function GET(request: NextRequest, context: { params: Promise<{ organizationId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const { organizationId } = await context.params;
    const membership = await prisma.membership.findFirst({ where: { userId: user.id, organizationId, status: "ACTIVE" } });
    const platformAdmin = user.platformRole === "PLATFORM_ADMIN";
    if (!platformAdmin && (!membership || !["SCHOOL_ADMIN", "TEACHER"].includes(membership.role))) {
      return NextResponse.json({ error: "Workspace access denied" }, { status: 403 });
    }
    const admin = platformAdmin || membership?.role === "SCHOOL_ADMIN";
    const resources = await prisma.resourceAsset.findMany({
      where: { organizationId, ...(admin ? {} : { OR: [{ uploadedBy: user.id }, { visibility: "WORKSPACE", reviewStatus: "APPROVED" }] }) },
      select: { id: true, title: true, originalName: true, mimeType: true, fileSize: true, category: true, visibility: true, reviewStatus: true, reviewNote: true, createdAt: true, uploadedBy: true, uploader: { select: { displayName: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ resources: resources.map(({ extractedText, ...resource }) => ({ ...resource, extractedTextAvailable: Boolean(extractedText) })), canReview: admin });
  } catch (error) {
    console.error("Resource listing failed:", error);
    return NextResponse.json({ error: "Unable to load resources" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ organizationId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const { organizationId } = await context.params;
    const membership = await prisma.membership.findFirst({ where: { userId: user.id, organizationId, status: "ACTIVE" } });
    const platformAdmin = user.platformRole === "PLATFORM_ADMIN";
    if (!platformAdmin && (!membership || !["SCHOOL_ADMIN", "TEACHER"].includes(membership.role))) {
      return NextResponse.json({ error: "Workspace access denied" }, { status: 403 });
    }
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload" }, { status: 400 });
    if (file.size < 1 || file.size > MAX_BYTES) return NextResponse.json({ error: "Files must be smaller than 8 MB" }, { status: 413 });
    if (!allowed.has(file.type)) return NextResponse.json({ error: "Unsupported file type. Upload PDF, DOCX, DOC, PPTX, XLSX, TXT, CSV, JPG or PNG." }, { status: 415 });
    const category = String(form.get("category") || "OTHER") as ResourceCategory;
    if (!Object.values(ResourceCategory).includes(category)) return NextResponse.json({ error: "Invalid resource category" }, { status: 400 });
    const title = String(form.get("title") || file.name).trim().slice(0, 180);
    if (!title) return NextResponse.json({ error: "Enter a resource title" }, { status: 400 });
    const isAdmin = platformAdmin || membership?.role === "SCHOOL_ADMIN";
    const requestSharing = form.get("requestReview") === "true";
    const visibility: ResourceVisibility = isAdmin || requestSharing ? "WORKSPACE" : "PRIVATE";
    const reviewStatus: ResourceReviewStatus = isAdmin || !requestSharing ? "APPROVED" : "PENDING";
    const buffer = Buffer.from(await file.arrayBuffer());
    const extractedText = await extractText(buffer, file.type, file.name);
    const resource = await prisma.resourceAsset.create({
      data: {
        organizationId, uploadedBy: user.id, title, originalName: file.name.slice(0, 255),
        mimeType: file.type, fileSize: file.size, category, visibility, reviewStatus,
        extractedText, fileData: buffer,
        ...(isAdmin ? { reviewedBy: user.id, reviewedAt: new Date() } : {}),
      },
      select: { id: true, title: true, originalName: true, category: true, visibility: true, reviewStatus: true, createdAt: true },
    });
    return NextResponse.json({ success: true, resource, message: reviewStatus === "PENDING" ? "Uploaded and sent to the School Admin for review." : "Resource uploaded successfully." }, { status: 201 });
  } catch (error) {
    console.error("Resource upload failed:", error);
    return NextResponse.json({ error: "Unable to upload this resource" }, { status: 500 });
  }
}
