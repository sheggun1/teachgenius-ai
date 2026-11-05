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

const expectedExtensions: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "text/plain": [".txt"],
  "text/csv": [".csv"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
};

function hasValidFileSignature(buffer: Buffer, mime: string): boolean {
  if (mime === "application/pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (mime === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === "image/png") return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === "application/msword") return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  if (mime.startsWith("application/vnd.openxmlformats-officedocument.")) {
    return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
  }
  if (mime === "text/plain" || mime === "text/csv") {
    if (buffer.includes(0)) return false;
    try { new TextDecoder("utf-8", { fatal: true }).decode(buffer); return true; } catch { return false; }
  }
  return false;
}

function safeOriginalName(name: string): string {
  const leaf = name.replace(/\\/g, "/").split("/").pop() || "uploaded-file";
  return leaf.replace(/[\\u0000-\\u001f\\u007f]/g, "_").trim().slice(0, 255) || "uploaded-file";
}

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
    const [resources, creditAccount] = await Promise.all([
      prisma.resourceAsset.findMany({
      where: { organizationId, ...(admin ? {} : { OR: [{ uploadedBy: user.id }, { visibility: "WORKSPACE", reviewStatus: "APPROVED" }] }) },
      select: { id: true, title: true, originalName: true, mimeType: true, fileSize: true, category: true, visibility: true, reviewStatus: true, reviewNote: true, extractedText: true, createdAt: true, uploadedBy: true, uploader: { select: { displayName: true, email: true } } },
      orderBy: { createdAt: "desc" },
      }),
      prisma.aiCreditAccount.findUnique({ where: { organizationId }, select: { balance: true } }),
    ]);
    return NextResponse.json({ resources: resources.map(({ extractedText, ...resource }) => ({ ...resource, extractedTextAvailable: Boolean(extractedText), canUseForAi: resource.uploadedBy === user.id || (resource.visibility === "WORKSPACE" && resource.reviewStatus === "APPROVED") })), canReview: admin, aiCreditBalance: creditAccount?.balance ?? 0 });
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
    const extension = file.name.toLowerCase().match(/\\.[^.]+$/)?.[0] || "";
    if (!expectedExtensions[file.type]?.includes(extension)) {
      return NextResponse.json({ error: "The file extension does not match its declared file type." }, { status: 415 });
    }
    const category = String(form.get("category") || "OTHER") as ResourceCategory;
    if (!Object.values(ResourceCategory).includes(category)) return NextResponse.json({ error: "Invalid resource category" }, { status: 400 });
    const title = String(form.get("title") || file.name).trim().slice(0, 180);
    if (!title) return NextResponse.json({ error: "Enter a resource title" }, { status: 400 });
    const isAdmin = platformAdmin || membership?.role === "SCHOOL_ADMIN";
    const requestSharing = form.get("requestReview") === "true";
    const visibility: ResourceVisibility = isAdmin || requestSharing ? "WORKSPACE" : "PRIVATE";
    const reviewStatus: ResourceReviewStatus = isAdmin || !requestSharing ? "APPROVED" : "PENDING";
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasValidFileSignature(buffer, file.type)) {
      return NextResponse.json({ error: "The uploaded file content does not match its declared file type or is not a valid UTF-8 text file." }, { status: 415 });
    }
    const originalName = safeOriginalName(file.name);
    const extractedText = await extractText(buffer, file.type, originalName);
    const resource = await prisma.resourceAsset.create({
      data: {
        organizationId, uploadedBy: user.id, title, originalName,
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
